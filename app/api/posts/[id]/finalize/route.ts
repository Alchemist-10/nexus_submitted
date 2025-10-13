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

    // Build parsed intervals from proposals
    const proposalIntervals = (proposals || [])
      .map((p: any) => {
        const date = (p.selected_dates && p.selected_dates[0]) || null;
        const slot =
          (p.selected_time_slots && p.selected_time_slots[0]) || null;
        const parsed = date && slot ? parseSlot(date, slot) : null;
        return { type: "proposal", proposal: p, parsed };
      })
      .filter((it: any) => it.parsed !== null);

    // Also include existing sessions for this post so re-finalize considers them
    const { data: existingSessions } = await supabase
      .from("sessions")
      .select("*")
      .eq("post_id", postId);
    const sessionIntervals = (existingSessions || [])
      .map((s: any) => {
        const start = s.scheduled_at ? new Date(s.scheduled_at) : null;
        const duration = s.duration_minutes || 60;
        const parsed = start
          ? {
              start,
              end: new Date(start.getTime() + duration * 60000),
              duration,
            }
          : null;
        return { type: "session", session: s, parsed };
      })
      .filter((it: any) => it.parsed !== null);

    const intervals = [...proposalIntervals, ...sessionIntervals];

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
      const idForEvent =
        it.type === "proposal"
          ? (it as any).proposal.id
          : (it as any).session?.id || "";
      events.push({
        time: it.parsed.start.getTime(),
        delta: 1,
        proposalId: idForEvent,
      });
      events.push({
        time: it.parsed.end.getTime(),
        delta: -1,
        proposalId: idForEvent,
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

    // Determine which intervals overlap the chosen time
    const overlapping = intervals.filter(
      (it: any) =>
        it.parsed &&
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

    // For overlapping intervals, create or update sessions
    const scheduled_at_iso = new Date(maxTime).toISOString();
    for (const it of overlapping) {
      if (it.type === "proposal") {
        const p = (it as any).proposal;
        // Check if a session already exists for this proposal
        const existing = (existingSessions || []).find(
          (s: any) => s.proposal_id === p.id || s.proposer_id === p.proposer_id
        );
        if (existing) {
          // update existing
          const { error: uErr } = await supabase
            .from("sessions")
            .update({ scheduled_at: scheduled_at_iso, duration_minutes })
            .eq("id", existing.id);
          if (uErr) console.warn("Failed to update session", existing.id, uErr);
          else {
            const { data: updated } = await supabase
              .from("sessions")
              .select("*")
              .eq("id", existing.id)
              .single();
            if (updated) createdSessions.push(updated);
          }
        } else {
          // create new session
          const { data: session, error: sErr } = await supabase
            .from("sessions")
            .insert({
              post_id: postId,
              proposal_id: p.id,
              author_id: post.author_id,
              proposer_id: p.proposer_id,
              scheduled_at: scheduled_at_iso,
              duration_minutes,
              mode: p.mode,
              location: p.chosen_location,
            })
            .select("*")
            .single();
          if (sErr) {
            console.warn("Failed to create session for proposal", p.id, sErr);
          } else {
            createdSessions.push(session);
          }
        }
        await supabase
          .from("session_proposals")
          .update({ status: "accepted", updated_at: new Date().toISOString() })
          .eq("id", p.id);
      } else if (it.type === "session") {
        // update existing session schedule to new finalized time
        const s = (it as any).session;
        const { error: uErr } = await supabase
          .from("sessions")
          .update({ scheduled_at: scheduled_at_iso, duration_minutes })
          .eq("id", s.id);
        if (uErr) console.warn("Failed to update session", s.id, uErr);
        else {
          const { data: updated } = await supabase
            .from("sessions")
            .select("*")
            .eq("id", s.id)
            .single();
          if (updated) createdSessions.push(updated);
        }
      }
    }

    // Mark other proposals as rejected
    const acceptedIds = overlapping
      .filter((it: any) => it.type === "proposal")
      .map((it: any) => it.proposal.id);
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
    const proposersToNotify = new Map<string, { proposalId?: string }>();
    for (const p of proposals || []) {
      proposersToNotify.set(p.proposer_id, { proposalId: p.id });
    }
    // also include existing sessions' proposers
    for (const s of existingSessions || []) {
      if (!proposersToNotify.has(s.proposer_id))
        proposersToNotify.set(s.proposer_id, {});
    }
    for (const [proposerId, meta] of proposersToNotify.entries()) {
      const isAccepted = acceptedIds.some((id: string) => {
        const it = overlapping.find(
          (o: any) => o.type === "proposal" && (o as any).proposal.id === id
        );
        return !!it && (it as any).proposal.proposer_id === proposerId;
      });
      await supabase.from("notifications").insert({
        recipient_id: proposerId,
        sender_id: user.id,
        type: "session_finalized",
        payload: {
          post_id: postId,
          proposal_id: meta.proposalId || null,
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
