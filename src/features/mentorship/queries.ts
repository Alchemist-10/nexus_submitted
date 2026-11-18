import "server-only";
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
  return mentors.map((mentor) => ({
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
  return mentor && profile ? { mentor, profile, slots: slots || [] } : null;
}
