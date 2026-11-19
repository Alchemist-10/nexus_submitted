import { z } from "zod";
import {
  ownedPayment,
  paymentResponse,
  privateJson,
  sameOrigin,
  boundedBody,
  paymentStatus,
} from "@/features/payments/http";
import { PaymentError } from "@/features/payments/gateway";
import { verifyPayment, processPaymentJobs } from "@/features/payments/server";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return paymentResponse(async () => {
    sameOrigin(request);
    const { id } = await params;
    await ownedPayment(id, true);
    let payload: unknown;
    try {
      payload = JSON.parse((await boundedBody(request)).toString("utf8"));
    } catch {
      throw new PaymentError("INVALID_INPUT");
    }
    const parsed = z
      .object({
        paymentId: z.string().regex(/^pay_[a-zA-Z0-9]{1,100}$/),
        signature: z.string().regex(/^[a-fA-F0-9]{64}$/),
      })
      .safeParse(payload);
    if (!parsed.success) throw new PaymentError("INVALID_INPUT");
    await verifyPayment(id, parsed.data.paymentId, parsed.data.signature);
    await processPaymentJobs(id);
    return privateJson(await paymentStatus(id));
  });
}
