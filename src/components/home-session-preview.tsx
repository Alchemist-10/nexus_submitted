import Link from "next/link";
import { ArrowUpRight, CalendarDays, Video } from "lucide-react";
import { loadMyBookings } from "@/features/bookings/queries";
import { TimeRange, SessionDateTile } from "@/components/time-range";

export async function HomeSessionPreview({ userId }: { userId: string }) {
  let data;
  try {
    data = await loadMyBookings();
  } catch {
    return (
      <Link className="next-session-card" href="/dashboard">
        <CalendarDays size={21} aria-hidden="true" />
        <span className="eyebrow">YOUR SESSIONS</span>
        <h2>Check your next call.</h2>
        <p>Session preview is unavailable. Open My sessions to try again.</p>
        <span className="text-link">
          My sessions <ArrowUpRight size={16} />
        </span>
      </Link>
    );
  }
  const next = data.bookings
    .filter(
      (b) =>
        b.status === "confirmed" && Date.parse(b.ends_at) > data.requestTime,
    )
    .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at))[0];
  const otherId =
    next && (next.mentor_id === userId ? next.learner_id : next.mentor_id);
  const person = data.profiles?.find((p) => p.id === otherId);
  return (
    <Link className="next-session-card" href={next ? "/dashboard" : "/mentors"}>
      <div className="next-session-top">
        <span className="eyebrow">
          {next ? "NEXT ON YOUR CALENDAR" : "A GOOD PLACE TO START"}
        </span>
        <span className="next-session-icon">
          <Video size={18} aria-hidden="true" />
        </span>
      </div>
      {next && <SessionDateTile start={next.starts_at} />}
      <h2>
        {next
          ? person?.full_name || "Your next conversation"
          : "Your first hello is free."}
      </h2>
      {next ? (
        <>
          <TimeRange start={next.starts_at} end={next.ends_at} />
          <span className="badge confirmed">Confirmed</span>
        </>
      ) : (
        <p>
          Try one introductory call with each mentor. Find someone who gets
          where you’re stuck.
        </p>
      )}
      <span className="text-link">
        {next ? "View session" : "Find your mentor"}
        <ArrowUpRight size={16} aria-hidden="true" />
      </span>
    </Link>
  );
}
