// app/api/profile/[username]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";

export async function GET(
    request: NextRequest,
    { params }: { params: { username: string } }
) {
    const supabase = getSupabaseServerClient();
    const { username } = params;

    if (!username) {
        return NextResponse.json({ error: "Username is required" }, { status: 400 });
    }

    try {
        // First, get the currently logged-in user to check connection status later
        const { data: { user: currentUser } } = await supabase.auth.getUser();

        // 1. Fetch the profile details based on the username
        const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("*")
            .eq("username", username)
            .single();

        if (profileError || !profile) {
            return NextResponse.json({ error: "Profile not found" }, { status: 404 });
        }

        // 2. Fetch all related data concurrently for performance
        const [
            { data: posts, error: postsError },
            { data: friends, error: friendsError },
            { data: connection, error: connectionError }
        ] = await Promise.all([
            // Fetch the profile's posts, including the current user's vote on them
            supabase
                .from("posts")
                .select(`*, author:profiles(*), user_vote:votes!left(vote_type)`)
                .eq("author_id", profile.id)
                .eq("votes.user_id", currentUser?.id)
                .order("created_at", { ascending: false }),

            // Fetch the profile's friends/nodes using the RPC function
            supabase.rpc('get_friend_ids', { user_id_input: profile.id }),

            // Fetch the connection status between the current user and the profile user
            currentUser && currentUser.id !== profile.id
                ? supabase
                    .from("connections")
                    .select("status")
                    .or(`and(requester_id.eq.${currentUser.id},addressee_id.eq.${profile.id}),and(requester_id.eq.${profile.id},addressee_id.eq.${currentUser.id})`)
                    .single()
                : Promise.resolve({ data: null, error: null })
        ]);

        if (postsError || friendsError || connectionError) {
            throw postsError || friendsError || connectionError;
        }

        // 3. Transform the posts data to a clean format for the frontend
        const transformedPosts = posts?.map((post: any) => ({
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
            isUpvoted: post.user_vote.some((v: any) => v.vote_type === 'up'),
            isDownvoted: post.user_vote.some((v: any) => v.vote_type === 'down'),
        })) || [];

        // 4. Assemble the final payload with all the data the UI needs
        const payload = {
            profile,
            posts: transformedPosts,
            stats: {
                nodes: friends?.length ?? 0,
                reputation: profile.reputation ?? 0,
                posts: posts?.length ?? 0,
                // You can add a query to get total upvotes received later
            },
            connectionStatus: connection?.status || 'none'
        };

        return NextResponse.json(payload);

    } catch (error: any) {
        console.error("Error fetching profile data:", error.message);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}