import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { SearchResult } from "@/lib/types";

// GET /api/search - Search across posts, users, and tags
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();
    const { searchParams } = new URL(request.url);

    const query = searchParams.get("q");
    const type = searchParams.get("type") || "all"; // 'posts', 'users', 'tags', 'all'
    const limit = parseInt(searchParams.get("limit") || "10");

    if (!query) {
      return NextResponse.json({ error: "Search query is required" }, { status: 400 });
    }

    const searchTerm = `%${query}%`;
    const results: SearchResult = {
      posts: [],
      users: [],
      tags: [],
    };

    // Search posts
    if (type === "all" || type === "posts") {
      const { data: posts, error: postsError } = await supabase
        .from("posts")
        .select(
          `
          id,
          title, 
          content,
          post_type,
          upvotes,
          comment_count,
          created_at,
          author:profiles(id, username, full_name, avatar_url, reputation)
        `
        )
        .or(`title.ilike.${searchTerm},content.ilike.${searchTerm}`)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (postsError) {
        return NextResponse.json({ error: postsError.message }, { status: 500 });
      }
      
      // ✅ FIX: Safely handle the author object and transform data
      results.posts = posts?.map(post => {
        // Supabase joins can return an array or object, this handles both cases
        const author = Array.isArray(post.author) ? post.author[0] : post.author;
        
        return {
          id: post.id,
          title: post.title,
          content: post.content,
          author: author ? {
              id: author.id,
              name: author.full_name || 'Unknown',
              username: author.username || 'unknown',
              avatar: author.avatar_url || '/placeholder.svg?height=40&width=40'
          } : {
              id: null,
              name: 'Unknown',
              username: 'unknown',
              avatar: '/placeholder.svg?height=40&width=40'
          },
          timestamp: new Date(post.created_at).toLocaleString(),
          upvotes: post.upvotes,
          commentCount: post.comment_count,
          tags: [], // Note: Simplified for search results, join was removed for clarity
          postType: post.post_type,
          images: [] 
        };
      }) || [];
    }

    // Search users
    if (type === "all" || type === "users") {
        const { data: users, error: usersError } = await supabase
            .from('profiles')
            .select('id, username, full_name, avatar_url, reputation, bio')
            .or(`username.ilike.${searchTerm},full_name.ilike.${searchTerm},bio.ilike.${searchTerm}`)
            .order('reputation', { ascending: false })
            .limit(limit)

        if (usersError) {
            return NextResponse.json({ error: usersError.message }, { status: 500 })
        }

        results.users = users || [];
    }

    // Search tags
    if (type === "all" || type === "tags") {
        const { data: tags, error: tagsError } = await supabase
            .from('tags')
            .select('id, name, description, post_count')
            .or(`name.ilike.${searchTerm},description.ilike.${searchTerm}`)
            .order('post_count', { ascending: false })
            .limit(limit)

        if (tagsError) {
            return NextResponse.json({ error: tagsError.message }, { status: 500 })
        }
        results.tags = tags || [];
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error("Internal Server Error in /api/search:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
