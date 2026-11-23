"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { idSchema, type ActionState } from "@/lib/validation";

export async function markNotificationsRead(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  await requireUser("/notifications");
  const id = form.get("notificationId");
  if (id !== "all" && !idSchema.safeParse(id).success)
    return { error: "Refresh your inbox and try again." };
  const db = await createSupabaseServerClient();
  const { error } = await db.rpc(
    "mark_notifications_read",
    id === "all" ? {} : { p_id: String(id) },
  );
  if (error)
    return { error: "We could not mark this as read. Please try again." };
  revalidatePath("/", "layout");
  return {
    success:
      id === "all" ? "All notifications marked as read." : "Marked as read.",
  };
}
