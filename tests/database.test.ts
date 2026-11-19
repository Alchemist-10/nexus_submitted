import { after, before, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  createDatabase,
  resetFixtures,
  asUser,
  makeSlot,
  people,
  type DB,
} from "./helpers/database";

let db: DB;
before(async () => {
  db = await createDatabase();
});
beforeEach(async () => {
  await resetFixtures(db);
});
after(async () => {
  await db?.close();
});

async function book(
  slot: string,
  learner = people.learner,
  key = randomUUID(),
) {
  return (
    await asUser(db, learner, (actor) =>
      actor.query<{ id: string; status: string }>(
        "select * from public.book_free_intro($1,$2)",
        [slot, key],
      ),
    )
  ).rows[0];
}

test("migration creates auth-linked public profiles without email", async () => {
  const { rows } = await asUser(
    db,
    null,
    (actor) => actor.query("select * from public.profiles"),
    "anon",
  );
  assert.equal(rows.length, 4);
  assert.equal(rows[0].email, undefined);
});

test("anonymous and unauthenticated callers cannot book", async () => {
  const slot = await makeSlot(db);
  await assert.rejects(
    asUser(
      db,
      null,
      (actor) =>
        actor.query("select * from public.book_free_intro($1,$2)", [
          slot.id,
          randomUUID(),
        ]),
      "anon",
    ),
    /permission denied/i,
  );
  await assert.rejects(
    asUser(db, null, (actor) =>
      actor.query("select * from public.book_free_intro($1,$2)", [
        slot.id,
        randomUUID(),
      ]),
    ),
    /AUTH_REQUIRED/,
  );
});

test("only participants can read a booking and its history", async () => {
  const slot = await makeSlot(db);
  await book(slot.id);
  assert.equal(
    (
      await asUser(db, people.learner, (actor) =>
        actor.query("select * from public.bookings"),
      )
    ).rows.length,
    1,
  );
  assert.equal(
    (
      await asUser(db, people.mentor, (actor) =>
        actor.query("select * from public.booking_events"),
      )
    ).rows.length,
    1,
  );
  assert.equal(
    (
      await asUser(db, people.outsider, (actor) =>
        actor.query("select * from public.bookings"),
      )
    ).rows.length,
    0,
  );
  assert.equal(
    (
      await asUser(db, people.outsider, (actor) =>
        actor.query("select * from public.booking_events"),
      )
    ).rows.length,
    0,
  );
});

test("direct writes cannot bypass booking rules", async () => {
  await assert.rejects(
    asUser(db, people.learner, (actor) =>
      actor.exec("delete from public.bookings"),
    ),
    /permission denied/i,
  );
  await assert.rejects(
    asUser(db, people.learner, (actor) =>
      actor.exec("update public.mentor_profiles set is_listed=false"),
    ),
    /permission denied/i,
  );
});

test("a free introduction reserves the slot and both participants", async () => {
  const slot = await makeSlot(db);
  const booking = await book(slot.id);
  assert.equal(booking.status, "confirmed");
  assert.equal(
    (
      await db.query(
        "select * from public.booking_participants where booking_id=$1 and active",
        [booking.id],
      )
    ).rows.length,
    2,
  );
  assert.equal(
    (
      await asUser(
        db,
        null,
        (actor) =>
          actor.query("select * from public.get_available_slots($1)", [
            people.mentor,
          ]),
        "anon",
      )
    ).rows.length,
    0,
  );
});

test("retries return the same booking without duplicate events", async () => {
  const slot = await makeSlot(db);
  const key = randomUUID();
  const first = await book(slot.id, people.learner, key);
  const retry = await book(slot.id, people.learner, key);
  assert.equal(first.id, retry.id);
  assert.equal(
    (await db.query("select * from public.booking_events")).rows.length,
    1,
  );
});

test("a request key cannot be reused for a different slot", async () => {
  const first = await makeSlot(db);
  const second = await makeSlot(db, people.mentor, 90);
  const key = randomUUID();
  await book(first.id, people.learner, key);
  await assert.rejects(
    book(second.id, people.learner, key),
    /REQUEST_KEY_REUSED/,
  );
});

test("a learner gets only one confirmed introduction per mentor", async () => {
  const first = await makeSlot(db);
  const second = await makeSlot(db, people.mentor, 90);
  await book(first.id);
  await assert.rejects(book(second.id), /TRIAL_UNAVAILABLE/);
});

test("free eligibility is separate for each learner-mentor pair", async () => {
  const first = await makeSlot(db);
  const second = await makeSlot(db, people.secondMentor, 90);
  await book(first.id);
  await book(second.id);
  assert.equal(
    (await db.query("select * from public.bookings")).rows.length,
    2,
  );
});

test("self-booking is rejected", async () => {
  const slot = await makeSlot(db);
  await assert.rejects(book(slot.id, people.mentor), /SELF_BOOKING/);
});

test("a taken slot cannot be booked by another learner", async () => {
  const slot = await makeSlot(db);
  await book(slot.id);
  await assert.rejects(book(slot.id, people.outsider), /SLOT_UNAVAILABLE/);
});

test("cancellation releases the slot, reservations, and trial", async () => {
  const slot = await makeSlot(db);
  const first = await book(slot.id);
  await asUser(db, people.learner, (actor) =>
    actor.query("select * from public.cancel_free_intro($1)", [first.id]),
  );
  assert.equal(
    (
      await db.query(
        "select * from public.booking_participants where booking_id=$1 and active",
        [first.id],
      )
    ).rows.length,
    0,
  );
  const replacement = await book(slot.id);
  assert.notEqual(replacement.id, first.id);
});

test("repeated cancellation is idempotent and outsider cancellation fails", async () => {
  const slot = await makeSlot(db);
  const booking = await book(slot.id);
  await assert.rejects(
    asUser(db, people.outsider, (actor) =>
      actor.query("select * from public.cancel_free_intro($1)", [booking.id]),
    ),
    /NOT_ALLOWED/,
  );
  await asUser(db, people.mentor, (actor) =>
    actor.query("select * from public.cancel_free_intro($1)", [booking.id]),
  );
  await asUser(db, people.mentor, (actor) =>
    actor.query("select * from public.cancel_free_intro($1)", [booking.id]),
  );
  assert.equal(
    (
      await db.query(
        "select * from public.booking_events where action='cancelled'",
      )
    ).rows.length,
    1,
  );
});

test("overlapping learner reservations fail atomically", async () => {
  const first = await makeSlot(db);
  const second = await makeSlot(db, people.secondMentor, 10);
  await book(first.id);
  await assert.rejects(book(second.id), /SCHEDULE_CONFLICT/);
  assert.equal(
    (await db.query("select * from public.bookings")).rows.length,
    1,
  );
  assert.equal(
    (await db.query("select * from public.booking_events")).rows.length,
    1,
  );
  await book(second.id, people.outsider);
});

test("participant overlap is enforced across learner and mentor roles", async () => {
  await asUser(db, people.learner, (actor) =>
    actor.query(
      "select public.save_mentor_profile('Project mentor','',array['Projects'])",
    ),
  );
  const teaching = await makeSlot(db, people.learner);
  const learning = await makeSlot(db, people.mentor, 10);
  await book(teaching.id, people.outsider);
  await assert.rejects(book(learning.id), /SCHEDULE_CONFLICT/);
  assert.equal(
    (await db.query("select * from public.bookings")).rows.length,
    1,
  );
});

test("adjacent slots do not conflict", async () => {
  const first = await makeSlot(db);
  // Read text directly: postgres.js Date parsing drops PostgreSQL microseconds,
  // which would turn an adjacent boundary into a tiny, genuine overlap.
  const exactEnd = (
    await db.query<{ end_at: string }>(
      "select ends_at::text as end_at from public.availability_slots where id=$1",
      [first.id],
    )
  ).rows[0].end_at;
  const { rows } = await asUser(db, people.secondMentor, (actor) =>
    actor.query<{ id: string }>(
      "select * from public.create_availability($1::timestamptz,$1::timestamptz+interval '30 minutes')",
      [exactEnd],
    ),
  );
  await book(first.id);
  await book(rows[0].id);
});

test("a mentor cannot close a booked slot or another mentor's slot", async () => {
  const slot = await makeSlot(db);
  await assert.rejects(
    asUser(db, people.secondMentor, (actor) =>
      actor.query("select public.close_availability($1)", [slot.id]),
    ),
    /NOT_ALLOWED/,
  );
  await book(slot.id);
  await assert.rejects(
    asUser(db, people.mentor, (actor) =>
      actor.query("select public.close_availability($1)", [slot.id]),
    ),
    /SLOT_HAS_BOOKING/,
  );
});

test("closed, past, and invalid-duration slots are rejected", async () => {
  const slot = await makeSlot(db);
  await asUser(db, people.mentor, (actor) =>
    actor.query("select public.close_availability($1)", [slot.id]),
  );
  await assert.rejects(book(slot.id), /SLOT_UNAVAILABLE/);
  await assert.rejects(
    asUser(db, people.mentor, (actor) =>
      actor.query(
        "select * from public.create_availability(now()-interval '1 hour',now())",
      ),
    ),
    /INVALID_SLOT/,
  );
  await assert.rejects(
    asUser(db, people.mentor, (actor) =>
      actor.query(
        "select * from public.create_availability(now()+interval '1 day',now()+interval '1 day 5 minutes')",
      ),
    ),
    /INVALID_SLOT/,
  );
});

test("meeting records cannot be read directly or changed by learners", async () => {
  const slot = await makeSlot(db);
  const booking = await book(slot.id);
  await asUser(db, people.mentor, (actor) =>
    actor.query(
      "select public.set_booking_meeting($1,'https://meet.google.com/demo')",
      [booking.id],
    ),
  );
  await assert.rejects(
    asUser(db, people.learner, (actor) =>
      actor.query("select * from public.booking_meetings"),
    ),
    /permission denied/i,
  );
  await assert.rejects(
    asUser(db, people.learner, (actor) =>
      actor.query(
        "select public.set_booking_meeting($1,'https://example.com')",
        [booking.id],
      ),
    ),
    /NOT_ALLOWED/,
  );
  await assert.rejects(
    asUser(db, people.learner, (actor) =>
      actor.query("select public.get_booking_join_url($1)", [booking.id]),
    ),
    /OUTSIDE_JOIN_WINDOW/,
  );
  await assert.rejects(
    asUser(db, people.outsider, (actor) =>
      actor.query("select public.get_booking_join_url($1)", [booking.id]),
    ),
    /NOT_ALLOWED/,
  );
  const { rows } = await asUser(db, people.learner, (actor) =>
    actor.query("select * from public.bookings"),
  );
  assert.equal(rows[0].join_url, undefined);
});

test("only participants can join inside the time window, and cancellation revokes access", async () => {
  const slot = (
    await asUser(db, people.mentor, (actor) =>
      actor.query<{ id: string }>(
        "select * from public.create_availability(now()+interval '5 minutes',now()+interval '35 minutes')",
      ),
    )
  ).rows[0];
  const booking = await book(slot.id);
  await asUser(db, people.mentor, (actor) =>
    actor.query(
      "select public.set_booking_meeting($1,'https://meet.google.com/demo')",
      [booking.id],
    ),
  );
  const result = await asUser(db, people.learner, (actor) =>
    actor.query<{ url: string }>(
      "select public.get_booking_join_url($1) as url",
      [booking.id],
    ),
  );
  assert.equal(result.rows[0].url, "https://meet.google.com/demo");
  await asUser(db, people.learner, (actor) =>
    actor.query("select * from public.cancel_free_intro($1)", [booking.id]),
  );
  await assert.rejects(
    asUser(db, people.learner, (actor) =>
      actor.query("select public.get_booking_join_url($1)", [booking.id]),
    ),
    /OUTSIDE_JOIN_WINDOW/,
  );
});

test("only the mentor can complete a call, and only after it ends", async () => {
  const slot = await makeSlot(db);
  const booking = await book(slot.id);
  await assert.rejects(
    asUser(db, people.learner, (actor) =>
      actor.query("select * from public.complete_free_intro($1)", [booking.id]),
    ),
    /NOT_ALLOWED/,
  );
  await assert.rejects(
    asUser(db, people.mentor, (actor) =>
      actor.query("select * from public.complete_free_intro($1)", [booking.id]),
    ),
    /CANNOT_COMPLETE/,
  );
});

test("a completed introduction permanently consumes pair eligibility", async () => {
  const slotId = randomUUID();
  const bookingId = randomUUID();
  await db.query(
    "insert into public.availability_slots(id,mentor_id,starts_at,ends_at) values($1,$2,now()-interval '2 hours',now()-interval '90 minutes')",
    [slotId, people.mentor],
  );
  await db.query(
    "insert into public.bookings(id,slot_id,mentor_id,learner_id,request_key,starts_at,ends_at) select $1,id,mentor_id,$2,$3,starts_at,ends_at from public.availability_slots where id=$4",
    [bookingId, people.learner, randomUUID(), slotId],
  );
  await asUser(db, people.mentor, (actor) =>
    actor.query("select * from public.complete_free_intro($1)", [bookingId]),
  );
  const nextSlot = await makeSlot(db);
  await assert.rejects(book(nextSlot.id), /TRIAL_UNAVAILABLE/);
  await assert.rejects(
    asUser(db, people.mentor, (actor) =>
      actor.query("select * from public.cancel_free_intro($1)", [bookingId]),
    ),
    /CANNOT_CANCEL/,
  );
});

test(
  "independent connections race for one slot with one winner",
  { skip: !process.env.DATABASE_TEST_URL },
  async () => {
    const slot = await makeSlot(db);
    const results = await Promise.allSettled([
      book(slot.id),
      book(slot.id, people.outsider),
    ]);
    assert.equal(
      results.filter((result) => result.status === "fulfilled").length,
      1,
    );
    assert.equal(
      (await db.query("select * from public.bookings")).rows.length,
      1,
    );
  },
);
