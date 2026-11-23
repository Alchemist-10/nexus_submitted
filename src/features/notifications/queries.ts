import "server-only";
import { cache } from "react";
import { currentUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const unreadNotificationCount = cache(async () => {
  const user = await currentUser();
  if (!user) return 0;
  const db = await createSupabaseServerClient();
  const { count, error } = await db
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", user.id)
    .is("read_at", null);
  // An inbox outage must not take down navigation/auth/booking pages.
  return error ? null : count || 0;
});
export async function loadNotifications(page: number) {
  const user = await currentUser();
  if (!user) throw new Error("AUTH_REQUIRED");
  const db = await createSupabaseServerClient();
  const { count, error: countError } = await db
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", user.id);
  if (countError)
    throw new Error(
      "Your notifications could not be loaded. Please try again.",
    );
  const total = count || 0;
  // PostgREST rejects ranges beyond the end; let the page redirect before
  // requesting one. Counting first also handles an empty inbox on later pages.
  if ((page - 1) * 15 >= total) return { notifications: [], total };
  const { data, error } = await db
    .from("notifications")
    .select("*")
    .eq("recipient_id", user.id)
    .order("published_at", { ascending: false })
    .order("id", { ascending: false })
    .range((page - 1) * 15, page * 15 - 1);
  if (error)
    throw new Error(
      "Your notifications could not be loaded. Please try again.",
    );
  return { notifications: data || [], total };
}
