import type { Database } from "@/lib/database.types";
export type Post = Database["public"]["Tables"]["community_posts"]["Row"];
export type Answer = Database["public"]["Tables"]["community_answers"]["Row"];
// PostgreSQL view introspection marks expressions nullable. The underlying
// inner joins, NOT NULL columns, counts, and EXISTS enforce these contracts.
export type PostSummary = Post & {
  author_name: string;
  upvotes: number;
  answer_count: number;
};
export type AnswerSummary = Answer & {
  author_name: string;
  upvotes: number;
  is_mentor: boolean;
};
export type RecommendedMentor =
  Database["public"]["Functions"]["recommend_post_mentors"]["Returns"][number];
