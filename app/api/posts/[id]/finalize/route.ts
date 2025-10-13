// app/api/posts/[id]/finalize/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";

function parseSlot(dateStr: string, slotStr: string) {
  try {
    const [startStr, endStr] = slotStr.split("-");
    const [sh, sm] = startStr.split(":").map(Number);
    const [eh, em] = endStr.split(":").map(Number);
    const start = new Date(dateStr);
    start.setHours(sh, sm, 0, 0);
    const end = new Date(dateStr);
    end.setHours(eh, em, 0, 0);
    const duration = Math.round((end.getTime() - start.getTime()) / 60000);
    if (isNaN(duration) || duration <= 0) return null;
    return { start, end, duration };
  } catch {
    return null;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const postId = params.id;
    const { data: post, error: postErr } = await supabase
      .from("posts")
      .select("id, author_id, title")
      .eq("id", postId)
      .single();
    if (postErr || !post) throw postErr || new Error("Post not found");
    if (post.author_id !== user.id)
      return NextResponse.json(
        { error: "Only author can finalize." },
        { status: 403 }
      );

    const { data: proposals, error } = await supabase
      .from("session_proposals")
      .select("*")
      .eq("post_id", postId)
      .eq("status", "pending");
    if (error) throw error;

    // Build parsed intervals for proposals
    const intervals = (proposals || [])
      .map((p: any) => {
        const date = (p.selected_dates && p.selected_dates[0]) || null;
        const slot =
          (p.selected_time_slots && p.selected_time_slots[0]) || null;
        const parsed = date && slot ? parseSlot(date, slot) : null;
        return { proposal: p, parsed };
      })
      .filter((it: any) => it.parsed !== null);

    if (intervals.length === 0) {
      return NextResponse.json({
        data: { sessions: [], acceptedProposalCount: 0 },
      });
    }

    // Sweep-line to find time with maximum overlap
    type Event = { time: number; delta: number; proposalId: string };
    const events: Event[] = [];
    for (const it of intervals) {
      if (!it.parsed) continue;
      events.push({
        time: it.parsed.start.getTime(),
        delta: 1,
        proposalId: it.proposal.id,
      });
      events.push({
        time: it.parsed.end.getTime(),
        delta: -1,
        proposalId: it.proposal.id,
      });
    }
    // sort by time, with start events before end events at same timestamp
    events.sort((a, b) => a.time - b.time || b.delta - a.delta);

    let active = 0;
    let maxActive = 0;
    let maxTime = events[0].time;
    for (const ev of events) {
      active += ev.delta;
      if (active > maxActive) {
        maxActive = active;
        maxTime = ev.time;
      }
    }

    const maxDate = new Date(maxTime);

    // Determine which proposals overlap the chosen time
    const overlapping = intervals.filter(
      (it: any) =>
        it.parsed.start.getTime() <= maxTime &&
        it.parsed.end.getTime() > maxTime
    );

    // Determine end of common overlap window (minimum end among overlapping intervals)
    const minEnd = new Date(
      Math.min(...overlapping.map((it: any) => it.parsed.end.getTime()))
    );
    let duration_minutes = Math.round(
      (minEnd.getTime() - maxDate.getTime()) / 60000
    );
    if (!duration_minutes || duration_minutes <= 0) duration_minutes = 60; // fallback

    const createdSessions: any[] = [];

    // Create a session for each overlapping proposal (so each proposer has a session record)
    for (const it of overlapping) {
      const p = it.proposal;
      const scheduled_at = new Date(maxTime).toISOString();
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
      await supabase
        .from("session_proposals")
        .update({ status: "accepted", updated_at: new Date().toISOString() })
        .eq("id", p.id);
    }

    // Mark other proposals as rejected
    const acceptedIds = overlapping.map((it: any) => it.proposal.id);
    await supabase
      .from("session_proposals")
      .update({ status: "rejected", updated_at: new Date().toISOString() })
      .eq("post_id", postId)
      .neq("status", "rejected")
      .not(
        "id",
        "in",
        `(${acceptedIds.map((id: string) => `'${id}'`).join(",")})`
      );

    // Send notification about finalized time to everyone who clicked Join (all proposers)
    const scheduledISO = new Date(maxTime).toISOString();
    for (const p of proposals || []) {
      const isAccepted = acceptedIds.includes(p.id);
      await supabase.from("notifications").insert({
        recipient_id: p.proposer_id,
        sender_id: user.id,
        type: "session_finalized",
        payload: {
          post_id: postId,
          proposal_id: p.id,
          scheduled_at: scheduledISO,
          accepted: isAccepted,
        },
      });
    }

    return NextResponse.json({
      data: {
        sessions: createdSessions,
        acceptedProposalCount: createdSessions.length,
        scheduled_at: new Date(maxTime).toISOString(),
      },
    });
  } catch (err: any) {
    console.error("Finalize error:", err);
    return NextResponse.json(
      { error: "Failed to finalize proposals", details: err.message },
      { status: 500 }
    );
  }
}
