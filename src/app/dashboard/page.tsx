import Link from "next/link";
import {
  ArrowUpRight,
  CalendarDays,
  Clock3,
  CheckCircle2,
  Compass,
} from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { loadMyBookings } from "@/features/bookings/queries";
import { SessionRefresh } from "@/components/session-refresh";
import { SessionCard } from "@/components/session-card";
import {
  sessionView,
  sessionViews,
  type SessionView,
} from "@/features/bookings/presentation";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; view?: string }>;
}) {
  const user = await requireUser();
  const data = await loadMyBookings();
  const { bookings, payments, requestTime } = data;
  const { notice, view: requestedView } = await searchParams;
  const view: SessionView = sessionViews.includes(requestedView as SessionView)
    ? (requestedView as SessionView)
    : "upcoming";
  const counts = { upcoming: 0, pending: 0, history: 0 };
  const grouped = bookings.map((booking) => ({
    booking,
    view: sessionView(
      booking,
      payments.find((p) => p.booking_id === booking.id),
      requestTime,
    ),
  }));
  for (const item of grouped) counts[item.view]++;
  const visible = grouped
    .filter((item) => item.view === view)
    .map((item) => item.booking)
    .sort((a, b) =>
      view === "history"
        ? Date.parse(b.starts_at) - Date.parse(a.starts_at)
        : Date.parse(a.starts_at) - Date.parse(b.starts_at),
    );
  const views = [
    { id: "upcoming", label: "Upcoming", icon: CalendarDays },
    { id: "pending", label: "Pending", icon: Clock3 },
    { id: "history", label: "History", icon: CheckCircle2 },
  ] as const;
  return (
    <div className="shell page-space sessions-page workspace-page">
      <div className="section-heading workspace-heading">
        <div>
          <span className="eyebrow">
            <span className="status-dot" /> YOUR MENTORSHIP WORKSPACE
          </span>
          <h1>
            My sessions<span className="heading-dot">.</span>
          </h1>
          <p className="lead">Make time for your next breakthrough.</p>
        </div>
        <Link className="button" href="/mentors">
          <Compass size={17} aria-hidden="true" /> Find a mentor
        </Link>
      </div>
      <div
        className="session-overview"
        role="group"
        aria-label="Session overview"
      >
        {views.map(({ id, label, icon: Icon }) => (
          <Link
            href={`/dashboard?view=${id}`}
            key={id}
            className={`overview-tile ${id}`}
          >
            <span className="overview-icon">
              <Icon size={20} aria-hidden="true" />
            </span>
            <div>
              <strong>{counts[id]}</strong>
              <span>
                {label === "Pending"
                  ? "Need attention"
                  : label === "History"
                    ? "Past sessions"
                    : "Coming up"}
              </span>
            </div>
            <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        ))}
      </div>
      {notice === "booked" && (
        <p className="feedback success" role="status">
          Your free introduction is confirmed. Your mentor can now add a private
          meeting link.
        </p>
      )}
      {notice === "signout-error" && (
        <p className="feedback error">
          Sign-out could not be completed. Please try again.
        </p>
      )}
      <div className="session-toolbar">
        <nav className="session-tabs" aria-label="Session views">
          {views.map(({ id, label }) => (
            <Link
              key={id}
              href={`/dashboard?view=${id}`}
              aria-current={view === id ? "page" : undefined}
            >
              {label}
              <span>{counts[id]}</span>
            </Link>
          ))}
        </nav>
        <SessionRefresh
          active={
            bookings.some((b) =>
              ["confirmed", "awaiting_payment"].includes(b.status),
            ) || payments.some((p) => p.state === "refund_pending")
          }
        />
      </div>
      {bookings.length >= 100 && (
        <p className="muted">Showing your latest 100 sessions.</p>
      )}
      {view === "history" && visible.some((b) => b.status === "confirmed") && (
        <p className="history-note">
          A call’s scheduled time has passed. The mentor still needs to mark it
          complete before it can be rated.
        </p>
      )}
      {visible.length ? (
        <div className="bookings-grid">
          {visible.map((booking) => (
            <SessionCard
              key={booking.id}
              booking={booking}
              userId={user.id}
              {...data}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state session-empty">
          <span className="empty-icon">
            <CalendarDays size={26} aria-hidden="true" />
          </span>
          <h2>
            {view === "upcoming"
              ? "Your next conversation is waiting."
              : view === "pending"
                ? "You’re all caught up."
                : "Your journey starts here."}
          </h2>
          <p>
            {view === "upcoming"
              ? "Find someone who can help you move forward. Your first introduction with each mentor is free."
              : view === "pending"
                ? "There are no checkouts or payments needing your attention."
                : "Completed, cancelled and expired sessions will appear here."}
          </p>
          <Link
            className="button secondary"
            href={view === "pending" ? "/dashboard" : "/mentors"}
          >
            {view === "pending" ? "View upcoming sessions" : "Explore mentors"}
            <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </div>
      )}
      <p className="session-footnote">
        <CalendarDays size={15} aria-hidden="true" /> First call with each
        mentor is free. Follow-ups are paid after your introduction is
        completed.
      </p>
    </div>
  );
}
