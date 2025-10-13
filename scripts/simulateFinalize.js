// simulateFinalize.js
// Run this with: node ./scripts/simulateFinalize.js

function parseSlot(dateStr, slotStr) {
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
  } catch (e) {
    return null;
  }
}

function formatTimeISO(dt) {
  return new Date(dt).toISOString();
}

function simulateFinalize({
  proposals,
  existingSessions,
  postId,
  authorId,
  userId,
}) {
  // Build intervals
  const proposalIntervals = (proposals || [])
    .map((p) => {
      const date = (p.selected_dates && p.selected_dates[0]) || null;
      const slot = (p.selected_time_slots && p.selected_time_slots[0]) || null;
      const parsed = date && slot ? parseSlot(date, slot) : null;
      return { type: "proposal", proposal: p, parsed };
    })
    .filter((it) => it.parsed !== null);

  const sessionIntervals = (existingSessions || [])
    .map((s) => {
      const start = s.scheduled_at ? new Date(s.scheduled_at) : null;
      const duration = s.duration_minutes || 60;
      const parsed = start
        ? { start, end: new Date(start.getTime() + duration * 60000), duration }
        : null;
      return { type: "session", session: s, parsed };
    })
    .filter((it) => it.parsed !== null);

  const intervals = [...proposalIntervals, ...sessionIntervals];
  if (intervals.length === 0) return { sessions: [], notifications: [] };

  // events
  const events = [];
  for (const it of intervals) {
    events.push({
      time: it.parsed.start.getTime(),
      delta: 1,
      id: it.type === "proposal" ? it.proposal.id : it.session.id,
      type: it.type,
    });
    events.push({
      time: it.parsed.end.getTime(),
      delta: -1,
      id: it.type === "proposal" ? it.proposal.id : it.session.id,
      type: it.type,
    });
  }
  events.sort((a, b) => a.time - b.time || b.delta - a.delta);

  let active = 0,
    maxActive = 0,
    maxTime = events[0].time;
  for (const ev of events) {
    active += ev.delta;
    if (active > maxActive) {
      maxActive = active;
      maxTime = ev.time;
    }
  }
  const maxDate = new Date(maxTime);

  const overlapping = intervals.filter(
    (it) =>
      it.parsed.start.getTime() <= maxTime && it.parsed.end.getTime() > maxTime
  );
  const minEnd = new Date(
    Math.min(...overlapping.map((it) => it.parsed.end.getTime()))
  );
  let duration_minutes = Math.round(
    (minEnd.getTime() - maxDate.getTime()) / 60000
  );
  if (!duration_minutes || duration_minutes <= 0) duration_minutes = 60;

  const scheduledISO = formatTimeISO(maxTime);

  // Simulate creating/updating sessions
  const createdOrUpdatedSessions = [];
  const createdIds = [];
  for (const it of overlapping) {
    if (it.type === "proposal") {
      const p = it.proposal;
      // simulate lookup: check existingSessions by proposer_id
      const existing = (existingSessions || []).find(
        (s) => s.proposal_id === p.id || s.proposer_id === p.proposer_id
      );
      if (existing) {
        // update
        const updated = {
          ...existing,
          scheduled_at: scheduledISO,
          duration_minutes,
        };
        createdOrUpdatedSessions.push({ action: "updated", session: updated });
      } else {
        const newSession = {
          id: "s-" + p.id,
          post_id: postId,
          proposal_id: p.id,
          author_id: authorId,
          proposer_id: p.proposer_id,
          scheduled_at: scheduledISO,
          duration_minutes,
          mode: p.mode,
          location: p.chosen_location,
        };
        createdOrUpdatedSessions.push({
          action: "created",
          session: newSession,
        });
        createdIds.push(newSession.id);
      }
    } else if (it.type === "session") {
      const s = it.session;
      const updated = { ...s, scheduled_at: scheduledISO, duration_minutes };
      createdOrUpdatedSessions.push({ action: "updated", session: updated });
    }
  }

  // Mark proposals rejected: those not in overlapping proposals
  const acceptedProposalIds = overlapping
    .filter((it) => it.type === "proposal")
    .map((it) => it.proposal.id);

  // Notifications: all proposers + existing session proposers
  const proposers = new Map();
  for (const p of proposals || [])
    proposers.set(p.proposer_id, { proposalId: p.id });
  for (const s of existingSessions || [])
    if (!proposers.has(s.proposer_id)) proposers.set(s.proposer_id, {});

  const notifications = [];
  for (const [proposerId, meta] of proposers.entries()) {
    const isAccepted = acceptedProposalIds.some((id) => {
      const it = overlapping.find(
        (o) => o.type === "proposal" && o.proposal.id === id
      );
      return !!it && it.proposal.proposer_id === proposerId;
    });
    const payload = {
      post_id: postId,
      proposal_id: meta.proposalId || null,
      scheduled_at: scheduledISO,
      accepted: isAccepted,
    };
    notifications.push({
      recipient_id: proposerId,
      sender_id: userId,
      type: "session_finalized",
      payload,
    });
  }

  const response = {
    sessions: createdOrUpdatedSessions,
    acceptedProposalCount: createdOrUpdatedSessions.filter(
      (s) => s.action === "created" || s.action === "updated"
    ).length,
    scheduled_at: scheduledISO,
  };
  return { response, notifications };
}

// Mocked data example
const proposals = [
  {
    id: "p1",
    proposer_id: "u1",
    selected_dates: ["2025-10-20"],
    selected_time_slots: ["10:00-11:30"],
    mode: "online",
    chosen_location: null,
  },
  {
    id: "p2",
    proposer_id: "u2",
    selected_dates: ["2025-10-20"],
    selected_time_slots: ["10:30-12:00"],
    mode: "online",
    chosen_location: null,
  },
  {
    id: "p3",
    proposer_id: "u3",
    selected_dates: ["2025-10-20"],
    selected_time_slots: ["11:00-12:00"],
    mode: "online",
    chosen_location: null,
  },
];

const existingSessions = [
  {
    id: "s-existing-1",
    post_id: "post-123",
    proposal_id: "p-old",
    proposer_id: "u4",
    scheduled_at: "2025-10-20T10:45:00.000Z",
    duration_minutes: 30,
  },
];

const out = simulateFinalize({
  proposals,
  existingSessions,
  postId: "post-123",
  authorId: "author-1",
  userId: "author-1",
});
console.log("=== Simulated Finalize Response ===");
console.log(JSON.stringify(out.response, null, 2));
console.log("\n=== Simulated Notifications (to be inserted) ===");
console.log(JSON.stringify(out.notifications, null, 2));

// Print human-friendly time for button
const scheduled = new Date(out.response.scheduled_at);
const hours = scheduled.getHours();
const minutes = scheduled.getMinutes();
const ampm = hours >= 12 ? "PM" : "AM";
const h12 = ((hours + 11) % 12) + 1;
const mm = minutes.toString().padStart(2, "0");
console.log(`\nJoin Meet button should show: ${h12}:${mm} ${ampm}`);
