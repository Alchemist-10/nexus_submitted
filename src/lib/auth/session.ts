import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { isConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/validation";

export const currentUser = cache(async () => {
  if (!isConfigured()) return null;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) return null;
  return user;
});

export async function requireUser(next = "/dashboard") {
  if (!isConfigured()) redirect("/setup");
  const user = await currentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(safeNext(next))}`);
  return user;
}
