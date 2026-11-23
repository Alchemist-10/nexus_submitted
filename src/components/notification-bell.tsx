import Link from "next/link";
import { Bell } from "lucide-react";
import { unreadNotificationCount } from "@/features/notifications/queries";

export async function NotificationBell() {
  const count = await unreadNotificationCount();
  return (
    <Link
      href="/notifications"
      className="notification-bell"
      aria-label={
        count === null
          ? "Notifications; unread count unavailable"
          : `Notifications${count ? `, ${count} unread` : ", no unread messages"}`
      }
    >
      <Bell size={18} aria-hidden="true" />
      {count !== null && count > 0 && (
        <span className="notification-count" aria-hidden="true">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
