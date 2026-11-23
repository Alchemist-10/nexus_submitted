import "server-only";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { supabaseEnv } from "@/lib/env";
import type { Database } from "@/lib/database.types";
import {
  checkPayment,
  PaymentError,
  RazorpayGateway,
  verifyCheckout,
} from "./gateway";

const contextSchema = z.object({
  booking: z.object({
    id: z.uuid(),
    learner_id: z.uuid(),
    mentor_id: z.uuid(),
    amount_paise: z.number().int(),
    currency: z.literal("INR"),
    status: z.string(),
    hold_expires_at: z.string(),
  }),
  order: z.object({
    provider_order_id: z.string().nullable(),
    create_token: z.string().nullable(),
    paid_payment_id: z.string().nullable(),
  }),
  payments: z.array(
    z.object({
      payment_id: z.string(),
      refund_id: z.string().nullable(),
      refund_state: z.string().nullable(),
    }),
  ),
});
const jobSchema = z.object({
  id: z.uuid(),
  booking_id: z.uuid(),
  kind: z.enum(["refund", "reconcile"]),
  payment_id: z.string().nullable(),
  lease_token: z.uuid(),
});
type Context = z.infer<typeof contextSchema>;
export function paymentConfigured() {
  return (
    /^rzp_test_[a-zA-Z0-9]+$/.test(process.env.RAZORPAY_KEY_ID || "") &&
    Boolean(
      process.env.RAZORPAY_KEY_SECRET &&
      process.env.RAZORPAY_WEBHOOK_SECRET &&
      process.env.SUPABASE_SECRET_KEY,
    )
  );
}
function configuration() {
  if (!paymentConfigured())
    throw new PaymentError("TEST_PAYMENT_KEYS_REQUIRED");
  return {
    keyId: process.env.RAZORPAY_KEY_ID!,
    secret: process.env.RAZORPAY_KEY_SECRET!,
  };
}
export function paymentAdmin() {
  configuration();
  const { url } = supabaseEnv();
  return createClient<Database>(url, process.env.SUPABASE_SECRET_KEY!, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
function gateway() {
  const { keyId, secret } = configuration();
  return new RazorpayGateway(keyId, secret);
}
function checked<T>(result: { data: T; error: { message: string } | null }): T {
  if (result.error) throw new PaymentError("PAYMENT_UPDATE_FAILED");
  return result.data;
}
export async function paymentContext(id: string): Promise<Context> {
  return contextSchema.parse(
    checked(
      await paymentAdmin().rpc("payment_get_context", { p_booking_id: id }),
    ),
  );
}
export async function prepareCheckout(id: string) {
  const db = paymentAdmin();
  const claim = z
    .object({ claimed: z.boolean(), context: contextSchema })
    .parse(checked(await db.rpc("payment_claim_order", { p_booking_id: id })));
  if (claim.context.booking.status !== "awaiting_payment") return null;
  if (claim.claimed) {
    const order = await gateway().ensureOrder(claim.context.booking);
    checked(
      await db.rpc("payment_attach_order", {
        p_booking_id: id,
        p_token: claim.context.order.create_token!,
        p_order_id: order.id,
        p_amount_paise: order.amount,
        p_currency: order.currency,
      }),
    );
  }
  const context = await paymentContext(id);
  if (
    context.booking.status !== "awaiting_payment" ||
    !context.order.provider_order_id ||
    Date.parse(context.booking.hold_expires_at) <= Date.now()
  )
    return null;
  return {
    keyId: configuration().keyId,
    orderId: context.order.provider_order_id,
    amount: context.booking.amount_paise,
    currency: context.booking.currency,
  };
}
export async function reconcileBooking(id: string) {
  const db = paymentAdmin(),
    api = gateway(),
    context = await paymentContext(id),
    orderId = context.order.provider_order_id;
  if (!orderId) return context.booking.status !== "awaiting_payment";
  const order = await api.order(orderId);
  if (
    order.amount !== context.booking.amount_paise ||
    order.currency !== context.booking.currency
  )
    throw new PaymentError("PAYMENT_MISMATCH");
  const payments = await api.payments(orderId);
  for (const payment of payments) {
    if (!checkPayment(context.booking, orderId, payment)) continue;
    checked(
      await db.rpc("payment_record_capture", {
        p_booking_id: id,
        p_order_id: orderId,
        p_payment_id: payment.id,
        p_amount_paise: payment.amount,
        p_currency: payment.currency,
        p_fully_refunded: payment.amount_refunded === payment.amount,
      }),
    );
    if (
      payment.amount_refunded > 0 ||
      context.payments.some(
        (p) => p.payment_id === payment.id && p.refund_state,
      )
    ) {
      const refunds = await api.refunds(payment.id);
      for (const refund of refunds) {
        if (
          refund.payment_id !== payment.id ||
          refund.amount !== context.booking.amount_paise ||
          refund.currency !== context.booking.currency
        )
          throw new PaymentError("PAYMENT_MISMATCH");
        if (refund.status !== "failed")
          checked(
            await db.rpc("payment_record_refund", {
              p_payment_id: payment.id,
              p_refund_id: refund.id,
              p_processed: refund.status === "processed",
            }),
          );
      }
    }
  }
  const current = await paymentContext(id);
  return (
    current.booking.status !== "awaiting_payment" &&
    !payments.some((p) => p.status === "authorized")
  );
}
export async function verifyPayment(
  id: string,
  paymentId: string,
  signature: string,
) {
  const context = await paymentContext(id),
    orderId = context.order.provider_order_id;
  if (!orderId) throw new PaymentError("PAYMENT_MISMATCH");
  verifyCheckout(orderId, paymentId, signature, configuration().secret);
  const payment = await gateway().payment(paymentId);
  if (!checkPayment(context.booking, orderId, payment)) return;
  // Re-fetch order and payments rather than trusting the browser's success flag.
  await reconcileBooking(id);
}
export async function processPaymentJobs(bookingId?: string, limit = 5) {
  z.number().int().min(1).max(5).parse(limit);
  const db = paymentAdmin(),
    api = gateway();
  const jobs = z.array(jobSchema).parse(
    checked(
      await db.rpc("payment_claim_jobs", {
        ...(bookingId ? { p_booking_id: bookingId } : {}),
        p_limit: limit,
      }),
    ),
  );
  const outcomes: { id: string; done: boolean; error: string | null }[] = [];
  for (const job of jobs) {
    let done = false,
      error: string | null = null;
    try {
      if (job.kind === "reconcile") {
        const context = await paymentContext(job.booking_id);
        if (
          !context.order.provider_order_id &&
          context.booking.status === "awaiting_payment"
        )
          await prepareCheckout(job.booking_id);
        done = await reconcileBooking(job.booking_id);
      } else {
        const context = await paymentContext(job.booking_id),
          payment = context.payments.find(
            (p) => p.payment_id === job.payment_id,
          );
        if (!payment) throw new PaymentError("PAYMENT_MISMATCH");
        if (payment.refund_state === "processed") done = true;
        else {
          const existing = await api.refunds(payment.payment_id);
          if (
            existing.some(
              (r) =>
                r.amount !== context.booking.amount_paise ||
                r.currency !== context.booking.currency ||
                r.payment_id !== payment.payment_id,
            )
          )
            throw new PaymentError("PARTIAL_REFUND_REQUIRES_REVIEW");
          const refund =
            existing.find((r) => r.status !== "failed") ??
            (await api.refund(payment.payment_id, context.booking, job.id));
          if (
            refund.payment_id !== payment.payment_id ||
            refund.amount !== context.booking.amount_paise ||
            refund.currency !== context.booking.currency
          )
            throw new PaymentError("PAYMENT_MISMATCH");
          if (refund.status === "failed")
            throw new PaymentError("REFUND_REQUIRES_REVIEW");
          checked(
            await db.rpc("payment_record_refund", {
              p_payment_id: payment.payment_id,
              p_refund_id: refund.id,
              p_processed: refund.status === "processed",
            }),
          );
          done = refund.status === "processed";
        }
      }
    } catch (e) {
      error =
        e instanceof PaymentError ? e.code : "PAYMENT_RECONCILIATION_FAILED";
    }
    checked(
      await db.rpc("payment_finish_job", {
        p_job_id: job.id,
        p_token: job.lease_token,
        p_done: done,
        ...(error ? { p_error: error } : {}),
      }),
    );
    outcomes.push({ id: job.id, done, error });
  }
  return outcomes;
}
