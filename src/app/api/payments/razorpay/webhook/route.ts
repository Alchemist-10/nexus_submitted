import { z } from "zod";
import {
  boundedBody,
  paymentResponse,
  privateJson,
} from "@/features/payments/http";
import { PaymentError, validSignature } from "@/features/payments/gateway";
import {
  paymentAdmin,
  paymentConfigured,
  processPaymentJobs,
  reconcileBooking,
} from "@/features/payments/server";

const envelope = z.object({
  event: z.string(),
  payload: z.object({
    payment: z
      .object({ entity: z.object({ order_id: z.string() }) })
      .optional(),
    order: z.object({ entity: z.object({ id: z.string() }) }).optional(),
    refund: z
      .object({ entity: z.object({ payment_id: z.string() }) })
      .optional(),
  }),
});
export async function POST(request: Request) {
  return paymentResponse(async () => {
    if (!paymentConfigured())
      throw new PaymentError("TEST_PAYMENT_KEYS_REQUIRED");
    const body = await boundedBody(request, 262144),
      signature = request.headers.get("x-razorpay-signature") || "";
    if (!validSignature(body, signature, process.env.RAZORPAY_WEBHOOK_SECRET!))
      throw new PaymentError("INVALID_PAYMENT_SIGNATURE");
    const parsed = envelope.safeParse(JSON.parse(body.toString("utf8")));
    if (!parsed.success) throw new PaymentError("INVALID_INPUT");
    const event = parsed.data;
    if (
      ![
        "payment.captured",
        "payment.failed",
        "order.paid",
        "refund.processed",
        "refund.failed",
      ].includes(event.event)
    )
      return privateJson({ received: true });
    let orderId =
      event.payload.payment?.entity.order_id || event.payload.order?.entity.id;
    if (!orderId && event.payload.refund) {
      // Refund payloads contain a payment ID; fetch its trusted order binding.
      const { RazorpayGateway } = await import("@/features/payments/gateway");
      const api = new RazorpayGateway(
        process.env.RAZORPAY_KEY_ID!,
        process.env.RAZORPAY_KEY_SECRET!,
      );
      orderId = (await api.payment(event.payload.refund.entity.payment_id))
        .order_id;
    }
    if (!orderId || !/^order_[a-zA-Z0-9]{1,100}$/.test(orderId))
      throw new PaymentError("INVALID_INPUT");
    const eventId = request.headers.get("x-razorpay-event-id");
    if (!eventId || eventId.length > 200)
      throw new PaymentError("INVALID_INPUT");
    const db = paymentAdmin();
    const { data: id, error } = await db.rpc("payment_webhook_event", {
      p_event_id: eventId,
      p_order_id: orderId,
    });
    if (error) throw new PaymentError("PAYMENT_UPDATE_FAILED");
    if (id) {
      await reconcileBooking(id);
      await processPaymentJobs(id);
      const { error: markError } = await db.rpc("payment_webhook_event", {
        p_event_id: eventId,
        p_order_id: orderId,
        p_complete: true,
      });
      if (markError) throw new PaymentError("PAYMENT_UPDATE_FAILED");
    }
    return privateJson({ received: true });
  });
}
