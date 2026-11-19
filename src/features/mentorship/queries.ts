import "server-only";
import { loadMentorRatings } from "./ratings";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isConfigured } from "@/lib/env";

export async function listMentors() {
  if (!isConfigured()) return [];
  const supabase = await createSupabaseServerClient();
  const { data: mentors, error } = await supabase
    .from("mentor_profiles")
    .select("*")
    .eq("is_listed", true)
    .order("created_at", { ascending: false })
    .limit(60);
  if (error)
    throw new Error(
      "Mentors could not be loaded. Check the database migrations and connection.",
    );
  if (!mentors.length) return [];
  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .in(
      "id",
      mentors.map((mentor) => mentor.user_id),
    );
  if (profileError) throw new Error("Mentor profiles could not be loaded.");
  const ratings = await loadMentorRatings(mentors.map((m) => m.user_id));
  return mentors.map((mentor) => ({
    rating: ratings.find((r) => r.mentor_id === mentor.user_id),
    ...mentor,
    profile: profiles.find((p) => p.id === mentor.user_id),
  }));
}

export async function mentorDetails(id: string) {
  const supabase = await createSupabaseServerClient();
  const [
    { data: mentor, error },
    { data: profile, error: profileError },
    { data: slots, error: slotError },
  ] = await Promise.all([
    supabase
      .from("mentor_profiles")
      .select("*")
      .eq("user_id", id)
      .eq("is_listed", true)
      .maybeSingle(),
    supabase.from("profiles").select("*").eq("id", id).maybeSingle(),
    supabase.rpc("get_available_slots", { p_mentor_id: id }),
  ]);
  if (error || profileError || slotError)
    throw new Error("We could not load this mentor. Please try again.");
  if (!mentor || !profile) return null;
  const [rating] = await loadMentorRatings([id]);
  return {
    mentor,
    profile,
    slots: slots || [],
    rating,
    requestTime: Date.now(),
  };
}

// Reuse the booking flow's availability rules. A preview never reserves a slot.
export async function nextMentorSlots(ids: string[]) {
  if (!ids.length || !isConfigured())
    return new Map<
      string,
      { starts_at: string; ends_at: string } | null | undefined
    >();
  const db = await createSupabaseServerClient();
  const results = new Map<
    string,
    { starts_at: string; ends_at: string } | null | undefined
  >();
  // Bound parallel reads when the directory grows beyond the initial campus pilot.
  for (let offset = 0; offset < ids.length; offset += 6) {
    await Promise.all(
      ids.slice(offset, offset + 6).map(async (id) => {
        const { data, error } = await db
          .rpc("get_available_slots", { p_mentor_id: id })
          .order("starts_at")
          .limit(1);
        results.set(id, error ? undefined : data?.[0] || null);
      }),
    );
  }
  return results;
}
