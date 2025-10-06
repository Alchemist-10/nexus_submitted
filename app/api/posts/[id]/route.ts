// app/api/posts/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";

// GET /api/posts - Handles all post fetching with advanced filtering
export async function GET(request: NextRequest) {
    const supabase = getSupabaseServerClient();
    const { searchParams } = request.nextUrl;

    // Extract all potential query parameters
    const feedType = searchParams.get("feed") || "timeline";
    const tag = searchParams.get("tag");
    const search = searchParams.get("search");
    const sortBy = searchParams.get("sortBy") || "created_at";
    const order = searchParams.get("order") || "desc";
    const postType = searchParams.get("postType");

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // --- Base Query ---
        // This is the foundation for all post fetches.
        let query = supabase
            .from("posts")
            .select(
                `
                id, created_at, content, title, tags, post_type, images, upvotes, comment_count,
                author:profiles(id, username, full_name, avatar_url),
                user_vote:votes!left(vote_type),
                post_tags!inner(tag:tags!inner(id, name))
            `
            )
            .eq("votes.user_id", user.id) // Crucial: Only get the current user's vote
            .order(sortBy, { ascending: order === "asc" });

        // --- Apply Feed Logic ---
        if (feedType === "relevance") {
            const { data: profile } = await supabase.from("profiles").select("interests").eq("id", user.id).single();
            const interests = profile?.interests || [];
            if (interests.length > 0) {
                query = query.overlaps("tags", interests); // Uses the simple text array for this specific feed
            } else {
                return NextResponse.json({ data: [] });
            }
        } else if (feedType === "merged") {
            const { data: friendIds } = await supabase.rpc("get_friend_ids", { user_id_input: user.id });
            if (friendIds && friendIds.length > 0) {
                query = query.in("author_id", friendIds.map((item: any) => item.id));
            } else {
                return NextResponse.json({ data: [] });
            }
        } else if (feedType === "engaged") {
            const { data: postIds } = await supabase.rpc("get_engaged_post_ids", { user_id_input: user.id });
            if (postIds && postIds.length > 0) {
                query = query.in("id", postIds.map((item: any) => item.id));
            } else {
                return NextResponse.json({ data: [] });
            }
        }

        // --- Apply Additional Filters ---
        if (search) {
            query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
        }
        if (postType) {
            query = query.eq("post_type", postType);
        }
        if (tag) {
            // ✅ CORRECTED: This now correctly filters using the join table.
            query = query.eq("post_tags.tag.name", tag);
        }

        // --- Execute Query ---
        const { data, error } = await query;
        if (error) throw error;

        // --- Transform Data for Frontend ---
        const transformedPosts = data.map((post: any) => ({
            id: post.id,
            author: Array.isArray(post.author) ? post.author[0] : post.author,
            content: post.content,
            title: post.title,
            timestamp: post.created_at,
            upvotes: post.upvotes,
            commentCount: post.comment_count,
            // We use the simple `tags` array for display, but filter using the join table
            tags: post.tags || [],
            postType: post.post_type,
            images: post.images || [],
            isUpvoted: post.user_vote.length > 0 && post.user_vote[0].vote_type === 'up',
            isDownvoted: post.user_vote.length > 0 && post.user_vote[0].vote_type === 'down',
        }));

        return NextResponse.json({ data: transformedPosts });

    } catch (error: any) {
        console.error("Error in GET /api/posts:", error.message);
        return NextResponse.json({ error: "Failed to fetch posts", details: error.message }, { status: 500 });
    }
}

// POST /api/posts - This function is excellent and requires no changes.
export async function POST(request: NextRequest) {
    const supabase = getSupabaseServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { title, content, postType, tags, images } = await request.json();
        if (!title || !content || !postType) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // 1. Create the post, including the simple `tags` array for display and relevance matching
        const { data: newPost, error: postError } = await supabase
            .from("posts")
            .insert({ title, content, post_type: postType, tags, images, author_id: user.id })
            .select("id")
            .single();

        if (postError) throw postError;

        // 2. Efficiently link tags in the join tables for advanced filtering
        if (tags && tags.length > 0) {
            const { data: tagData } = await supabase
                .from("tags")
                .upsert(tags.map((name: string) => ({ name })), { onConflict: "name" })
                .select("id, name");

            const postTagLinks = tagData!.map((tag) => ({
                post_id: newPost.id,
                tag_id: tag.id,
            }));
            await supabase.from("post_tags").insert(postTagLinks);
        }

        return NextResponse.json({ message: "Post created successfully", data: newPost }, { status: 201 });

    } catch (error: any) {
        console.error("Error in POST /api/posts:", error.message);
        return NextResponse.json({ error: "Failed to create post", details: error.message }, { status: 500 });
    }
}