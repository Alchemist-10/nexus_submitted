import "server-only";
import { z } from "zod";
import { currentUser } from "@/lib/auth/session";
import { appUrl } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PaymentError } from "./gateway";

export function privateJson(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}
export async function ownedPayment(id: string, learnerOnly = false) {
  if (!z.uuid().safeParse(id).success) throw new PaymentError("NOT_FOUND");
  const user = await currentUser();
  if (!user) throw new PaymentError("AUTH_REQUIRED");
  const db = await createSupabaseServerClient();
  const { data: booking, error } = await db
    .from("bookings")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new PaymentError("PAYMENT_UPDATE_FAILED");
  if (
    !booking ||
    booking.kind !== "paid" ||
    (learnerOnly && booking.learner_id !== user.id)
  )
    throw new PaymentError("NOT_FOUND");
  return { user, booking, db };
}
export function sameOrigin(request: Request) {
  if (request.headers.get("origin") !== appUrl())
    throw new PaymentError("INVALID_ORIGIN");
}
export async function boundedBody(request: Request, max = 16384) {
  const reader = request.body?.getReader();
  if (!reader) return Buffer.alloc(0);
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > max) {
      await reader.cancel();
      throw new PaymentError("INVALID_INPUT");
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}
export async function paymentStatus(id: string) {
  const { booking, db } = await ownedPayment(id);
  const { data, error } = await db
    .from("booking_payment_status")
    .select("state")
    .eq("booking_id", id)
    .single();
  if (error) throw new PaymentError("PAYMENT_UPDATE_FAILED");
  return {
    status: booking.status,
    paymentState: data.state,
    expiresAt: booking.hold_expires_at,
  };
}
export async function paymentResponse(operation: () => Promise<Response>) {
  try {
    return await operation();
  } catch (e) {
    const code = e instanceof PaymentError ? e.code : "PAYMENT_UPDATE_FAILED";
    const messages: Record<string, string> = {
      AUTH_REQUIRED: "Sign in to continue.",
      NOT_FOUND: "This payment could not be found.",
      INVALID_ORIGIN: "Refresh this page and try again.",
      INVALID_INPUT: "Check the payment details and try again.",
      INVALID_PAYMENT_SIGNATURE:
        "Payment verification failed. Your booking has not been confirmed.",
      TEST_PAYMENT_KEYS_REQUIRED:
        "Test payments are not configured yet. Your first introduction is still free.",
      PROVIDER_UNAVAILABLE:
        "The payment provider is unavailable. Check your payment status before retrying.",
    };
    return privateJson(
      {
        error:
          messages[code] ||
          "We could not update your payment. Your booking is confirmed only when payment verification succeeds.",
      },
      code === "AUTH_REQUIRED"
        ? 401
        : code === "NOT_FOUND"
          ? 404
          : code === "INVALID_ORIGIN"
            ? 403
            : code === "INVALID_INPUT" || code === "INVALID_PAYMENT_SIGNATURE"
              ? 400
              : 503,
    );
  }
}
