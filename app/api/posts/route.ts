// app/api/posts/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";

// GET /api/posts - Handles all post fetching with advanced filtering
export async function GET(request: NextRequest) {
    const supabase = getSupabaseServerClient();
    const { searchParams } = request.nextUrl;

    // --- Extract all filter parameters ---
    const feedType = searchParams.get("feed") || "timeline";
    const sortBy = searchParams.get("sortBy") || "created_at";
    const order = searchParams.get("order") || "desc";
    
    // New and updated filters that can accept multiple values
    const search = searchParams.get("search");
    const postTypes = searchParams.get("postTypes")?.split(',');
    const tags = searchParams.get("tags")?.split(',');
    const batches = searchParams.get("batches")?.split(',');
    const semesters = searchParams.get("semesters")?.split(',');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // --- Base Query ---
        // The join to profiles is now INNER to allow filtering on author properties
        let query = supabase
            .from("posts")
            .select(
                `
                id, created_at, content, title, tags, post_type, images, upvotes, comment_count,
                author:profiles!inner(id, username, full_name, avatar_url, batch, semester),
                user_vote:votes!left(vote_type, user_id)
            `
            )
            .order(sortBy, { ascending: order === "asc" });

        // --- Apply Feed Logic (runs before other filters) ---
        if (feedType === "merged") {
            const { data: friendIds } = await supabase.rpc("get_friend_ids", { user_id_input: user.id });
            if (friendIds && friendIds.length > 0) {
                query = query.in("author_id", friendIds.map((item: any) => item.id));
            } else {
                return NextResponse.json({ data: [] });
            }
        }
        // ... (other feed logic like 'relevance' and 'engaged' can be added here) ...

        // --- Apply Advanced Filters ---
        if (search) {
            query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
        }
        if (postTypes && postTypes.length > 0) {
            query = query.in("post_type", postTypes);
        }
        if (tags && tags.length > 0) {
            query = query.overlaps("tags", tags); // Use 'overlaps' for array columns
        }
        if (batches && batches.length > 0) {
            query = query.in("author.batch", batches);
        }
        if (semesters && semesters.length > 0) {
            query = query.in("author.semester", semesters);
        }
        
        // --- Execute Query ---
        const { data, error } = await query;
        if (error) throw error;
        
        // --- Transform Data ---
        const transformedPosts = data
            .map((post: any) => ({
                ...post,
                user_vote: post.user_vote.filter((v: any) => v.user_id === user.id)
            }))
            .map((post: any) => ({
                id: post.id,
                author: post.author,
                content: post.content,
                title: post.title,
                timestamp: post.created_at,
                upvotes: post.upvotes,
                commentCount: post.comment_count,
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


// POST /api/posts - This function is well-structured and requires no changes.
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

        const { data: newPost, error: postError } = await supabase
            .from("posts")
            .insert({ title, content, post_type: postType, tags, images, author_id: user.id })
            .select("id")
            .single();

        if (postError) throw postError;

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