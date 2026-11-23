import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell, BellRing, ArrowUpRight, CheckCheck } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import {
  loadNotifications,
  unreadNotificationCount,
} from "@/features/notifications/queries";
import { notificationCopy, sessionPath } from "@/features/notifications/shared";
import { markNotificationsRead } from "@/features/notifications/actions";
import { ActionForm } from "@/components/action-form";
import { TimeRange } from "@/components/time-range";
import { InboxRefresh } from "@/components/inbox-refresh";

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireUser("/notifications");
  const { page: requested } = await searchParams;
  const parsed = Number(requested || 1);
  const page =
    Number.isInteger(parsed) && parsed > 0 && parsed <= 10000 ? parsed : 1;
  const [{ notifications, total }, unread] = await Promise.all([
    loadNotifications(page),
    unreadNotificationCount(),
  ]);
  const pages = Math.max(1, Math.ceil(total / 15));
  if (page > pages) redirect(`/notifications?page=${pages}`);
  return (
    <div className="shell page-space inbox-page">
      <div className="section-heading workspace-heading">
        <div>
          <span className="eyebrow">YOUR CONVERSATIONS, KEPT IN SYNC</span>
          <h1>
            Your inbox<span className="heading-dot">.</span>
          </h1>
          <p className="lead">
            Booking updates, meeting details and a nudge before your next call.
          </p>
        </div>
        <span className="inbox-emblem" aria-hidden="true">
          <BellRing size={30} />
        </span>
      </div>
      <div className="inbox-toolbar">
        <p>
          <strong>{unread === null ? "—" : unread}</strong> unread{" "}
          <span className="muted">/ {total} updates</span>
        </p>
        <div>
          <InboxRefresh />
          {Boolean(unread) && (
            <ActionForm
              action={markNotificationsRead}
              submitLabel="Mark all as read"
              secondary
              className="inbox-read-form"
            >
              <input type="hidden" name="notificationId" value="all" />
            </ActionForm>
          )}
        </div>
      </div>
      {notifications.length ? (
        <ol className="notification-list" aria-label="Your notifications">
          {notifications.map((n) => {
            const copy = notificationCopy(n.kind, n.counterpart_name);
            return (
              <li
                className={`notification-entry ${n.read_at ? "is-read" : "is-unread"}`}
                key={n.id}
              >
                <span className="notification-entry-icon" aria-hidden="true">
                  {n.read_at ? <CheckCheck size={20} /> : <Bell size={20} />}
                </span>
                <div className="notification-entry-content">
                  <span className="eyebrow">
                    {n.read_at ? "READ" : "UNREAD"} ·{" "}
                    {n.kind.startsWith("reminder")
                      ? "REMINDER"
                      : "SESSION UPDATE"}
                  </span>
                  <h2>
                    <Link href={sessionPath(n.booking_id)}>{copy.title}</Link>
                  </h2>
                  <p>{copy.body}</p>
                  <TimeRange start={n.starts_at} end={n.ends_at} />
                  <div className="notification-entry-actions">
                    <Link
                      className="text-link"
                      href={sessionPath(n.booking_id)}
                    >
                      Open session <ArrowUpRight size={15} aria-hidden="true" />
                    </Link>
                    {!n.read_at && (
                      <ActionForm
                        action={markNotificationsRead}
                        submitLabel="Mark as read"
                        secondary
                        className="inbox-read-form"
                      >
                        <input
                          type="hidden"
                          name="notificationId"
                          value={n.id}
                        />
                      </ActionForm>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <div className="inbox-empty panel">
          <Bell size={32} aria-hidden="true" />
          <h2>A little quiet, for now.</h2>
          <p>Your new booking updates and reminders will appear here.</p>
          <Link className="button" href="/mentors">
            Find a mentor <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </div>
      )}
      {pages > 1 && (
        <nav className="inbox-pagination" aria-label="Notification pages">
          {page > 1 ? (
            <Link
              className="text-link"
              href={`/notifications?page=${page - 1}`}
            >
              ← Newer
            </Link>
          ) : (
            <span />
          )}
          <span>
            Page {page} of {pages}
          </span>
          {page < pages ? (
            <Link
              className="text-link"
              href={`/notifications?page=${page + 1}`}
            >
              Older →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
      <p className="muted inbox-footnote">
        Booking updates and reminders are private to your account. Open a
        session for its latest details.
      </p>
    </div>
  );
}
