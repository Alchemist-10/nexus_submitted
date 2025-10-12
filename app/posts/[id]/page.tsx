// app/posts/[id]/page.tsx
import React from "react";
import { notFound } from "next/navigation";
import { apiClient } from "@/lib/api"; // your centralized API client
import { EnhancedPostCard } from "@/components/enhanced-post-card";
import { Post } from "@/lib/types";
import { CommentSection } from "@/components/comment-section";

type PageProps = {
  params: { id: string };
};

async function getPostData(id: string): Promise<any | null> {
  try {
    const response = await apiClient.getPost(id);

    // Support multiple possible shapes:
    // 1) response.data (common API client wrapper)
    // 2) response.data.data (your Next route returns { data: transformedPost })
    // 3) response (fallback)
    if (!response) return null;
    if (response.data && response.data.data) return response.data.data;
    if (response.data) return response.data;
    return response;
  } catch (error) {
    console.error(`Failed to fetch post with ID ${id}:`, error);
    return null;
  }
}

export default async function PostPage({ params }: PageProps) {
  const postId = decodeURIComponent(params.id || "");

  if (!postId) {
    notFound();
  }

  const post = await getPostData(postId);

  if (!post) {
    notFound();
  }

  // Defensive helpers to handle both snake_case and camelCase responses
  const createdAt = post.timestamp ?? post.created_at ?? post.createdAt;
  const commentCount = post.commentCount ?? post.comment_count ?? post.comments_count ?? 0;
  const authorRaw = post.author ?? post.author_profile ?? post.author_id ?? null;
  const upvotes = post.upvotes ?? post.upvote_count ?? 0;
  const tagsRaw = post.tags ?? post.tag_list ?? post.tagNames ?? [];
  const images = post.images ?? [];

  const author = authorRaw
    ? {
        name: authorRaw.full_name ?? authorRaw.name ?? "Unknown User",
        username: authorRaw.username ?? authorRaw.handle ?? "unknown",
        avatar: authorRaw.avatar_url ?? authorRaw.avatar ?? "",
      }
    : { name: "Unknown User", username: "unknown", avatar: "" };

  const normalizedTags = Array.isArray(tagsRaw)
    ? tagsRaw.map((t: any) => (typeof t === "string" ? t : t.name ?? t.tag ?? String(t)))
    : [];

  // The API may already provide booleans; if not, handle string flags
  const isUpvoted =
    typeof post.isUpvoted === "boolean"
      ? post.isUpvoted
      : (post.user_vote === "up" || post.user_vote?.[0]?.vote_type === "up") ?? false;
  const isDownvoted =
    typeof post.isDownvoted === "boolean"
      ? post.isDownvoted
      : (post.user_vote === "down" || post.user_vote?.[0]?.vote_type === "down") ?? false;

  const cardProps = {
    id: post.id ?? postId,
    content: post.content ?? "",
    title: post.title ?? "",
    author,
    timestamp: createdAt ? new Date(createdAt).toLocaleString() : "",
    upvotes,
    commentCount,
    tags: normalizedTags,
    isUpvoted,
    isDownvoted,
    images,
    postType: post.postType ?? post.post_type ?? post.type ?? "post",
  };

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6">
      <EnhancedPostCard {...cardProps} />
      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4 border-b pb-2">Comments</h2>
        <CommentSection postId={cardProps.id} />
      </div>
    </div>
  );
}
