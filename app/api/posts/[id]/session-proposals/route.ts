// app/api/posts/[id]/session-proposals/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = getSupabaseServerClient();
  try {
    const postId = params.id;
    const { data: proposals, error } = await supabase
      .from("session_proposals")
      .select(`
        id,
        post_id,
        proposer_id,
        mode,
        selected_dates,
        selected_time_slots,
        chosen_location,
        status,
        created_at,
        updated_at,
        proposer:profiles!inner(id, username, full_name, avatar_url)
      `)
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return NextResponse.json({ data: proposals });
  } catch (err: any) {
    console.error("GET /session-proposals error:", err);
    return NextResponse.json({ error: "Failed to fetch session proposals", details: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = getSupabaseServerClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const postId = params.id;
    const body = await request.json();
    const { mode, selectedDates, selectedTimeSlots, chosenLocation } = body;

    if (!mode || !Array.isArray(selectedDates) || selectedDates.length === 0 || !Array.isArray(selectedTimeSlots) || selectedTimeSlots.length === 0) {
      return NextResponse.json({ error: "Invalid payload. Provide mode, selectedDates and selectedTimeSlots." }, { status: 400 });
    }

    const insertPayload = {
      post_id: postId,
      proposer_id: user.id,
      mode,
      selected_dates: selectedDates,
      selected_time_slots: selectedTimeSlots,
      chosen_location: chosenLocation ?? null,
      status: "pending",
    };

    const { data: newProposal, error } = await supabase
      .from("session_proposals")
      .insert(insertPayload)
      .select('*')
      .single();

    if (error) throw error;

    // notify post author
    const { data: postRow } = await supabase.from("posts").select("author_id, title").eq("id", postId).single();
    if (postRow?.author_id) {
      await supabase.from("notifications").insert({
        recipient_id: postRow.author_id,
        sender_id: user.id,
        type: "proposal_created",
        payload: { post_id: postId, proposal_id: newProposal.id, proposer_id: user.id, title: postRow.title },
      });
    }

    return NextResponse.json({ data: newProposal }, { status: 201 });
  } catch (err: any) {
    console.error("POST /session-proposals error:", err);
    return NextResponse.json({ error: "Failed to create proposal", details: err.message }, { status: 500 });
  }
}
