import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function loadCheckout(id: string, learnerId: string) {
  const db = await createSupabaseServerClient();
  const { data: booking, error } = await db
    .from("bookings")
    .select("*")
    .eq("id", id)
    .eq("learner_id", learnerId)
    .eq("kind", "paid")
    .maybeSingle();
  if (error) throw new Error("Your checkout could not be loaded.");
  if (!booking) return null;
  const [
    { data: mentor, error: mentorError },
    { data: payment, error: paymentError },
  ] = await Promise.all([
    db
      .from("profiles")
      .select("id,full_name")
      .eq("id", booking.mentor_id)
      .single(),
    db
      .from("booking_payment_status")
      .select("state")
      .eq("booking_id", id)
      .single(),
  ]);
  if (mentorError || paymentError)
    throw new Error("Your checkout details could not be loaded.");
  return { booking, mentor, payment, requestTime: Date.now() };
}
