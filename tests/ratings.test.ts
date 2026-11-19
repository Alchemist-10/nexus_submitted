import { before, beforeEach, after, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  createDatabase,
  resetFixtures,
  asUser,
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
async function booking(
  learner = people.learner,
  completed = true,
  offset = 0,
  future = false,
) {
  const slot = randomUUID(),
    id = randomUUID();
  await db.query(
    "insert into availability_slots(id,mentor_id,starts_at,ends_at) values($1,$2,now()+$3*interval '1 hour',now()+$3*interval '1 hour'+interval '30 minutes')",
    [slot, people.mentor, (future ? 24 : -4) - offset],
  );
  await db.query(
    "insert into bookings(id,slot_id,mentor_id,learner_id,request_key,starts_at,ends_at) select $1,id,mentor_id,$2,$3,starts_at,ends_at from availability_slots where id=$4",
    [id, learner, randomUUID(), slot],
  );
  if (completed)
    await db.query("update bookings set status='completed' where id=$1", [id]);
  return id;
}
const rate = (id: string, score: number | null, actor = people.learner) =>
  asUser(db, actor, (a) => a.query("select rate_mentor($1,$2)", [id, score]));
test("only the booked learner can rate a completed session after its end", async () => {
  const id = await booking();
  await assert.rejects(rate(id, 5, people.mentor), /NOT_ALLOWED/);
  await assert.rejects(rate(id, 5, people.outsider), /NOT_ALLOWED/);
  await rate(id, 4);
  assert.equal(
    (
      await db.query("select score from mentor_ratings where booking_id=$1", [
        id,
      ])
    ).rows[0].score,
    4,
  );
});
test("confirmed, cancelled, future, and nonexistent sessions cannot be rated", async () => {
  const id = await booking(people.learner, false);
  await assert.rejects(rate(id, 5), /RATING_NOT_READY/);
  await db.query("update bookings set status='cancelled' where id=$1", [id]);
  await assert.rejects(rate(id, 5), /RATING_NOT_READY/);
  const future = await booking(people.outsider, true, 0, true);
  await assert.rejects(rate(future, 5, people.outsider), /RATING_NOT_READY/);
  await assert.rejects(rate(randomUUID(), 5), /NOT_ALLOWED/);
});
test("ratings validate the score; identical retries succeed and a second score is rejected", async () => {
  const id = await booking();
  for (const score of [null, 0, 6])
    await assert.rejects(rate(id, score), /INVALID_RATING/);
  await rate(id, 5);
  await rate(id, 5);
  await assert.rejects(rate(id, 2), /RATING_ALREADY_SUBMITTED/);
  assert.equal((await db.query("select * from mentor_ratings")).rows.length, 1);
});
test("table writes and anonymous rating are denied; private rows are participant-only", async () => {
  const id = await booking();
  await rate(id, 5);
  await assert.rejects(
    asUser(db, null, (a) => a.query("select rate_mentor($1,5)", [id]), "anon"),
    /permission denied/,
  );
  await assert.rejects(
    asUser(db, people.learner, (a) =>
      a.query("update mentor_ratings set score=1 where booking_id=$1", [id]),
    ),
    /permission denied/,
  );
  await assert.rejects(
    asUser(db, people.mentor, (a) =>
      a.query("delete from mentor_ratings where booking_id=$1", [id]),
    ),
    /permission denied/,
  );
  await assert.rejects(
    asUser(db, people.learner, (a) =>
      a.query("insert into mentor_ratings(booking_id,score) values($1,4)", [
        id,
      ]),
    ),
    /permission denied/,
  );
  assert.equal(
    (
      await asUser(db, people.outsider, (a) =>
        a.query("select * from mentor_ratings"),
      )
    ).rows.length,
    0,
  );
  assert.equal(
    (
      await asUser(db, people.mentor, (a) =>
        a.query("select * from mentor_ratings"),
      )
    ).rows.length,
    1,
  );
});
test("public summaries average only completed-session ratings and preserve empty states", async () => {
  const first = await booking();
  const second = await booking(people.outsider, true, 2);
  await rate(first, 5);
  await rate(second, 4, people.outsider);
  const rows = (
    await asUser(
      db,
      null,
      (a) =>
        a.query("select * from get_mentor_ratings($1)", [
          [people.mentor, people.secondMentor],
        ]),
      "anon",
    )
  ).rows;
  const summary = rows.find((r) => r.mentor_id === people.mentor)!;
  assert.equal(Number(summary.average_rating), 4.5);
  assert.equal(Number(summary.rating_count), 2);
  assert.deepEqual(Object.keys(summary).sort(), [
    "average_rating",
    "mentor_id",
    "rating_count",
  ]);
  const empty = rows.find((r) => r.mentor_id === people.secondMentor)!;
  assert.equal(empty.average_rating, null);
  assert.equal(Number(empty.rating_count), 0);
  await db.query(
    "update mentor_profiles set is_listed=false where user_id=$1",
    [people.mentor],
  );
  assert.equal(
    (
      await asUser(
        db,
        null,
        (a) =>
          a.query("select * from get_mentor_ratings($1)", [[people.mentor]]),
        "anon",
      )
    ).rows.length,
    0,
  );
});
test(
  "concurrent different ratings create one immutable score",
  { skip: !process.env.DATABASE_TEST_URL },
  async () => {
    const id = await booking();
    const results = await Promise.allSettled([rate(id, 4), rate(id, 5)]);
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
    assert.equal(
      (await db.query("select * from mentor_ratings where booking_id=$1", [id]))
        .rows.length,
      1,
    );
  },
);
