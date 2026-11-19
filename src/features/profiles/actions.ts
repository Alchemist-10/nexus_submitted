"use server";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { imageType } from "@/features/community/shared";
import { profileSchema } from "./shared";
import type { ActionState } from "@/lib/validation";
export async function updateProfile(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message || "Check your profile." };
  const db = await createSupabaseServerClient();
  const { data: old, error: oldError } = await db
    .from("profiles")
    .select("avatar_path")
    .eq("id", user.id)
    .single();
  if (oldError)
    return { error: "Your profile could not be loaded. Please try again." };
  let path = form.get("useDefault") === "true" ? null : old.avatar_path;
  let uploaded: string | null = null;
  const file = form.get("photo");
  if (file instanceof File && file.size > 0) {
    if (file.size > 3 * 1024 * 1024)
      return { error: "Choose a profile photo under 3 MB." };
    const bytes = new Uint8Array(await file.arrayBuffer()),
      type = imageType(bytes);
    if (!type) return { error: "Choose a PNG, JPEG, or WebP photo." };
    path = `${user.id}/profile/${randomUUID()}.${type.extension}`;
    const { error } = await db.storage
      .from("post-images")
      .upload(path, bytes, { contentType: type.mime, upsert: false });
    if (error)
      return {
        error: "Your photo could not be uploaded. Your changes are still here.",
      };
    uploaded = path;
  }
  const { fullName, username, bio, avatarVariant } = parsed.data;
  const { error } = await db.rpc("update_public_profile", {
    p_full_name: fullName,
    p_username: username,
    p_bio: bio,
    p_avatar_variant: avatarVariant,
    p_avatar_path: path,
  });
  if (error) {
    if (uploaded) await db.storage.from("post-images").remove([uploaded]);
    return {
      error:
        error.message === "USERNAME_TAKEN"
          ? "That handle is already taken. Choose another."
          : "Your profile could not be saved. Check your details and try again.",
    };
  }
  if (old.avatar_path && old.avatar_path !== path)
    await db.storage.from("post-images").remove([old.avatar_path]);
  revalidatePath("/", "layout");
  redirect(`/profile/${user.id}?saved=1`);
}
