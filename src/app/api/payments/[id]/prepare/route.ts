import {
  ownedPayment,
  paymentResponse,
  privateJson,
  sameOrigin,
} from "@/features/payments/http";
import { prepareCheckout } from "@/features/payments/server";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return paymentResponse(async () => {
    sameOrigin(request);
    const { id } = await params;
    await ownedPayment(id, true);
    const checkout = await prepareCheckout(id);
    return privateJson({ checkout });
  });
}
