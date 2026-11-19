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
const key = () => randomUUID();
const trusted = <T>(fn: (actor: DB) => Promise<T>) =>
  db.transaction(async (a) => {
    await a.exec("set local role service_role");
    return fn(a);
  });
async function intro(learner = people.learner, mentor = people.mentor) {
  await db.query(
    `with t as (
    select now()-interval '2 days'-(select count(*) from bookings where mentor_id=$1)*interval '1 hour' as starts_at
  ), s as (
    insert into availability_slots(mentor_id,starts_at,ends_at,is_open)
    select $1,t.starts_at,t.starts_at+interval '30 minutes',false from t returning *
  ) insert into bookings(slot_id,mentor_id,learner_id,request_key,starts_at,ends_at,status)
    select id,mentor_id,$2,$3,starts_at,ends_at,'completed' from s`,
    [mentor, learner, key()],
  );
  await asUser(db, mentor, (a) => a.query("select set_mentor_price(19900)"));
}
async function reserve(
  slot: string,
  learner = people.learner,
  request = key(),
  post: string | null = null,
) {
  return (
    await asUser(db, learner, (a) =>
      a.query("select * from reserve_paid_session($1,$2,$3)", [
        slot,
        request,
        post,
      ]),
    )
  ).rows[0];
}
async function attach(id: unknown, suffix = "one") {
  const result = await trusted((a) =>
    a.query("select payment_claim_order($1) as result", [id]),
  );
  const claim = result.rows[0].result as {
    claimed: boolean;
    context: { order: { create_token: string } };
  };
  assert.equal(claim.claimed, true);
  await trusted((a) =>
    a.query("select payment_attach_order($1,$2,$3,19900,'INR')", [
      id,
      claim.context.order.create_token,
      `order_${suffix}`,
    ]),
  );
}
const capture = (id: unknown, suffix = "one") =>
  trusted((a) =>
    a.query("select payment_record_capture($1,$2,$3,19900,'INR')", [
      id,
      `order_${suffix}`,
      `pay_${suffix}`,
    ]),
  );
const state = async (id: unknown) =>
  (
    await db.query(
      "select b.status,p.state from bookings b join booking_payment_status p on p.booking_id=b.id where b.id=$1",
      [id],
    )
  ).rows[0];

test("paid eligibility requires a completed introduction with this mentor", async () => {
  const slot = await makeSlot(db);
  await asUser(db, people.mentor, (a) =>
    a.query("select set_mentor_price(19900)"),
  );
  await assert.rejects(reserve(slot.id), /INTRO_REQUIRED/);
  const free = await asUser(db, people.learner, (a) =>
    a.query("select * from book_free_intro($1,$2)", [slot.id, key()]),
  );
  const next = await makeSlot(db, people.mentor, 60);
  await assert.rejects(reserve(next.id), /INTRO_REQUIRED/);
  await db.query("update bookings set status='completed' where id=$1", [
    free.rows[0].id,
  ]);
  const paid = await reserve(next.id);
  assert.equal(paid.amount_paise, 19900);
  const other = await makeSlot(db, people.secondMentor, 120);
  const firstOther = await asUser(db, people.learner, (a) =>
    a.query("select * from book_free_intro($1,$2)", [other.id, key()]),
  );
  assert.equal(firstOther.rows[0].kind, "intro");
});

test("reservations snapshot price, preserve retries and context, and cannot bypass capture", async () => {
  await intro();
  const slot = await makeSlot(db),
    request = key();
  const post = (
    await asUser(db, people.learner, (a) =>
      a.query(
        "insert into community_posts(title,body,stuck_on,category,tags) values('A difficult dynamic program','Please help me understand these state transitions.','Deriving the recurrence is confusing.','coding',array['dsa']) returning id",
      ),
    )
  ).rows[0].id as string;
  const b = await reserve(slot.id, people.learner, request, post);
  assert.equal(b.kind, "paid");
  assert.equal(b.status, "awaiting_payment");
  assert.equal(b.source_post_id, post);
  await asUser(db, people.mentor, (a) =>
    a.query("select set_mentor_price(29900)"),
  );
  assert.equal(
    (await reserve(slot.id, people.learner, request, post)).amount_paise,
    19900,
  );
  assert.equal(
    (await reserve(slot.id, people.learner, request, post)).id,
    b.id,
  );
  await assert.rejects(
    reserve(slot.id, people.learner, request),
    /REQUEST_KEY_REUSED/,
  );
  await assert.rejects(
    reserve((await makeSlot(db, people.mentor, 90)).id),
    /CHECKOUT_PENDING/,
  );
  await assert.rejects(
    asUser(db, people.learner, (a) =>
      a.query("select get_booking_join_url($1)", [b.id]),
    ),
    /OUTSIDE_JOIN_WINDOW/,
  );
  await assert.rejects(
    asUser(db, people.mentor, (a) =>
      a.query("select set_booking_meeting($1,'https://meet.google.com/test')", [
        b.id,
      ]),
    ),
    /INVALID_STATE/,
  );
  await assert.rejects(
    asUser(db, people.mentor, (a) =>
      a.query("select complete_free_intro($1)", [b.id]),
    ),
    /CANNOT_COMPLETE/,
  );
  await assert.rejects(
    asUser(db, people.learner, (a) =>
      a.query("select rate_mentor($1,5)", [b.id]),
    ),
    /RATING_NOT_READY/,
  );
});

test("payment writes, provider context and jobs are denied to anonymous and signed-in clients", async () => {
  await intro();
  const b = await reserve((await makeSlot(db)).id);
  await attach(b.id);
  for (const role of ["anon", "authenticated"]) {
    for (const sql of [
      "select payment_get_context($1)",
      "select payment_claim_order($1)",
      "select payment_claim_jobs($1)",
      "select payment_record_capture($1,'order_one','pay_one',19900,'INR')",
    ]) {
      await assert.rejects(
        asUser(db, people.learner, (a) => a.query(sql, [b.id]), role),
        /permission denied/,
      );
    }
  }
  await assert.rejects(
    asUser(db, people.learner, (a) =>
      a.exec("update booking_payment_status set state='paid'"),
    ),
    /permission denied/,
  );
  await assert.rejects(
    asUser(db, people.learner, (a) =>
      a.exec("select * from app_private.payment_orders"),
    ),
    /permission denied/,
  );
  assert.equal(
    (
      await asUser(db, people.outsider, (a) =>
        a.query("select * from booking_payment_status"),
      )
    ).rows.length,
    0,
  );
  const mine = (
    await asUser(db, people.learner, (a) =>
      a.query("select * from booking_payment_status"),
    )
  ).rows[0];
  assert.equal(mine.state, "awaiting_payment");
  assert.equal(mine.provider_order_id, undefined);
  assert.equal(
    (
      await asUser(db, people.mentor, (a) =>
        a.query("select * from booking_payment_status"),
      )
    ).rows.length,
    1,
  );
});

test("pending payments protect slots and both participant roles; expiry releases them atomically", async () => {
  await intro();
  const slot = await makeSlot(db);
  const b = await reserve(slot.id);
  await assert.rejects(
    asUser(db, people.outsider, (a) =>
      a.query("select * from book_free_intro($1,$2)", [slot.id, key()]),
    ),
    /SLOT_UNAVAILABLE/,
  );
  await assert.rejects(
    asUser(db, people.mentor, (a) =>
      a.query("select close_availability($1)", [slot.id]),
    ),
    /SLOT_HAS_BOOKING/,
  );
  await asUser(db, people.learner, (a) =>
    a.query(
      "select save_mentor_profile('Project mentor','',array['Projects'])",
    ),
  );
  const overlap = await makeSlot(db, people.learner, 10);
  await assert.rejects(
    asUser(db, people.outsider, (a) =>
      a.query("select * from book_free_intro($1,$2)", [overlap.id, key()]),
    ),
    /SCHEDULE_CONFLICT/,
  );
  await db.query(
    "update bookings set hold_expires_at=now()-interval '1 second' where id=$1",
    [b.id],
  );
  assert.equal(
    (
      await asUser(
        db,
        null,
        (a) =>
          a.query("select * from get_available_slots($1)", [people.mentor]),
        "anon",
      )
    ).rows.length,
    1,
  );
  await asUser(db, people.outsider, (a) =>
    a.query("select * from book_free_intro($1,$2)", [slot.id, key()]),
  );
  assert.deepEqual(await state(b.id), { status: "expired", state: "expired" });
  assert.equal(
    (
      await db.query(
        "select * from booking_participants where booking_id=$1 and active",
        [b.id],
      )
    ).rows.length,
    0,
  );
});

test("capture validates immutable amounts/order; repeated capture confirms exactly once", async () => {
  await intro();
  const b = await reserve((await makeSlot(db)).id);
  await attach(b.id);
  await assert.rejects(
    trusted((a) =>
      a.query(
        "select payment_record_capture($1,'order_wrong','pay_one',19900,'INR')",
        [b.id],
      ),
    ),
    /PAYMENT_MISMATCH/,
  );
  await assert.rejects(
    trusted((a) =>
      a.query(
        "select payment_record_capture($1,'order_one','pay_one',1,'INR')",
        [b.id],
      ),
    ),
    /PAYMENT_MISMATCH/,
  );
  await assert.rejects(
    trusted((a) =>
      a.query(
        "select payment_record_capture($1,'order_one','pay_one',19900,'USD')",
        [b.id],
      ),
    ),
    /PAYMENT_MISMATCH/,
  );
  await capture(b.id);
  await capture(b.id);
  assert.deepEqual(await state(b.id), { status: "confirmed", state: "paid" });
  assert.equal(
    (
      await db.query(
        "select * from booking_events where booking_id=$1 and action='confirmed'",
        [b.id],
      )
    ).rows.length,
    1,
  );
  const again = await reserve((await makeSlot(db, people.mentor, 90)).id);
  await attach(again.id, "two");
  await capture(again.id, "two");
  assert.equal((await state(again.id)).state, "paid");
  const anotherSlot = await makeSlot(db, people.mentor, 180);
  await assert.rejects(
    asUser(db, people.learner, (a) =>
      a.query("select * from book_free_intro($1,$2)", [anotherSlot.id, key()]),
    ),
    /TRIAL_UNAVAILABLE/,
  );
});

test("late capture after expiry creates a durable refund instead of a conflicting session", async () => {
  await intro();
  const slot = await makeSlot(db);
  const b = await reserve(slot.id);
  await attach(b.id);
  await db.query(
    "update bookings set hold_expires_at=now()-interval '1 second' where id=$1",
    [b.id],
  );
  const replacement = (
    await asUser(db, people.outsider, (a) =>
      a.query("select * from book_free_intro($1,$2)", [slot.id, key()]),
    )
  ).rows[0];
  await capture(b.id);
  await capture(b.id);
  assert.deepEqual(await state(b.id), {
    status: "expired",
    state: "refund_pending",
  });
  assert.equal(
    (await db.query("select * from bookings where id=$1", [replacement.id]))
      .rows[0].status,
    "confirmed",
  );
  assert.equal(
    (
      await db.query(
        "select * from app_private.payment_jobs where kind='refund'",
      )
    ).rows.length,
    1,
  );
});

test("paid cancellation queues one full refund and never restores the intro", async () => {
  await intro();
  const b = await reserve((await makeSlot(db)).id);
  await attach(b.id);
  await capture(b.id);
  const cancel = () =>
    asUser(db, people.learner, (a) =>
      a.query("select * from cancel_free_intro($1)", [b.id]),
    );
  await cancel();
  await cancel();
  assert.deepEqual(await state(b.id), {
    status: "cancelled",
    state: "refund_pending",
  });
  await trusted((a) =>
    a.query("select payment_record_refund('pay_one','rfnd_one',true)"),
  );
  await trusted((a) =>
    a.query("select payment_record_refund('pay_one','rfnd_one',false)"),
  );
  assert.deepEqual(await state(b.id), {
    status: "cancelled",
    state: "refunded",
  });
  const slot = await makeSlot(db, people.mentor, 90);
  await assert.rejects(
    asUser(db, people.learner, (a) =>
      a.query("select * from book_free_intro($1,$2)", [slot.id, key()]),
    ),
    /TRIAL_UNAVAILABLE/,
  );
  assert.equal((await reserve(slot.id)).kind, "paid");
});

test("cancellation before capture and extra captured payments are refunded idempotently", async () => {
  await intro();
  const b = await reserve((await makeSlot(db)).id);
  await attach(b.id);
  await asUser(db, people.mentor, (a) =>
    a.query("select cancel_free_intro($1)", [b.id]),
  );
  await capture(b.id);
  assert.equal((await state(b.id)).state, "refund_pending");
  const other = await reserve((await makeSlot(db, people.mentor, 90)).id);
  await attach(other.id, "two");
  await capture(other.id, "two");
  await trusted((a) =>
    a.query(
      "select payment_record_capture($1,'order_two','pay_extra',19900,'INR')",
      [other.id],
    ),
  );
  assert.equal((await state(other.id)).state, "paid");
  assert.equal(
    (
      await db.query(
        "select refund_state from app_private.captured_payments where payment_id='pay_extra'",
      )
    ).rows[0].refund_state,
    "pending",
  );
});

test("order creation has leases; event IDs deduplicate only after successful processing", async () => {
  await intro();
  const b = await reserve((await makeSlot(db)).id);
  const first = (
    await trusted((a) =>
      a.query("select payment_claim_order($1) as result", [b.id]),
    )
  ).rows[0].result as { claimed: boolean };
  const retry = (
    await trusted((a) =>
      a.query("select payment_claim_order($1) as result", [b.id]),
    )
  ).rows[0].result as { claimed: boolean };
  assert.equal(first.claimed, true);
  assert.equal(retry.claimed, false);
  await assert.rejects(
    trusted((a) =>
      a.query("select payment_attach_order($1,$2,'order_one',19900,'INR')", [
        b.id,
        key(),
      ]),
    ),
    /LEASE_LOST/,
  );
  await db.query(
    "update app_private.payment_orders set creating_until=now()-interval '1 second' where booking_id=$1",
    [b.id],
  );
  await attach(b.id);
  const event = async (complete: boolean) =>
    (
      await trusted((a) =>
        a.query(
          "select payment_webhook_event('evt_one','order_one',$1) as id",
          [complete],
        ),
      )
    ).rows[0].id;
  assert.equal(await event(false), b.id);
  assert.equal(await event(false), b.id);
  assert.equal(await event(true), b.id);
  assert.equal(await event(false), null);
});

test("jobs have exclusive leases, bounded retries and no stale-token updates", async () => {
  await intro();
  const b = await reserve((await makeSlot(db)).id);
  await attach(b.id);
  await capture(b.id);
  await asUser(db, people.learner, (a) =>
    a.query("select cancel_free_intro($1)", [b.id]),
  );
  const claim = async () =>
    (
      await trusted((a) =>
        a.query("select payment_claim_jobs($1,5) as job", [b.id]),
      )
    ).rows.map(
      (r) => r.job as { id: string; kind: string; lease_token: string },
    );
  const jobs = await claim();
  assert.equal(jobs.length, 1);
  assert.equal(jobs[0].kind, "refund");
  assert.equal((await claim()).length, 0);
  await assert.rejects(
    trusted((a) =>
      a.query("select payment_finish_job($1,$2,true)", [jobs[0].id, key()]),
    ),
    /LEASE_LOST/,
  );
  await db.query(
    "update app_private.payment_jobs set attempts=12 where id=$1",
    [jobs[0].id],
  );
  await trusted((a) =>
    a.query("select payment_finish_job($1,$2,false,'PROVIDER_UNAVAILABLE')", [
      jobs[0].id,
      jobs[0].lease_token,
    ]),
  );
  assert.equal((await state(b.id)).state, "action_required");
  await trusted((a) =>
    a.query("select payment_record_refund('pay_one','rfnd_one',true)"),
  );
  assert.equal((await state(b.id)).state, "refunded");
});

test("mentor price updates are self-only and validate integer bounds", async () => {
  await assert.rejects(
    asUser(db, people.learner, (a) => a.query("select set_mentor_price(1000)")),
    /MENTOR_REQUIRED/,
  );
  for (const amount of [0, 99, 2500001])
    await assert.rejects(
      asUser(db, people.mentor, (a) =>
        a.query("select set_mentor_price($1)", [amount]),
      ),
      /INVALID_PRICE/,
    );
  await asUser(db, people.mentor, (a) =>
    a.query("select set_mentor_price(19900)"),
  );
  assert.equal(
    (
      await db.query(
        "select session_price_paise from mentor_profiles where user_id=$1",
        [people.secondMentor],
      )
    ).rows[0].session_price_paise,
    null,
  );
  await asUser(db, people.mentor, (a) =>
    a.query("select set_mentor_price(null)"),
  );
  assert.equal(
    (
      await db.query(
        "select session_price_paise from mentor_profiles where user_id=$1",
        [people.mentor],
      )
    ).rows[0].session_price_paise,
    null,
  );
});

test("provider full refunds revoke confirmed access even before refund-list propagation", async () => {
  await intro();
  const b = await reserve((await makeSlot(db)).id);
  await attach(b.id);
  await capture(b.id);
  await trusted((a) =>
    a.query(
      "select payment_record_capture($1,'order_one','pay_one',19900,'INR',true)",
      [b.id],
    ),
  );
  assert.deepEqual(await state(b.id), {
    status: "cancelled",
    state: "refunded",
  });
  await capture(b.id);
  assert.deepEqual(await state(b.id), {
    status: "cancelled",
    state: "refunded",
  });
  assert.equal(
    (
      await db.query(
        "select * from booking_participants where booking_id=$1 and active",
        [b.id],
      )
    ).rows.length,
    0,
  );
});

test(
  "capture racing expiry never confirms an expired reservation",
  { skip: !process.env.DATABASE_TEST_URL },
  async () => {
    await intro();
    const b = await reserve((await makeSlot(db)).id);
    await attach(b.id);
    await db.query(
      "update bookings set hold_expires_at=now()-interval '1 second' where id=$1",
      [b.id],
    );
    await Promise.all([
      capture(b.id),
      trusted((a) => a.query("select payment_claim_jobs($1,1)", [b.id])),
    ]);
    assert.deepEqual(await state(b.id), {
      status: "expired",
      state: "refund_pending",
    });
    assert.equal(
      (
        await db.query(
          "select * from app_private.payment_jobs where booking_id=$1 and kind='refund'",
          [b.id],
        )
      ).rows.length,
      1,
    );
  },
);

test(
  "independent paid reservations race for a single slot with one winner",
  { skip: !process.env.DATABASE_TEST_URL },
  async () => {
    await intro();
    await intro(people.outsider);
    const slot = await makeSlot(db);
    const results = await Promise.allSettled([
      reserve(slot.id),
      reserve(slot.id, people.outsider),
    ]);
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
    assert.equal(
      (
        await db.query(
          "select * from bookings where slot_id=$1 and status='awaiting_payment'",
          [slot.id],
        )
      ).rows.length,
      1,
    );
  },
);

test(
  "capture racing with cancellation leaves one refund obligation and no confirmed booking",
  { skip: !process.env.DATABASE_TEST_URL },
  async () => {
    await intro();
    const b = await reserve((await makeSlot(db)).id);
    await attach(b.id);
    await Promise.all([
      capture(b.id),
      asUser(db, people.learner, (a) =>
        a.query("select cancel_free_intro($1)", [b.id]),
      ),
    ]);
    assert.deepEqual(await state(b.id), {
      status: "cancelled",
      state: "refund_pending",
    });
    assert.equal(
      (
        await db.query(
          "select * from app_private.payment_jobs where booking_id=$1 and kind='refund'",
          [b.id],
        )
      ).rows.length,
      1,
    );
  },
);
