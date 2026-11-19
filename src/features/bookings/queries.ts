import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function loadMyBookings() {
  const supabase = await createSupabaseServerClient();
  const { data: bookings, error } = await supabase
    .from("bookings")
    .select("*")
    .order("starts_at", { ascending: false })
    .limit(100);
  if (error) throw new Error("Your sessions could not be loaded.");
  const ids = [
    ...new Set(
      bookings.flatMap((booking) => [booking.mentor_id, booking.learner_id]),
    ),
  ];
  const { data: profiles, error: profileError } = ids.length
    ? await supabase.from("profiles").select("*").in("id", ids)
    : { data: [], error: null };
  if (profileError)
    throw new Error("Session participants could not be loaded.");
  const { data: ratings, error: ratingError } = bookings.length
    ? await supabase
        .from("mentor_ratings")
        .select("*")
        .in(
          "booking_id",
          bookings.map((b) => b.id),
        )
    : { data: [], error: null };
  if (ratingError) throw new Error("Your session ratings could not be loaded.");
  return {
    bookings,
    profiles,
    ratings: ratings || [],
    requestTime: Date.now(),
  };
}

export async function loadSessionBooking(id: string) {
  const db = await createSupabaseServerClient();
  const { data: booking, error } = await db
    .from("bookings")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("This session could not be loaded.");
  return { booking, requestTime: Date.now() };
}
