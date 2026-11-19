import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

export class PaymentError extends Error {
  constructor(public readonly code: string) {
    super(code);
  }
}
const identifier = (prefix: string) =>
  z.string().regex(new RegExp(`^${prefix}_[a-zA-Z0-9]{1,100}$`));
const orderSchema = z.object({
  id: identifier("order"),
  amount: z.number().int(),
  currency: z.string(),
  receipt: z.string().nullable(),
  status: z.string(),
  notes: z.object({ nexus_booking_id: z.string().optional() }).optional(),
});
export const paymentSchema = z.object({
  id: identifier("pay"),
  order_id: identifier("order"),
  amount: z.number().int(),
  currency: z.string(),
  status: z.string(),
  captured: z.boolean().optional(),
  amount_refunded: z.number().int().nonnegative().default(0),
});
const refundSchema = z.object({
  id: identifier("rfnd"),
  payment_id: identifier("pay"),
  amount: z.number().int(),
  currency: z.string(),
  status: z.string(),
});
export type ProviderPayment = z.infer<typeof paymentSchema>;
export type Quote = { id: string; amount_paise: number; currency: string };

export function validSignature(
  raw: string | Buffer,
  signature: string,
  secret: string,
) {
  if (!/^[a-fA-F0-9]{64}$/.test(signature)) return false;
  const expected = createHmac("sha256", secret).update(raw).digest();
  return timingSafeEqual(expected, Buffer.from(signature, "hex"));
}
export function verifyCheckout(
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string,
) {
  if (!validSignature(`${orderId}|${paymentId}`, signature, secret))
    throw new PaymentError("INVALID_PAYMENT_SIGNATURE");
}
export function checkPayment(
  quote: Quote,
  orderId: string,
  payment: ProviderPayment,
) {
  if (
    payment.order_id !== orderId ||
    payment.amount !== quote.amount_paise ||
    payment.currency !== quote.currency
  )
    throw new PaymentError("PAYMENT_MISMATCH");
  if (
    payment.amount_refunded > 0 &&
    payment.amount_refunded !== quote.amount_paise
  )
    throw new PaymentError("PARTIAL_REFUND_REQUIRES_REVIEW");
  if (payment.status === "captured" && payment.captured !== true)
    throw new PaymentError("PAYMENT_MISMATCH");
  return payment.status === "captured" || payment.status === "refunded";
}
export function receiptFor(id: string) {
  return `nx_${id.replaceAll("-", "")}`;
}

// Explicit configuration keeps this adapter independently testable. Only the
// server-only composition module reads secrets and instantiates it in the app.
export class RazorpayGateway {
  constructor(
    private readonly keyId: string,
    private readonly secret: string,
    private readonly transport: typeof fetch = fetch,
  ) {
    if (!/^rzp_test_[a-zA-Z0-9]+$/.test(keyId) || !secret)
      throw new PaymentError("TEST_PAYMENT_KEYS_REQUIRED");
  }
  private async request(
    path: string,
    body?: unknown,
    headers?: Record<string, string>,
  ): Promise<unknown> {
    try {
      const response = await this.transport(
        `https://api.razorpay.com/v1/${path}`,
        {
          method: body === undefined ? "GET" : "POST",
          cache: "no-store",
          signal: AbortSignal.timeout(10000),
          headers: {
            Authorization: `Basic ${Buffer.from(`${this.keyId}:${this.secret}`).toString("base64")}`,
            "Content-Type": "application/json",
            ...headers,
          },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        },
      );
      if (!response.ok) throw new PaymentError("PROVIDER_UNAVAILABLE");
      return await response.json();
    } catch {
      throw new PaymentError("PROVIDER_UNAVAILABLE");
    }
  }
  async order(id: string) {
    return orderSchema.parse(
      await this.request(`orders/${identifier("order").parse(id)}`),
    );
  }
  async ensureOrder(quote: Quote) {
    const receipt = receiptFor(quote.id);
    const list = z
      .object({ items: z.array(orderSchema) })
      .parse(await this.request(`orders?receipt=${receipt}&count=100`));
    const exact = list.items.filter((o) => o.receipt === receipt);
    if (exact.length > 1) throw new PaymentError("ORDER_REQUIRES_REVIEW");
    const order =
      exact[0] ??
      orderSchema.parse(
        await this.request("orders", {
          amount: quote.amount_paise,
          currency: quote.currency,
          receipt,
          partial_payment: false,
          notes: { nexus_booking_id: quote.id },
        }),
      );
    if (
      order.amount !== quote.amount_paise ||
      order.currency !== quote.currency ||
      order.receipt !== receipt ||
      order.notes?.nexus_booking_id !== quote.id
    )
      throw new PaymentError("PAYMENT_MISMATCH");
    return order;
  }
  async payment(id: string) {
    return paymentSchema.parse(
      await this.request(`payments/${identifier("pay").parse(id)}`),
    );
  }
  async payments(orderId: string) {
    return z
      .object({ items: z.array(paymentSchema) })
      .parse(
        await this.request(
          `orders/${identifier("order").parse(orderId)}/payments`,
        ),
      ).items;
  }
  async refunds(paymentId: string) {
    return z
      .object({ items: z.array(refundSchema) })
      .parse(
        await this.request(
          `payments/${identifier("pay").parse(paymentId)}/refunds`,
        ),
      ).items;
  }
  async refund(paymentId: string, quote: Quote, idempotencyKey: string) {
    return refundSchema.parse(
      await this.request(
        `payments/${identifier("pay").parse(paymentId)}/refund`,
        { amount: quote.amount_paise },
        { "X-Refund-Idempotency": idempotencyKey },
      ),
    );
  }
}
