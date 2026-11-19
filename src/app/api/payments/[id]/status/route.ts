import {
  ownedPayment,
  paymentResponse,
  privateJson,
  sameOrigin,
  paymentStatus,
} from "@/features/payments/http";
import {
  paymentConfigured,
  processPaymentJobs,
} from "@/features/payments/server";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return paymentResponse(async () => {
    sameOrigin(request);
    const { id } = await params;
    await ownedPayment(id);
    if (paymentConfigured()) await processPaymentJobs(id);
    return privateJson(await paymentStatus(id));
  });
}
