// app/api/comments/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";

// GET /api/comments?postId=... - Get all comments for a post
export async function GET(request: NextRequest) {
    const supabase = getSupabaseServerClient();
    const { searchParams } = request.nextUrl;
    const postId = searchParams.get("postId");

    if (!postId) {
        return NextResponse.json({ error: "postId is required" }, { status: 400 });
    }

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get comments with author info and the current user's vote status
        const { data: comments, error } = await supabase
            .from("comments")
            .select(
                `
                id, content, upvotes, created_at,
                author:profiles(id, username, full_name, avatar_url),
                user_vote:votes!left(vote_type, user_id)
            `
            )
            .eq("post_id", postId)
            .order("created_at", { ascending: true });

        if (error) throw error;

        // Transform comments data to the shape the frontend expects
        const transformedComments = comments.map((comment: any) => {
            // Filter the votes array to only include the current user's vote
            const userVote = comment.user_vote.find((v: any) => v.user_id === user.id);
            return {
                id: comment.id,
                content: comment.content,
                upvotes: comment.upvotes,
                timestamp: new Date(comment.created_at).toLocaleString(),
                author: {
                    name: comment.author?.full_name || 'Unknown',
                    username: comment.author?.username || 'unknown',
                    avatar_url: comment.author?.avatar_url || null
                },
                isUpvoted: userVote?.vote_type === 'up',
                isDownvoted: userVote?.vote_type === 'down'
            };
        });

        return NextResponse.json({ data: transformedComments });

    } catch (error: any) {
        console.error("Error in GET /api/comments:", error.message);
        return NextResponse.json({ error: "Internal server error", details: error.message }, { status: 500 });
    }
}


// POST /api/comments - Create a new comment
export async function POST(request: NextRequest) {
    const supabase = getSupabaseServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { postId, content } = await request.json();
        if (!postId || !content) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Create the comment and fetch its details in one go
        const { data: newComment, error } = await supabase
            .from("comments")
            .insert({
                post_id: postId,
                content,
                author_id: user.id,
            })
            .select(
                `
                *,
                author:profiles(id, username, full_name, avatar_url)
            `
            )
            .single();

        if (error) throw error;

        // ✅ FIX: Removed manual comment_count update.
        // The database trigger you created handles this automatically and more reliably.

        // Transform response to match the frontend's expected shape
        const response = {
            id: newComment.id,
            content: newComment.content,
            upvotes: newComment.upvotes,
            timestamp: new Date(newComment.created_at).toLocaleString(),
            author: {
                name: newComment.author?.full_name || 'Unknown',
                username: newComment.author?.username || 'unknown',
                avatar_url: newComment.author?.avatar_url || null
            },
            isUpvoted: false, // A new comment by the user cannot be voted on by them yet
            isDownvoted: false
        };

        return NextResponse.json(response, { status: 201 });

    } catch (error: any) {
        console.error("Error in POST /api/comments:", error.message);
        return NextResponse.json({ error: "Failed to create comment", details: error.message }, { status: 500 });
    }
}