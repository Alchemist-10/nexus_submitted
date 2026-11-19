import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import {
  checkPayment,
  PaymentError,
  RazorpayGateway,
  validSignature,
  verifyCheckout,
  receiptFor,
} from "../src/features/payments/gateway";
import { parseINR } from "../src/features/payments/shared";

const quote = {
  id: "10000000-0000-4000-8000-000000000001",
  amount_paise: 19900,
  currency: "INR",
};
const captured = {
  id: "pay_one",
  order_id: "order_one",
  amount: 19900,
  currency: "INR",
  status: "captured",
  captured: true,
  amount_refunded: 0,
};
const order = {
  id: "order_one",
  amount: 19900,
  currency: "INR",
  receipt: receiptFor(quote.id),
  status: "created",
  notes: { nexus_booking_id: quote.id },
};

test("signatures bind the stored order/payment and exact raw webhook bytes", () => {
  const signature = createHmac("sha256", "testsecret")
    .update("order_one|pay_one")
    .digest("hex");
  verifyCheckout("order_one", "pay_one", signature, "testsecret");
  assert.throws(
    () => verifyCheckout("order_other", "pay_one", signature, "testsecret"),
    /INVALID_PAYMENT_SIGNATURE/,
  );
  assert.throws(
    () => verifyCheckout("order_one", "pay_other", signature, "testsecret"),
    /INVALID_PAYMENT_SIGNATURE/,
  );
  for (const invalid of ["", "x".repeat(64), "ab", signature.slice(1)])
    assert.equal(
      validSignature("order_one|pay_one", invalid, "testsecret"),
      false,
    );
  const raw = Buffer.from('{ "event": "payment.captured" }');
  const signed = createHmac("sha256", "webhooksecret")
    .update(raw)
    .digest("hex");
  assert.equal(validSignature(raw, signed, "webhooksecret"), true);
  assert.equal(
    validSignature(
      JSON.stringify(JSON.parse(raw.toString())),
      signed,
      "webhooksecret",
    ),
    false,
  );
});
test("capture validation rejects tampering and never fulfills authorized or failed payments", () => {
  assert.equal(checkPayment(quote, "order_one", captured), true);
  for (const status of ["created", "authorized", "failed"])
    assert.equal(
      checkPayment(quote, "order_one", {
        ...captured,
        status,
        captured: false,
      }),
      false,
    );
  for (const change of [
    { amount: 1 },
    { currency: "USD" },
    { order_id: "order_other" },
    { captured: false },
  ])
    assert.throws(
      () => checkPayment(quote, "order_one", { ...captured, ...change }),
      /PAYMENT_MISMATCH/,
    );
  assert.throws(
    () =>
      checkPayment(quote, "order_one", { ...captured, amount_refunded: 100 }),
    /PARTIAL_REFUND_REQUIRES_REVIEW/,
  );
  assert.equal(
    checkPayment(quote, "order_one", {
      ...captured,
      status: "refunded",
      amount_refunded: 19900,
    }),
    true,
  );
});
test("INR input uses exact paise and enforces supported precision/range", () => {
  assert.equal(parseINR("199.99"), 19999);
  assert.equal(parseINR("1.01"), 101);
  assert.equal(parseINR(""), null);
  for (const bad of ["0", "0.99", "25000.01", "1.001", "-1", "1e3", "Infinity"])
    assert.throws(() => parseINR(bad), /INVALID_PRICE/);
});
test("gateway refuses live keys and sanitizes network/provider failures", async () => {
  assert.throws(
    () => new RazorpayGateway("rzp_live_example", "secret"),
    /TEST_PAYMENT_KEYS_REQUIRED/,
  );
  const transport: typeof fetch = async () =>
    new Response(
      JSON.stringify({ error: { description: "Sensitive provider detail" } }),
      { status: 500 },
    );
  const gateway = new RazorpayGateway("rzp_test_example", "secret", transport);
  await assert.rejects(
    gateway.order("order_one"),
    (e) => e instanceof PaymentError && e.message === "PROVIDER_UNAVAILABLE",
  );
  const offline = new RazorpayGateway(
    "rzp_test_example",
    "secret",
    async () => {
      throw new Error("secret-bearing network error");
    },
  );
  await assert.rejects(offline.order("order_one"), /PROVIDER_UNAVAILABLE/);
});
test("uncertain order creation recovers by exact receipt; no second order is created", async () => {
  let creates = 0;
  const gateway = new RazorpayGateway(
    "rzp_test_example",
    "secret",
    async (input, init) => {
      assert.ok(String(input).startsWith("https://api.razorpay.com/v1/orders"));
      if (init?.method === "POST") creates++;
      return Response.json({
        items: [{ ...order, receipt: "other_receipt" }, order],
      });
    },
  );
  assert.equal((await gateway.ensureOrder(quote)).id, "order_one");
  assert.equal(creates, 0);
});
test("new orders use the stored quote and duplicates/mismatched recovered orders fail", async () => {
  const requests: { path: string; body: unknown }[] = [];
  const gateway = new RazorpayGateway(
    "rzp_test_example",
    "secret",
    async (input, init) => {
      requests.push({
        path: String(input),
        body: init?.body ? JSON.parse(String(init.body)) : null,
      });
      return Response.json(init?.method === "POST" ? order : { items: [] });
    },
  );
  await gateway.ensureOrder(quote);
  assert.deepEqual(requests[1].body, {
    amount: 19900,
    currency: "INR",
    receipt: receiptFor(quote.id),
    partial_payment: false,
    notes: { nexus_booking_id: quote.id },
  });
  for (const items of [
    [order, order],
    [{ ...order, amount: 1 }],
    [{ ...order, notes: { nexus_booking_id: "different" } }],
  ]) {
    const bad = new RazorpayGateway("rzp_test_example", "secret", async () =>
      Response.json({ items }),
    );
    await assert.rejects(
      bad.ensureOrder(quote),
      /ORDER_REQUIRES_REVIEW|PAYMENT_MISMATCH/,
    );
  }
});
test("refund retries carry the same idempotency key and immutable full amount", async () => {
  const calls: { body: unknown; key: string | undefined }[] = [];
  const gateway = new RazorpayGateway(
    "rzp_test_example",
    "secret",
    async (_input, init) => {
      calls.push({
        body: JSON.parse(String(init?.body)),
        key: (init?.headers as Record<string, string>)["X-Refund-Idempotency"],
      });
      return Response.json({
        id: "rfnd_one",
        payment_id: "pay_one",
        amount: 19900,
        currency: "INR",
        status: "processed",
      });
    },
  );
  await gateway.refund("pay_one", quote, quote.id);
  await gateway.refund("pay_one", quote, quote.id);
  assert.deepEqual(calls[0], calls[1]);
  assert.deepEqual(calls[0].body, { amount: 19900 });
  assert.equal(calls[0].key, quote.id);
});
