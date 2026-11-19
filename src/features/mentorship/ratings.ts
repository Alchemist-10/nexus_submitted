import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function loadMentorRatings(ids: string[]) {
  if (!ids.length) return [];
  const db = await createSupabaseServerClient();
  const { data, error } = await db.rpc("get_mentor_ratings", {
    p_mentor_ids: [...new Set(ids)].slice(0, 60),
  });
  if (error)
    throw new Error("Mentor ratings could not be loaded. Please try again.");
  return data || [];
}
