// app/api/posts/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";

// GET /api/posts?feed=timeline&tag=React
export async function GET(request: NextRequest) {
    const supabase = getSupabaseServerClient();
    const { searchParams } = request.nextUrl;

    const feedType = searchParams.get("feed") || "timeline";
    const tag = searchParams.get("tag");
    const search = searchParams.get("search");
    const sortBy = searchParams.get("sortBy") || "created_at";
    const order = searchParams.get("order") || "desc";
    const postType = searchParams.get("postType");

    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // --- Base query ---
        let query = supabase
            .from("posts")
            .select(
                `
        id,
        created_at,
        content,
        title,
        tags,
        post_type,
        images,
        upvotes,
        comment_count,
        author:profiles(id, username, full_name, avatar_url),
        user_vote:votes!left(vote_type),
        post_tags(tag:tags(id, name))
      `
            )
            // ✅ FIX: This filter is crucial. It tells the join to ONLY fetch the
            // votes belonging to the currently logged-in user.
            .eq("votes.user_id", user.id)
            .order(sortBy, { ascending: order === "asc" });

        // --- Apply Feed Logic ---
        if (feedType === "relevance") {
            const { data: profile, error: profileError } = await supabase
                .from("profiles")
                .select("interests")
                .eq("id", user.id)
                .single();

            if (profileError) throw profileError;
            const userInterests = profile?.interests || [];

            if (userInterests.length > 0) {
                // Manually format the array into the string format Postgres expects: {"item1","item2"}
                const formattedInterests = `{${userInterests.join(',')}}`;
                query = query.filter('tags', 'ov', formattedInterests);
            } else {
                return NextResponse.json({ data: [] });
            }
        } else if (feedType === "merged") {
            const { data: friendIdsData, error } = await supabase.rpc("get_friend_ids", {
                user_id_input: user.id,
            });
            if (error) throw error;
            const friendIds = friendIdsData ? friendIdsData.map((item: any) => item.id) : [];
            query = friendIds.length > 0 ? query.in("author_id", friendIds) : query.eq("id", -1);
        } else if (feedType === "engaged") {
            const { data: engagedPostIdsData, error } = await supabase.rpc(
                "get_engaged_post_ids",
                { user_id_input: user.id }
            );
            if (error) throw error;
            const engagedPostIds = engagedPostIdsData ? engagedPostIdsData.map((item: any) => item.id) : [];
            query = engagedPostIds.length > 0 ? query.in("id", engagedPostIds) : query.eq("id", -1);
        }
        // TIMELINE FEED LOGIC
        else {
            if (tag) {
                query = query.contains('tags', [tag]);
            }
        }

        // --- Apply additional filters ---
        if (search) {
            query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
        }

        if (postType) {
            query = query.eq("post_type", postType);
        }

        // --- ✅ OPTIMIZATION: Efficiently Apply tag filter (if any) ---
        if (tag && feedType !== "timeline") {
            // Filter by tag name through the post_tags join for non-timeline feeds
            query = query.eq("post_tags.tag.name", tag);
        }

        // --- Execute final query ---
        const { data, error } = await query;
        if (error) throw error;

        // --- Transform data for frontend ---
        // ✅ FIX: The user_vote is now guaranteed to be an array with 0 or 1 item.
        const transformedPosts = data.map((post: any) => ({
            id: post.id,
            author: Array.isArray(post.author) ? post.author[0] : post.author,
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
        return NextResponse.json(
            { error: "Failed to fetch posts", details: error.message },
            { status: 500 }
        );
    }
}


// POST /api/posts - This function is already excellent. No changes needed.
export async function POST(request: NextRequest) {
    const supabase = getSupabaseServerClient();
    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { title, content, postType, tags, images } = await request.json();

        if (!title || !content || !postType) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        const { data: newPost, error: postError } = await supabase
            .from("posts")
            .insert({
                title,
                content,
                post_type: postType,
                tags,
                images,
                author_id: user.id,
            })
            .select("id")
            .single();

        if (postError) throw postError;

        if (tags && tags.length > 0) {
            const { data: tagData, error: tagsError } = await supabase
                .from("tags")
                .upsert(tags.map((name: string) => ({ name })), { onConflict: "name" })
                .select("id, name");

            if (tagsError) throw tagsError;

            const postTagLinks = tagData.map((tag) => ({
                post_id: newPost.id,
                tag_id: tag.id,
            }));

            const { error: linkError } = await supabase
                .from("post_tags")
                .insert(postTagLinks);
            if (linkError) throw linkError;
        }

        return NextResponse.json(
            { message: "Post created successfully", data: newPost },
            { status: 201 }
        );
    } catch (error: any) {
        console.error("Error in POST /api/posts:", error.message);
        return NextResponse.json(
            { error: "Failed to create post", details: error.message },
            { status: 500 }
        );
    }
}