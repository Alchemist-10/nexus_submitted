// app/api/posts/[id]/session-proposals/[proposalId]/accept/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";

export async function POST(
    req: NextRequest,
    { params }: { params: { id: string, proposalId: string } }
) {
    // Use 'id' to match your folder name '[id]'
    const postId = params.id;
    const { proposalId } = params;

    // Use your existing helper to get the client and user
    const supabase = getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { scheduled_at, duration_minutes = 60, final_location = null } = body;

    if (!scheduled_at) {
        return NextResponse.json({ error: "A specific 'scheduled_at' timestamp is required to accept a proposal." }, { status: 400 });
    }

    try {
        // 1. Ensure the post exists and the current user is the author
        const { data: post, error: postError } = await supabase
            .from("posts")
            .select("id, author_id")
            .eq("id", postId)
            .single();

        if (postError || !post) {
            return NextResponse.json({ error: "Post not found" }, { status: 404 });
        }
        if (post.author_id !== user.id) {
            return NextResponse.json({ error: "Only the post author can accept a proposal" }, { status: 403 });
        }

        // 2. Ensure the proposal exists and is still pending
        const { data: proposal, error: proposalError } = await supabase
            .from("session_proposals")
            .select("*")
            .eq("id", proposalId)
            .single();

        if (proposalError || !proposal) {
            return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
        }
        if (proposal.status !== "pending") {
            return NextResponse.json({ error: "This proposal is no longer pending and cannot be accepted." }, { status: 400 });
        }

        // --- Start Transactional Logic ---

        // 3. Create the finalized session record
        const { data: session, error: sessionErr } = await supabase
            .from("sessions")
            .insert({
                post_id: postId,
                proposal_id: proposalId,
                author_id: user.id, // The current user is the post author
                proposer_id: proposal.proposer_id,
                scheduled_at,
                duration_minutes,
                mode: proposal.mode,
                location: final_location || proposal.chosen_location
            })
            .select("id")
            .single();

        if (sessionErr) throw sessionErr;

        // 4. Atomically update the proposal status to "accepted"
        await supabase
            .from("session_proposals")
            .update({ status: "accepted", updated_at: new Date().toISOString() })
            .eq("id", proposalId);

        // 5. Create a notification for the original proposer
        await supabase.from("notifications").insert({
            recipient_id: proposal.proposer_id,
            sender_id: user.id,
            type: "proposal_accepted",
            payload: {
                postId,
                proposalId,
                sessionId: session.id,
                scheduled_at,
                final_location: final_location || proposal.chosen_location
            }
        });

        return NextResponse.json({ message: "Session scheduled successfully", session }, { status: 201 });

    } catch (error: any) {
        console.error("Error accepting proposal:", error);
        return NextResponse.json({ error: "Internal server error", details: error.message }, { status: 500 });
    }
}
