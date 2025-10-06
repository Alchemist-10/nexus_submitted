// app/api/posts/[id]/session-proposals/route.ts

import { NextRequest, NextResponse } from "next/server";
// Use your existing server client helper
import { getSupabaseServerClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
    // Use 'id' from params to match your folder name '[id]'
    const postId = params.id;

    // Use your existing helper to get the client and user
    const supabase = getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { mode, selectedDates, selectedTimeSlots, chosenLocation } = body;

    // Input validation
    if (!Array.isArray(selectedDates) || selectedDates.length === 0 || !Array.isArray(selectedTimeSlots) || selectedTimeSlots.length === 0) {
        return NextResponse.json({ error: "Invalid payload: Dates and time slots are required." }, { status: 400 });
    }

    try {
        // 1) Ensure the post exists and has >= 2 upvotes
        const { data: post, error: postError } = await supabase
            .from("posts")
            .select("id, author_id, upvotes")
            .eq("id", postId)
            .single();

        if (postError || !post) {
            return NextResponse.json({ error: "Post not found" }, { status: 404 });
        }
        if ((post.upvotes ?? 0) < 2) {
            return NextResponse.json({ error: "This post does not have enough upvotes to open proposals" }, { status: 403 });
        }

        // 2) Ensure the requesting user has upvoted this post
        const { data: voteCheck, error: voteErr } = await supabase
            .from("votes")
            .select("id", { count: 'exact' }) // More efficient check
            .eq("post_id", postId)
            .eq("user_id", user.id)
            .eq("vote_type", "up");

        if (voteErr) {
            return NextResponse.json({ error: "DB error checking votes", details: voteErr.message }, { status: 500 });
        }
        if (!voteCheck || voteCheck.length === 0) {
            return NextResponse.json({ error: "Only upvoters can create proposals for this post" }, { status: 403 });
        }

        // 3) Insert proposal
        const { data: proposal, error: insertErr } = await supabase
            .from("session_proposals")
            .insert({
                post_id: postId,
                proposer_id: user.id,
                mode,
                selected_dates: selectedDates,
                selected_time_slots: selectedTimeSlots,
                chosen_location: chosenLocation ?? null
            })
            .select("id") // Only select the ID to get the reference for the notification
            .single();

        if (insertErr) {
            return NextResponse.json({ error: "Could not create proposal", details: insertErr.message }, { status: 500 });
        }

        // 4) Create notification for the post author
        await supabase.from("notifications").insert({
            recipient_id: post.author_id,
            sender_id: user.id,
            type: "proposal_created",
            payload: {
                postId,
                proposalId: proposal.id,
                proposerUsername: user.user_metadata?.username || 'a user'
            }
        });

        return NextResponse.json({ message: "Proposal created successfully", proposalId: proposal.id }, { status: 201 });

    } catch (error: any) {
        console.error("Error creating session proposal:", error);
        return NextResponse.json({ error: "Internal server error", details: error.message }, { status: 500 });
    }
}
