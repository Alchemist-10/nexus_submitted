// app/api/session-proposals/[proposalId]/[action]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";

// This single POST function handles both 'accept' and 'reject'
export async function POST(
  request: NextRequest,
  { params }: { params: { proposalId: string; action: string } }
) {
  const { proposalId, action } = params;

  if (action !== 'accept' && action !== 'reject') {
    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Fetch the proposal and verify the post author
    const { data: proposal, error: pErr } = await supabase
      .from("session_proposals")
      .select("*, post:posts(author_id)")
      .eq("id", proposalId)
      .single();

    if (pErr || !proposal) {
      throw pErr || new Error("Proposal not found");
    }
    
    if (proposal.post?.author_id !== user.id) {
      return NextResponse.json({ error: "Only the post author can perform this action." }, { status: 403 });
    }

    // 2. Perform the action based on the URL parameter
    if (action === 'accept') {
      // --- ACCEPT LOGIC ---
      // This logic can be simplified from your original file, as we just need to create the session.
      const { data: createdSession, error: createErr } = await supabase
        .from("sessions")
        .insert({
          post_id: proposal.post_id,
          proposal_id: proposalId,
          author_id: proposal.post.author_id,
          proposer_id: proposal.proposer_id,
          scheduled_at: (proposal.selected_dates[0] || new Date()).toString(), // Simplified for now
          mode: proposal.mode,
          location: proposal.chosen_location,
        })
        .select("*")
        .single();
        
      if (createErr) throw createErr;

      // Update proposal status to "accepted"
      await supabase.from("session_proposals").update({ status: "accepted" }).eq("id", proposalId);

      // Notify the proposer
      await supabase.from("notifications").insert({
          recipient_id: proposal.proposer_id,
          sender_id: user.id,
          type: "proposal_accepted",
          payload: { post_id: proposal.post_id, session_id: createdSession.id },
      });
      
      return NextResponse.json({ data: createdSession });

    } else if (action === 'reject') {
      // --- REJECT LOGIC ---
      await supabase.from("session_proposals").update({ status: "rejected" }).eq("id", proposalId);

      // Notify the proposer
      await supabase.from("notifications").insert({
          recipient_id: proposal.proposer_id,
          sender_id: user.id,
          type: "proposal_rejected",
          payload: { post_id: proposal.post_id },
      });

      return NextResponse.json({ data: { success: true } });
    }
    
  } catch (err: any) {
    console.error(`Error during '${action}' action:`, err);
    return NextResponse.json({ error: `Failed to ${action} proposal`, details: err.message }, { status: 500 });
  }
}