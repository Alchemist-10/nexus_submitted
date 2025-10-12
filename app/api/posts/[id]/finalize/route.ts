// app/api/posts/[id]/finalize/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";

function parseSlot(dateStr: string, slotStr: string) {
  try {
    const [startStr, endStr] = slotStr.split("-");
    const [sh, sm] = startStr.split(":").map(Number);
    const [eh, em] = endStr.split(":").map(Number);
    const start = new Date(dateStr); start.setHours(sh, sm, 0, 0);
    const end = new Date(dateStr); end.setHours(eh, em, 0, 0);
    const duration = Math.round((end.getTime()-start.getTime())/60000);
    if (isNaN(duration) || duration <= 0) return null;
    return { start, end, duration };
  } catch { return null; }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = getSupabaseServerClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const postId = params.id;
    const { data: post, error: postErr } = await supabase.from("posts").select("id, author_id, title").eq("id", postId).single();
    if (postErr || !post) throw postErr || new Error("Post not found");
    if (post.author_id !== user.id) return NextResponse.json({ error: "Only author can finalize." }, { status: 403 });

    const { data: proposals, error } = await supabase
      .from("session_proposals")
      .select("*")
      .eq("post_id", postId)
      .eq("status", "pending");
    if (error) throw error;

    const intervals = (proposals || []).map((p: any) => {
      const date = (p.selected_dates && p.selected_dates[0]) || null;
      const slot = (p.selected_time_slots && p.selected_time_slots[0]) || null;
      const parsed = date && slot ? parseSlot(date, slot) : null;
      return { proposal: p, parsed };
    }).filter((it: any) => it.parsed !== null);

    intervals.sort((a: any, b: any) => a.parsed.end.getTime() - b.parsed.end.getTime());

    const selected: any[] = [];
    let lastEnd: Date | null = null;
    for (const item of intervals) {
      if (!lastEnd || item.parsed.start >= lastEnd) {
        selected.push(item);
        lastEnd = item.parsed.end;
      }
    }

    const createdSessions: any[] = [];
    for (const item of selected) {
      const p = item.proposal;
      const scheduled_at = item.parsed.start.toISOString();
      const duration_minutes = item.parsed.duration;
      const { data: session, error: sErr } = await supabase
        .from("sessions")
        .insert({
          post_id: postId,
          proposal_id: p.id,
          author_id: post.author_id,
          proposer_id: p.proposer_id,
          scheduled_at,
          duration_minutes,
          mode: p.mode,
          location: p.chosen_location,
        })
        .select("*")
        .single();
      if (sErr) {
        console.warn("Failed to create session for proposal", p.id, sErr);
        continue;
      }
      createdSessions.push(session);
      await supabase.from("session_proposals").update({ status: "accepted", updated_at: new Date().toISOString() }).eq("id", p.id);
      await supabase.from("notifications").insert({
        recipient_id: p.proposer_id,
        sender_id: user.id,
        type: "proposal_accepted",
        payload: { post_id: postId, proposal_id: p.id, session_id: session.id },
      });
    }

    const selectedIds = selected.map((it: any) => it.proposal.id);
    await supabase
      .from("session_proposals")
      .update({ status: "rejected", updated_at: new Date().toISOString() })
      .eq("post_id", postId)
      .neq("status", "rejected")
      .not("id", "in", `(${selectedIds.map((id: string) => `'${id}'`).join(",")})`);

    return NextResponse.json({ data: { sessions: createdSessions, acceptedProposalCount: createdSessions.length } });
  } catch (err: any) {
    console.error("Finalize error:", err);
    return NextResponse.json({ error: "Failed to finalize proposals", details: err.message }, { status: 500 });
  }
}
