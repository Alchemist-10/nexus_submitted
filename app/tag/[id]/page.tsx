// app/tag/[id]/page.tsx
import React from "react";
import { notFound } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Props = { params: { id: string } };

export default async function TagPage({ params }: Props) {
  const raw = params.id ?? "";
  const tagName = decodeURIComponent(raw);
  const supabase = getSupabaseServerClient();

  try {
    const tagRes = await supabase
      .from("tags")
      .select("id, name, description, post_count")
      .eq("name", tagName)
      .limit(1)
      .maybeSingle();

    if (tagRes.error) {
      console.error("Error fetching tag:", tagRes.error);
      return notFound();
    }
    const tag: any = tagRes.data ?? null;
    if (!tag) return notFound();

    // First try posts where tags array contains tagName (Postgres text[] column)
    let postsRes = await supabase
      .from("posts")
      .select("id, title, content, created_at")
      .contains("tags", [tagName])
      .order("created_at", { ascending: false })
      .limit(20);

    // If that yields no results (or errors), try fallback to ilike on string-based tags
    if (postsRes.error || !(postsRes.data && postsRes.data.length)) {
      postsRes = await supabase
        .from("posts")
        .select("id, title, content, created_at")
        .ilike("tags", `%${tagName}%`)
        .order("created_at", { ascending: false })
        .limit(20);
    }

    const posts = postsRes.data ?? [];

    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">#{tag.name}</h1>
            {tag.description && <p className="text-sm text-muted-foreground mt-1">{tag.description}</p>}
          </div>
          <Badge variant="outline">{tag.post_count ?? posts.length} posts</Badge>
        </div>

        <div className="space-y-3">
          {posts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No posts found for this tag.</p>
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
  } catch (err) {
    console.error("Tag page error:", err);
    return notFound();
  }
}
