import "server-only";
import { publicProfiles } from "@/features/profiles/queries";
import { loadMentorRatings } from "@/features/mentorship/ratings";
import type { PostSummary, AnswerSummary } from "./database";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isConfigured } from "@/lib/env";
import { categories, topics } from "./shared";

export async function loadFeed(filters: {
  sort?: string;
  category?: string;
  topic?: string;
  q?: string;
  page?: string;
}) {
  if (!isConfigured()) return { posts: [], hasMore: false, unavailable: false };
  const db = await createSupabaseServerClient();
  let query = db.from("community_post_summaries").select("*");
  if (filters.category && filters.category in categories)
    query = query.eq("category", filters.category);
  if (filters.topic && filters.topic in topics)
    query = query.contains("tags", [filters.topic]);
  // Escape LIKE syntax; never interpolate a PostgREST OR expression.
  if (filters.q?.trim())
    query = query.ilike(
      "title",
      `%${filters.q
        .trim()
        .slice(0, 100)
        .replace(/[\\%_]/g, "\\$&")}%`,
    );
  if (filters.sort === "unanswered") query = query.eq("answer_count", 0);
  if (filters.sort === "top")
    query = query.order("upvotes", { ascending: false });
  const page = Math.max(
    1,
    Math.min(100, Math.trunc(Number(filters.page)) || 1),
  );
  const { data, error } = await query
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range((page - 1) * 15, page * 15);
  if (error) {
    if (error.code === "PGRST205" || error.code === "42P01")
      return { posts: [], hasMore: false, unavailable: true };
    throw new Error("The community could not be loaded. Please try again.");
  }
  return {
    posts: ((data || []) as PostSummary[]).slice(0, 15),
    hasMore: (data || []).length > 15,
    unavailable: false,
  };
}
export async function loadPost(id: string, userId?: string) {
  const db = await createSupabaseServerClient();
  const { data: rawPost, error } = await db
    .from("community_post_summaries")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("This learning request could not be loaded.");
  if (!rawPost) return null;
  const post = rawPost as PostSummary;
  const [
    { data: answers, error: ae },
    { data: mentors, error: me },
    { data: votes, error: ve },
  ] = await Promise.all([
    db
      .from("community_answer_summaries")
      .select("*")
      .eq("post_id", id)
      .order("upvotes", { ascending: false })
      .order("created_at")
      .limit(100),
    db.rpc("recommend_post_mentors", { p_post_id: id }),
    userId
      ? db
          .from("community_votes")
          .select("post_id,answer_id")
          .eq("voter_id", userId)
          .limit(1000)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (ae || me || ve)
    throw new Error(
      "Answers or mentors could not be loaded. Please try again.",
    );
  const mentorProfiles = await publicProfiles(
    (mentors || []).map((m) => m.mentor_id),
  );
  const ratings = await loadMentorRatings(
    (mentors || []).map((m) => m.mentor_id),
  );
  const ordered = [...((answers || []) as AnswerSummary[])].sort(
    (a, b) =>
      Number(b.id === post.accepted_answer_id) -
      Number(a.id === post.accepted_answer_id),
  );
  return {
    post,
    answers: ordered,
    mentors: (mentors || []).map((m) => ({
      ...m,
      profile: mentorProfiles.find((p) => p.id === m.mentor_id),
      rating: ratings.find((r) => r.mentor_id === m.mentor_id),
    })),
    votes: votes || [],
    imageUrls: post.image_paths.map(
      (path) =>
        db.storage.from("post-images").getPublicUrl(path).data.publicUrl,
    ),
  };
}
