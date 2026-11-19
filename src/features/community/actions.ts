"use server";
import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { type ActionState, idSchema } from "@/lib/validation";
import { postSchema, answerSchema, imageType } from "./shared";

export async function createPost(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = postSchema.safeParse({
    ...Object.fromEntries(form),
    tags: form.getAll("tags"),
  });
  if (!parsed.success)
    return {
      error: parsed.error.issues[0]?.message || "Check your learning request.",
    };
  const files = form
    .getAll("images")
    .filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length > 3 || files.some((f) => f.size > 3 * 1024 * 1024))
    return { error: "Attach up to three images, each under 3 MB." };
  const images = [];
  for (const file of files) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const type = imageType(bytes);
    if (!type)
      return {
        error:
          "Use PNG, JPEG, or WebP images. Other file types are not supported.",
      };
    images.push({ bytes, ...type });
  }
  const db = await createSupabaseServerClient();
  const { data: existing } = await db
    .from("community_posts")
    .select("id,author_id")
    .eq("id", parsed.data.id)
    .maybeSingle();
  if (existing?.author_id === user.id) redirect(`/posts/${existing.id}`);
  const paths: string[] = [];
  try {
    for (const image of images) {
      const path = `${user.id}/${parsed.data.id}/${randomUUID()}.${image.extension}`;
      const { error } = await db.storage
        .from("post-images")
        .upload(path, image.bytes, { contentType: image.mime, upsert: false });
      if (error) throw new Error("Upload failed");
      paths.push(path);
    }
    const { id, title, body, stuckOn, category, tags } = parsed.data;
    const { error } = await db.from("community_posts").insert({
      id,
      author_id: user.id,
      title,
      body,
      stuck_on: stuckOn,
      category,
      tags: [...new Set(tags)],
      image_paths: paths,
    });
    if (error) throw new Error("Post failed");
  } catch {
    if (paths.length) await db.storage.from("post-images").remove(paths);
    return {
      error:
        "We could not publish your request. Your text is still here; please try again.",
    };
  }
  revalidatePath("/");
  redirect(`/posts/${parsed.data.id}`);
}
export async function addAnswer(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = answerSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const db = await createSupabaseServerClient();
  const { error } = await db.from("community_answers").upsert(
    {
      id: parsed.data.id,
      post_id: parsed.data.postId,
      author_id: user.id,
      body: parsed.data.body,
    },
    { onConflict: "id", ignoreDuplicates: true },
  );
  if (error)
    return { error: "Your answer could not be saved. Please try again." };
  revalidatePath("/", "layout");
  return { success: "Your explanation has been shared." };
}
export async function setVote(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const id = idSchema.safeParse(form.get("targetId"));
  const postId = idSchema.safeParse(form.get("postId"));
  if (!id.success || !postId.success)
    return { error: "Refresh and try again." };
  const column = form.get("kind") === "answer" ? "answer_id" : "post_id";
  const db = await createSupabaseServerClient();
  const { error } =
    form.get("active") === "true"
      ? await db
          .from("community_votes")
          .upsert(
            column === "post_id"
              ? { voter_id: user.id, post_id: id.data }
              : { voter_id: user.id, answer_id: id.data },
            { onConflict: `voter_id,${column}`, ignoreDuplicates: true },
          )
      : await db
          .from("community_votes")
          .delete()
          .eq("voter_id", user.id)
          .eq(column, id.data);
  if (error)
    return {
      error:
        "You cannot upvote your own contribution. Otherwise, refresh and try again.",
    };
  revalidatePath("/", "layout");
  return {};
}
export async function acceptAnswer(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  await requireUser();
  const postId = idSchema.safeParse(form.get("postId"));
  const answerId = form.get("answerId");
  if (!postId.success || (answerId && !idSchema.safeParse(answerId).success))
    return { error: "Refresh and try again." };
  const db = await createSupabaseServerClient();
  const { error } = await db.rpc("accept_community_answer", {
    p_post_id: postId.data,
    p_answer_id: answerId ? String(answerId) : null,
  });
  if (error)
    return {
      error: "Only the question author can accept an answer to this question.",
    };
  revalidatePath("/", "layout");
  return {
    success: answerId
      ? "Answer marked helpful. Mentor evidence has been updated."
      : "Accepted answer cleared.",
  };
}
export async function deleteContent(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const id = idSchema.safeParse(form.get("id"));
  if (!id.success) return { error: "Invalid request." };
  const db = await createSupabaseServerClient();
  if (form.get("kind") === "post") {
    const { data } = await db
      .from("community_posts")
      .select("image_paths")
      .eq("id", id.data)
      .eq("author_id", user.id)
      .maybeSingle();
    if (!data) return { error: "This request cannot be deleted." };
    const { error } = await db
      .from("community_posts")
      .delete()
      .eq("id", id.data)
      .eq("author_id", user.id);
    if (error) return { error: "Deletion failed. Please try again." };
    if (data.image_paths.length)
      await db.storage.from("post-images").remove(data.image_paths);
    revalidatePath("/");
    redirect("/");
  }
  const { error } = await db
    .from("community_answers")
    .delete()
    .eq("id", id.data)
    .eq("author_id", user.id);
  if (error) return { error: "Deletion failed. Please try again." };
  revalidatePath("/", "layout");
  return { success: "Answer removed." };
}
export async function reportPost(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const id = idSchema.safeParse(form.get("postId"));
  const reason = String(form.get("reason") || "").trim();
  if (!id.success || reason.length < 10 || reason.length > 500)
    return { error: "Describe the issue in 10–500 characters." };
  const db = await createSupabaseServerClient();
  const { error } = await db
    .from("community_reports")
    .upsert(
      { post_id: id.data, reporter_id: user.id, reason },
      { onConflict: "post_id,reporter_id", ignoreDuplicates: true },
    );
  return error
    ? { error: "Your report could not be saved." }
    : { success: "Report received for manual review. Thank you." };
}
