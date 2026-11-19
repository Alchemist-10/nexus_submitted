import "server-only";
import { cache } from "react";
import { currentUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loadMentorRatings } from "@/features/mentorship/ratings";
import type { PostSummary, AnswerSummary } from "@/features/community/database";
export const currentProfile = cache(async () => {
  const user = await currentUser();
  if (!user) return null;
  const db = await createSupabaseServerClient();
  const { data, error } = await db
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw new Error("Your profile could not be loaded.");
  return data;
});
export async function publicProfiles(ids: string[]) {
  if (!ids.length) return [];
  const db = await createSupabaseServerClient();
  const { data, error } = await db
    .from("profiles")
    .select("*")
    .in("id", [...new Set(ids)]);
  if (error) throw new Error("Member profiles could not be loaded.");
  return data || [];
}
export async function loadMember(id: string, tab: string, page: number) {
  const db = await createSupabaseServerClient();
  const [
    { data: profile, error: pe },
    { data: stats, error: se },
    { data: mentor, error: me },
  ] = await Promise.all([
    db.from("profiles").select("*").eq("id", id).maybeSingle(),
    db
      .from("member_activity_counts")
      .select("*")
      .eq("profile_id", id)
      .maybeSingle(),
    db
      .from("mentor_profiles")
      .select("*")
      .eq("user_id", id)
      .eq("is_listed", true)
      .maybeSingle(),
  ]);
  if (pe || se || me)
    throw new Error("This member profile could not be loaded.");
  if (!profile) return null;
  const { data: posts, error: postError } =
    tab === "posts"
      ? await db
          .from("community_post_summaries")
          .select("*")
          .eq("author_id", id)
          .order("created_at", { ascending: false })
          .range((page - 1) * 15, page * 15)
      : { data: [], error: null };
  const { data: answers, error: answerError } =
    tab === "answers"
      ? await db
          .from("community_answer_summaries")
          .select("*")
          .eq("author_id", id)
          .order("created_at", { ascending: false })
          .range((page - 1) * 15, page * 15)
      : { data: [], error: null };
  if (postError || answerError)
    throw new Error("This member's activity could not be loaded.");
  const answerPosts = answers?.length
    ? await db
        .from("community_posts")
        .select("id,title")
        .in(
          "id",
          answers.map((a) => a.post_id!),
        )
    : { data: [], error: null };
  if (answerPosts.error) throw new Error("Answer context could not be loaded.");
  const [rating] = mentor ? await loadMentorRatings([id]) : [];
  return {
    profile,
    stats,
    mentor,
    rating,
    posts: ((posts || []) as PostSummary[]).slice(0, 15),
    answers: ((answers || []) as AnswerSummary[]).slice(0, 15),
    answerPosts: answerPosts.data || [],
    hasMore: (tab === "answers" ? answers : posts)!.length > 15,
  };
}
