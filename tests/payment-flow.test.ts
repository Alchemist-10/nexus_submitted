import { before, after, beforeEach, afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import {
  createDatabase,
  resetFixtures,
  asUser,
  makeSlot,
  people,
  type DB,
} from "./helpers/database";
import {
  prepareCheckout,
  verifyPayment,
  reconcileBooking,
  processPaymentJobs,
} from "../src/features/payments/server";

let db: DB,
  bookingId: string,
  providerStatus: string,
  created: boolean,
  creates: number,
  refundPosts: number,
  loseOrderResponse: boolean,
  loseRefundResponse: boolean;
let refunds: Record<string, unknown>[] = [];
const originalFetch = globalThis.fetch;
const names = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SECRET_KEY",
  "RAZORPAY_KEY_ID",
  "RAZORPAY_KEY_SECRET",
  "RAZORPAY_WEBHOOK_SECRET",
];
const originalEnv = Object.fromEntries(names.map((n) => [n, process.env[n]]));
const secret = "fictional_fixture_secret";
before(async () => {
  db = await createDatabase();
});
after(async () => {
  await db?.close();
  for (const n of names) {
    if (originalEnv[n] === undefined) delete process.env[n];
    else process.env[n] = originalEnv[n];
  }
});
beforeEach(async () => {
  await resetFixtures(db);
  process.env.NEXT_PUBLIC_SUPABASE_URL =
    "https://nexus-payment-fixture.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_fixture";
  process.env.SUPABASE_SECRET_KEY = "sb_secret_fixture";
  process.env.RAZORPAY_KEY_ID = "rzp_test_fixture";
  process.env.RAZORPAY_KEY_SECRET = secret;
  process.env.RAZORPAY_WEBHOOK_SECRET = "fictional_webhook_secret";
  await db.query(
    `with s as (insert into availability_slots(mentor_id,starts_at,ends_at,is_open) values($1,now()-interval '2 days',now()-interval '2 days'+interval '30 minutes',false) returning *)
    insert into bookings(slot_id,mentor_id,learner_id,request_key,starts_at,ends_at,status) select id,mentor_id,$2,$3,starts_at,ends_at,'completed' from s`,
    [people.mentor, people.learner, randomUUID()],
  );
  await asUser(db, people.mentor, (a) =>
    a.query("select set_mentor_price(19900)"),
  );
  const slot = await makeSlot(db);
  bookingId = (
    await asUser(db, people.learner, (a) =>
      a.query("select * from reserve_paid_session($1,$2)", [
        slot.id,
        randomUUID(),
      ]),
    )
  ).rows[0].id as string;
  providerStatus = "authorized";
  created = false;
  creates = 0;
  refundPosts = 0;
  loseOrderResponse = false;
  loseRefundResponse = false;
  refunds = [];
  // Exercise the actual server orchestration with deterministic provider HTTP
  // responses and real SQL/RLS. No fixture request is allowed onto the network.
  globalThis.fetch = async (input, init) => {
    const url = new URL(
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url,
    );
    if (url.hostname === "nexus-payment-fixture.supabase.co") {
      const fn = url.pathname.split("/").at(-1)!;
      assert.match(fn, /^payment_[a-z_]+$/);
      const params = JSON.parse(String(init?.body || "{}")) as Record<
        string,
        unknown
      >;
      assert.ok(Object.keys(params).every((k) => /^p_[a-z_]+$/.test(k)));
      try {
        const rows = await db.transaction(async (a) => {
          await a.exec("set local role service_role");
          return a.query(
            `select public.${fn}(${Object.keys(params)
              .map((n, i) => `${n} => $${i + 1}`)
              .join(",")}) as result`,
            Object.values(params),
          );
        });
        return Response.json(
          fn === "payment_claim_jobs"
            ? rows.rows.map((r) => r.result)
            : (rows.rows[0]?.result ?? null),
        );
      } catch (e) {
        return Response.json(
          {
            code: "P0001",
            message: e instanceof Error ? e.message : "Fixture RPC failure",
          },
          { status: 400 },
        );
      }
    }
    assert.equal(url.hostname, "api.razorpay.com");
    const order = {
      id: "order_fixture",
      amount: 19900,
      currency: "INR",
      receipt: `nx_${bookingId.replaceAll("-", "")}`,
      notes: { nexus_booking_id: bookingId },
      status: providerStatus === "captured" ? "paid" : "created",
    };
    const payment = {
      id: "pay_fixture",
      order_id: "order_fixture",
      amount: 19900,
      currency: "INR",
      status: providerStatus,
      captured: providerStatus === "captured",
      amount_refunded: refunds.length ? 19900 : 0,
    };
    if (url.pathname === "/v1/orders" && init?.method === "POST") {
      creates++;
      created = true;
      if (loseOrderResponse) {
        loseOrderResponse = false;
        throw new Error("Simulated lost order response");
      }
      return Response.json(order);
    }
    if (url.pathname === "/v1/orders")
      return Response.json({ items: created ? [order] : [] });
    if (url.pathname === "/v1/orders/order_fixture")
      return Response.json(order);
    if (url.pathname === "/v1/orders/order_fixture/payments")
      return Response.json({ items: [payment] });
    if (url.pathname === "/v1/payments/pay_fixture")
      return Response.json(payment);
    if (url.pathname === "/v1/payments/pay_fixture/refunds")
      return Response.json({ items: refunds });
    if (url.pathname === "/v1/payments/pay_fixture/refund") {
      refundPosts++;
      assert.ok(new Headers(init?.headers).get("X-Refund-Idempotency"));
      const refund = {
        id: "rfnd_fixture",
        payment_id: "pay_fixture",
        amount: 19900,
        currency: "INR",
        status: "processed",
      };
      refunds = [refund];
      if (loseRefundResponse) {
        loseRefundResponse = false;
        throw new Error("Simulated lost refund response");
      }
      return Response.json(refund);
    }
    throw new Error(`Unexpected fixture endpoint ${url.pathname}`);
  };
});
afterEach(() => {
  globalThis.fetch = originalFetch;
});
const signature = () =>
  createHmac("sha256", secret)
    .update("order_fixture|pay_fixture")
    .digest("hex");
const state = async () =>
  (
    await db.query(
      "select b.status,p.state from bookings b join booking_payment_status p on p.booking_id=b.id where b.id=$1",
      [bookingId],
    )
  ).rows[0];

test("actual checkout verification waits for capture and repeated callbacks confirm once", async () => {
  assert.equal((await prepareCheckout(bookingId))?.amount, 19900);
  await verifyPayment(bookingId, "pay_fixture", signature());
  assert.deepEqual(await state(), {
    status: "awaiting_payment",
    state: "awaiting_payment",
  });
  providerStatus = "captured";
  await verifyPayment(bookingId, "pay_fixture", signature());
  await verifyPayment(bookingId, "pay_fixture", signature());
  assert.deepEqual(await state(), { status: "confirmed", state: "paid" });
  assert.equal(
    (
      await db.query(
        "select * from booking_events where booking_id=$1 and action='confirmed'",
        [bookingId],
      )
    ).rows.length,
    1,
  );
});
test("worker confirms captured payment after the browser has closed", async () => {
  await prepareCheckout(bookingId);
  providerStatus = "captured";
  await db.query(
    "update app_private.payment_jobs set available_at=now() where booking_id=$1",
    [bookingId],
  );
  const results = await processPaymentJobs();
  assert.equal(results[0].done, true);
  assert.deepEqual(await state(), { status: "confirmed", state: "paid" });
});
test("lost order response is recovered without creating a second provider order", async () => {
  loseOrderResponse = true;
  await assert.rejects(prepareCheckout(bookingId), /PROVIDER_UNAVAILABLE/);
  await db.query(
    "update app_private.payment_orders set creating_until=now()-interval '1 second' where booking_id=$1",
    [bookingId],
  );
  assert.equal((await prepareCheckout(bookingId))?.orderId, "order_fixture");
  assert.equal(creates, 1);
});
test("late capture and uncertain refund recover to one full refund through durable jobs", async () => {
  await prepareCheckout(bookingId);
  providerStatus = "captured";
  await db.query(
    "update bookings set hold_expires_at=now()-interval '1 second' where id=$1",
    [bookingId],
  );
  await reconcileBooking(bookingId);
  assert.deepEqual(await state(), {
    status: "expired",
    state: "refund_pending",
  });
  loseRefundResponse = true;
  const first = await processPaymentJobs(bookingId);
  assert.equal(first[0].done, false);
  await db.query(
    "update app_private.payment_jobs set available_at=now() where booking_id=$1 and kind='refund'",
    [bookingId],
  );
  const second = await processPaymentJobs(bookingId);
  assert.ok(second.some((r) => r.done));
  assert.equal(refundPosts, 1);
  assert.deepEqual(await state(), { status: "expired", state: "refunded" });
});
