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
const trusted = <T>(fn: (a: DB) => Promise<T>) =>
  db.transaction(async (a) => {
    await a.exec("set local role service_role");
    return fn(a);
  });
async function book(minutes = 2880) {
  const slot = (
    await asUser(db, people.mentor, (a) =>
      a.query<{ id: string }>(
        "select * from create_availability(now()+$1*interval '1 minute',now()+($1+30)*interval '1 minute')",
        [minutes],
      ),
    )
  ).rows[0];
  const request = randomUUID();
  const booking = (
    await asUser(db, people.learner, (a) =>
      a.query<{ id: string }>("select * from book_free_intro($1,$2)", [
        slot.id,
        request,
      ]),
    )
  ).rows[0];
  return { ...booking, slot: slot.id, request };
}
type Claim = { id: string; lease_token: string };
const claim = (limit = 10) =>
  trusted((a) =>
    a.query<Claim>("select * from notification_claim_jobs($1)", [limit]),
  );
const prepare = (c: Claim) =>
  trusted((a) =>
    a.query<{ payload: Record<string, unknown> | null }>(
      "select notification_prepare_job($1,$2) as payload",
      [c.id, c.lease_token],
    ),
  );
const finish = (c: Claim, outcome = "previewed") =>
  trusted((a) =>
    a.query<{ ok: boolean }>("select notification_finish_job($1,$2,$3) as ok", [
      c.id,
      c.lease_token,
      outcome,
    ]),
  );
const due = (kind: string) =>
  db.query(
    "update app_private.notification_jobs j set due_at=now()-interval '1 minute' from notifications n where n.id=j.id and n.kind=$1",
    [kind],
  );

test("booking atomically enqueues two confirmations and future reminders; retries do not duplicate", async () => {
  const b = await book();
  assert.equal((await db.query("select * from notifications")).rows.length, 7);
  assert.equal(
    (await db.query("select * from app_private.notification_jobs")).rows.length,
    7,
  );
  await asUser(db, people.learner, (a) =>
    a.query("select * from book_free_intro($1,$2)", [b.slot, b.request]),
  );
  assert.equal((await db.query("select * from notifications")).rows.length, 7);
  const visible = await asUser(db, people.learner, (a) =>
    a.query("select * from notifications"),
  );
  assert.equal(visible.rows.length, 1);
  assert.equal(visible.rows[0].kind, "booking_confirmed");
  assert.ok(!("recipient_email" in visible.rows[0]));
  await assert.rejects(
    db.transaction(async (a) => {
      await a.query(
        "insert into booking_events(booking_id,actor_id,action) values($1,$2,'meeting_updated')",
        [b.id, people.mentor],
      );
      throw new Error("force rollback");
    }),
    /force rollback/,
  );
  assert.equal((await db.query("select * from notifications")).rows.length, 7);
});

test("recipient-only inbox, immutable content, private jobs and service-only RPCs", async () => {
  await book();
  assert.equal(
    (
      await asUser(db, people.outsider, (a) =>
        a.query("select * from notifications"),
      )
    ).rows.length,
    0,
  );
  await assert.rejects(
    asUser(db, null, (a) => a.query("select * from notifications"), "anon"),
    /permission denied/,
  );
  const n = (
    await asUser(db, people.learner, (a) =>
      a.query("select * from notifications"),
    )
  ).rows[0];
  await asUser(db, people.outsider, (a) =>
    a.query("select mark_notifications_read($1)", [n.id]),
  );
  assert.equal(
    (await db.query("select read_at from notifications where id=$1", [n.id]))
      .rows[0].read_at,
    null,
  );
  await asUser(db, people.learner, (a) =>
    a.query("select mark_notifications_read($1)", [n.id]),
  );
  assert.ok(
    (await db.query("select read_at from notifications where id=$1", [n.id]))
      .rows[0].read_at,
  );
  await assert.rejects(
    asUser(db, people.learner, (a) =>
      a.query("update notifications set recipient_id=$1", [people.outsider]),
    ),
    /permission denied/,
  );
  await assert.rejects(
    asUser(db, people.learner, (a) =>
      a.query("select * from app_private.notification_jobs"),
    ),
    /permission denied/,
  );
  for (const sql of [
    "select * from notification_claim_jobs()",
    "select notification_prepare_job(null,null)",
    "select notification_finish_job(null,null,'accepted')",
    "select notification_job_status()",
  ]) {
    await assert.rejects(
      asUser(db, people.learner, (a) => a.query(sql)),
      /permission denied/,
    );
    await assert.rejects(
      asUser(db, null, (a) => a.query(sql), "anon"),
      /permission denied/,
    );
  }
});

test("last-minute bookings schedule only future reminders", async () => {
  await book(30);
  const kinds = (
    await db.query("select kind from notifications order by kind")
  ).rows.map((r) => r.kind);
  assert.deepEqual(kinds, [
    "booking_confirmed",
    "booking_confirmed",
    "reminder_15m",
    "reminder_15m",
  ]);
  await resetFixtures(db);
  await book(5);
  assert.equal((await db.query("select * from notifications")).rows.length, 2);
});

test("reminder offsets are exact UTC intervals and retry recipients/content are snapshotted", async () => {
  await book();
  const offsets = (
    await db.query<{ kind: string; seconds: number }>(
      "select kind,extract(epoch from starts_at-available_at)::int as seconds from notifications where kind like 'reminder_%' or kind='missing_meeting' order by kind",
    )
  ).rows;
  assert.deepEqual(
    offsets.map((r) => r.seconds),
    [3600, 900, 900, 86400, 86400],
  );
  const c = (await claim()).rows;
  const before = (await prepare(c[0])).rows[0].payload;
  await db.query(
    "update auth.users set email='changed@nexus.test' where id=$1",
    [people.learner],
  );
  await db.query("update profiles set full_name='Changed name' where id=$1", [
    people.mentor,
  ]);
  assert.deepEqual((await prepare(c[0])).rows[0].payload, before);
});

test("inbox history paginates deterministically and mark-all leaves future reminders unread", async () => {
  const b = await book();
  for (let i = 0; i < 20; i++)
    await db.query(
      "insert into booking_events(booking_id,actor_id,action) values($1,$2,'meeting_updated')",
      [b.id, people.mentor],
    );
  const page = (offset: number) =>
    asUser(db, people.learner, (a) =>
      a.query(
        "select id from notifications order by published_at desc,id desc limit 15 offset $1",
        [offset],
      ),
    );
  const first = (await page(0)).rows,
    second = (await page(15)).rows;
  assert.equal(first.length, 15);
  assert.equal(second.length, 6);
  assert.equal(new Set([...first, ...second].map((r) => r.id)).size, 21);
  await asUser(db, people.learner, (a) =>
    a.query("select mark_notifications_read()"),
  );
  assert.equal(
    (
      await asUser(db, people.learner, (a) =>
        a.query("select id from notifications where read_at is null"),
      )
    ).rows.length,
    0,
  );
  assert.equal(
    (
      await db.query(
        "select count(*)::int as n from notifications where recipient_id=$1 and published_at is null and read_at is null",
        [people.learner],
      )
    ).rows[0].n,
    2,
  );
});

test("due reminders publish once; cancelled bookings suppress outstanding dispatch and inbox reminders", async () => {
  const b = await book();
  for (const c of (await claim()).rows) await finish(c);
  await due("reminder_15m");
  const claimed = (await claim()).rows;
  assert.equal(claimed.length, 2);
  const payload = (await prepare(claimed[0])).rows[0].payload!;
  assert.equal(payload.kind, "reminder_15m");
  assert.ok(!JSON.stringify(payload).includes("join_url"));
  await asUser(db, people.learner, (a) =>
    a.query("select * from cancel_free_intro($1)", [b.id]),
  );
  assert.equal((await prepare(claimed[1])).rows[0].payload, null);
  assert.equal((await finish(claimed[0])).rows[0].ok, false);
  const visible = (
    await asUser(db, people.learner, (a) =>
      a.query("select kind from notifications"),
    )
  ).rows;
  assert.ok(visible.some((r) => r.kind === "booking_cancelled"));
  assert.ok(!visible.some((r) => r.kind === "reminder_15m"));
});

test("meeting update is idempotent and prevents the missing-link alert", async () => {
  const b = await book();
  const url = "https://meet.google.com/abc-defg-hij";
  for (let i = 0; i < 2; i++)
    await asUser(db, people.mentor, (a) =>
      a.query("select set_booking_meeting($1,$2)", [b.id, url]),
    );
  assert.equal(
    (await db.query("select * from notifications where kind='meeting_updated'"))
      .rows.length,
    1,
  );
  for (const c of (await claim()).rows) await finish(c);
  await due("missing_meeting");
  const c = (await claim()).rows[0];
  assert.ok(c);
  assert.equal((await prepare(c)).rows[0].payload, null);
  assert.equal(
    (
      await db.query(
        "select state from app_private.notification_jobs where id=$1",
        [c.id],
      )
    ).rows[0].state,
    "suppressed",
  );
});

test("missing-link reminder targets mentor and completion targets learner; ended calls suppress reminders", async () => {
  const b = await book();
  for (const c of (await claim()).rows) await finish(c);
  await due("missing_meeting");
  const c = (await claim()).rows[0];
  const payload = (await prepare(c)).rows[0].payload!;
  assert.equal(payload.recipientEmail, "mentor@nexus.test");
  await db.query("update bookings set status='completed' where id=$1", [b.id]);
  await db.query(
    "insert into booking_events(booking_id,actor_id,action) values($1,$2,'completed')",
    [b.id, people.mentor],
  );
  const n = (
    await db.query(
      "select recipient_id from notifications where kind='session_completed'",
    )
  ).rows;
  assert.deepEqual(
    n.map((x) => x.recipient_id),
    [people.learner],
  );
  assert.equal((await finish(c)).rows[0].ok, false);
});

test("expired messages suppress; exclusive leases recover crashes and reject stale/null tokens", async () => {
  await book();
  const first = (await claim(1)).rows[0];
  const second = (await claim(1)).rows[0];
  assert.notEqual(first.id, second.id);
  assert.equal((await claim()).rows.length, 0);
  assert.equal(
    (await prepare({ ...first, lease_token: randomUUID() })).rows[0].payload,
    null,
  );
  await db.query(
    "update app_private.notification_jobs set leased_until=now()-interval '1 second' where id=$1",
    [first.id],
  );
  assert.equal((await finish(first)).rows[0].ok, false);
  const again = (await claim(1)).rows[0];
  assert.equal(again.id, first.id);
  assert.notEqual(again.lease_token, first.lease_token);
  await db.query(
    "update app_private.notification_jobs set expires_at=now()-interval '1 second' where id=$1",
    [again.id],
  );
  assert.equal((await prepare(again)).rows[0].payload, null);
  assert.equal((await finish(second)).rows[0].ok, true);
  assert.equal((await finish(second)).rows[0].ok, false);
});

test("backoff, exhausted final claims, retry windows and preview/provider states remain distinct", async () => {
  await book();
  const cs = (await claim()).rows;
  await finish(cs[0], "retry");
  const j = (
    await db.query("select * from app_private.notification_jobs where id=$1", [
      cs[0].id,
    ])
  ).rows[0];
  assert.equal(j.state, "pending");
  assert.equal(j.attempts, 1);
  assert.ok(new Date(String(j.due_at)).getTime() > Date.now() + 20000);
  await finish(cs[1], "accepted");
  await db.query(
    "update app_private.notification_jobs set attempts=8,leased_until=now()-interval '1 minute' where id=$1",
    [cs[0].id],
  );
  await claim();
  assert.equal(
    (
      await db.query(
        "select state from app_private.notification_jobs where id=$1",
        [cs[0].id],
      )
    ).rows[0].state,
    "review",
  );
  await db.query(
    "update app_private.notification_jobs set first_attempt_at=now()-interval '24 hours' where state='pending'",
  );
  await claim();
  assert.equal(
    (
      await db.query(
        "select count(*)::int as n from app_private.notification_jobs where state='pending'",
      )
    ).rows[0].n,
    0,
  );
});

test("paid holds send no confirmation; verified capture creates it once", async () => {
  const slot = await makeSlot(db);
  await db.query(
    `with s as (insert into availability_slots(mentor_id,starts_at,ends_at,is_open)
    values($1,now()-interval '2 days',now()-interval '2 days'+interval '30 minutes',false) returning *)
    insert into bookings(slot_id,mentor_id,learner_id,request_key,starts_at,ends_at,status)
    select id,mentor_id,$2,$3,starts_at,ends_at,'completed' from s`,
    [people.mentor, people.learner, randomUUID()],
  );
  await asUser(db, people.mentor, (a) =>
    a.query("select set_mentor_price(19900)"),
  );
  const b = (
    await asUser(db, people.learner, (a) =>
      a.query<{ id: string }>("select * from reserve_paid_session($1,$2)", [
        slot.id,
        randomUUID(),
      ]),
    )
  ).rows[0];
  assert.equal((await db.query("select * from notifications")).rows.length, 0);
  const order = (
    await trusted((a) =>
      a.query<{ result: { context: { order: { create_token: string } } } }>(
        "select payment_claim_order($1) as result",
        [b.id],
      ),
    )
  ).rows[0].result;
  await trusted((a) =>
    a.query("select payment_attach_order($1,$2,'order_notify',19900,'INR')", [
      b.id,
      order.context.order.create_token,
    ]),
  );
  for (let i = 0; i < 2; i++)
    await trusted((a) =>
      a.query(
        "select payment_record_capture($1,'order_notify','pay_notify',19900,'INR')",
        [b.id],
      ),
    );
  assert.equal(
    (
      await db.query(
        "select * from notifications where kind='booking_confirmed'",
      )
    ).rows.length,
    2,
  );
});

test(
  "independent workers claim disjoint notifications",
  { skip: !process.env.DATABASE_TEST_URL },
  async () => {
    await book();
    const [a, b] = await Promise.all([claim(1), claim(1)]);
    assert.equal(a.rows.length, 1);
    assert.equal(b.rows.length, 1);
    assert.notEqual(a.rows[0].id, b.rows[0].id);
  },
);
