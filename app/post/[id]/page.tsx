// app/post/[id]/page.tsx
import React from "react";
import { notFound } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { EnhancedPostCard } from "@/components/enhanced-post-card"; // named import (matches your export)

type Params = { id: string };

export default async function Page({ params }: { params: Params }) {
  const idRaw = params.id ?? "";
  const id = decodeURIComponent(idRaw || "");

  const supabase = getSupabaseServerClient();

  try {
    // 1) Try exact username match (fast path)
    const userRes = await supabase
      .from("profiles")
      .select("id, username, full_name, bio, avatar_url")
      .eq("username", id)
      .limit(1)
      .maybeSingle();

    if (userRes.error) console.error("profiles query error:", userRes.error);
    const user: any = userRes.data ?? null;

    if (user) {
      // fetch recent posts by this user (optional)
      const postsRes = await supabase
        .from("posts")
        .select("id, title, content, created_at")
        .eq("author_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      const posts = postsRes.data ?? [];

      return (
        <div className="max-w-4xl mx-auto p-6">
          <div className="flex items-center gap-4 mb-6">
            <Avatar className="h-20 w-20">
              <AvatarImage src={user.avatar_url ?? undefined} />
              <AvatarFallback>
                {user.full_name?.split(" ").map((n: string) => n[0]).join("")}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold">{user.full_name}</h1>
              <p className="text-sm text-muted-foreground">@{user.username}</p>
              {user.bio && <p className="mt-2 text-sm">{user.bio}</p>}
            </div>
          </div>

          <h2 className="text-lg font-semibold mb-3">Recent posts</h2>
          <div className="space-y-3">
            {posts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No posts yet.</p>
            ) : (
              posts.map((p: any) => (
                <Card key={p.id} className="p-4">
                  <Link href={`/post/${p.id}`} className="block">
                    <h3 className="font-medium">{p.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">{p.content}</p>
                    <div className="text-xs text-muted-foreground mt-2">{new Date(p.created_at).toLocaleString()}</div>
                  </Link>
                </Card>
              ))
            )}
          </div>
        </div>
      );
    }

    // 2) Try tag by name
    const tagRes = await supabase
      .from("tags")
      .select("id, name, description, post_count")
      .eq("name", id)
      .limit(1)
      .maybeSingle();

    if (tagRes.error) console.error("tags query error:", tagRes.error);
    const tag: any = tagRes.data ?? null;
    if (tag) {
      return (
        <div className="max-w-3xl mx-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">#{tag.name}</h1>
              {tag.description && <p className="text-sm text-muted-foreground mt-1">{tag.description}</p>}
            </div>
            <Badge variant="outline">{tag.post_count ?? 0} posts</Badge>
          </div>

          <p className="text-sm text-muted-foreground">
            Preview of posts for this tag is not enabled in this demo. Implement a posts query for this tag if you store post-tag relations.
          </p>
        </div>
      );
    }

    // 3) Try post by id (assuming posts use id slug/uuid)
    const postRes = await supabase
      .from("posts")
      .select(
        `id,
         title,
         content,
         created_at,
         upvotes,
         images,
         post_type,
         joinable,
         tags,
         author:profiles(id, username, full_name, avatar_url)`
      )
      .eq("id", id)
      .limit(1)
      .maybeSingle();

    if (postRes.error) console.error("posts query error:", postRes.error);
    const post: any = postRes.data ?? null;
    if (post) {
      // Safely handle author field which may be an object or array
      let authorObj: any = null;
      if (post.author) {
        authorObj = Array.isArray(post.author) ? post.author[0] : post.author;
      }

      const commentsRes = await supabase
        .from("comments")
        .select("id", { count: "exact", head: false })
        .eq("post_id", id);

      const commentCount = typeof commentsRes.count === "number" ? commentsRes.count : commentsRes.data?.length ?? 0;

      let upvoteCount = typeof post.upvotes === "number" ? post.upvotes : 0;
      if (!upvoteCount) {
        const votesRes = await supabase
          .from("votes")
          .select("id", { count: "exact", head: false })
          .eq("post_id", id)
          .eq("vote", "up"); // adapt if your schema differs
        upvoteCount = typeof votesRes.count === "number" ? votesRes.count : upvoteCount;
      }

      const authorSafe = authorObj ?? { username: "unknown", full_name: "Unknown", avatar_url: "" };

      const images: string[] = Array.isArray(post.images) ? post.images : (post.images ? [String(post.images)] : []);
      const tags: string[] = Array.isArray(post.tags) ? post.tags : (post.tags ? String(post.tags).split(",").map((t: string) => t.trim()).filter(Boolean) : []);

      const enhancedProps = {
        id: post.id,
        author: {
          name: authorSafe.full_name ?? authorSafe.username,
          username: authorSafe.username,
          avatar_url: authorSafe.avatar_url ?? "",
        },
        content: post.content ?? "",
        timestamp: post.created_at ? new Date(post.created_at).toLocaleString() : "",
        upvotes: upvoteCount ?? 0,
        commentCount: commentCount ?? 0,
        tags,
        isUpvoted: false,
        isDownvoted: false,
        images,
        postType: post.post_type ?? "Misc",
        title: post.title ?? "",
        joinable: Boolean(post.joinable ?? false),
      };

      return (
        <div className="max-w-3xl mx-auto p-6">
          <EnhancedPostCard {...enhancedProps} />
        </div>
      );
    }

    // 4) Try case-insensitive username fallback:
    const idLower = id.toLowerCase();
    const userRes2 = await supabase
      .from("profiles")
      .select("id, username, full_name, bio, avatar_url")
      .eq("username", idLower)
      .limit(1)
      .maybeSingle();

    if (!userRes2.error && userRes2.data) {
      const user2: any = userRes2.data;
      return (
        <div className="max-w-4xl mx-auto p-6">
          <div className="flex items-center gap-4 mb-6">
            <Avatar className="h-20 w-20">
              <AvatarImage src={user2.avatar_url ?? undefined} />
              <AvatarFallback>{user2.full_name?.split(" ").map((n: string) => n[0]).join("")}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold">{user2.full_name}</h1>
              <p className="text-sm text-muted-foreground">@{user2.username}</p>
              {user2.bio && <p className="mt-2 text-sm">{user2.bio}</p>}
            </div>
          </div>
          <p className="text-sm text-muted-foreground">No recent posts preview in this fallback.</p>
        </div>
      );
    }

    // Nothing matched
    notFound();
  } catch (err) {
    console.error("Error resolving id page:", err);
    notFound();
  }
}
