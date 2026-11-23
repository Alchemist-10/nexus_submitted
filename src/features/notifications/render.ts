import {
  notificationCopy,
  sessionPath,
  type NotificationMessage,
} from "./shared";

export function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
}
export function renderNotification(
  message: NotificationMessage,
  origin: string,
) {
  const url = new URL(origin);
  if (
    url.protocol !== "https:" &&
    !(
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1"].includes(url.hostname)
    )
  )
    throw new Error("INVALID_NOTIFICATION_ORIGIN");
  const copy = notificationCopy(message.kind, message.counterpartName);
  const time = new Intl.DateTimeFormat("en-GB", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "UTC",
  });
  const when = `${time.format(new Date(message.startsAt))} – ${new Intl.DateTimeFormat("en-GB", { timeStyle: "short", timeZone: "UTC" }).format(new Date(message.endsAt))} UTC`;
  const href = new URL(sessionPath(message.bookingId), url.origin).href;
  const mode =
    message.sessionKind === "paid"
      ? "Razorpay test-mode booking — no real charge."
      : "Free introductory session.";
  const text = `${copy.title}\n\n${copy.body}\n\n${when}\n${mode}\n\nOpen your session: ${href}\n\nTimes above are UTC. Nexus shows your local timezone when you open the session.\nYour session page always shows the latest status.`;
  const html = `<!doctype html><html lang="en"><meta charset="utf-8"><title>${escapeHtml(copy.title)}</title><body style="font-family:Arial,sans-serif;background:#f7f3eb;color:#30252a;padding:24px"><main style="max-width:560px;margin:auto"><p style="color:#742d43;font-size:22px;font-family:Georgia,serif">nexus.</p><h1 style="font-family:Georgia,serif">${escapeHtml(copy.title)}</h1><p>${escapeHtml(copy.body)}</p><p><strong>${escapeHtml(when)}</strong></p><p>${escapeHtml(mode)}</p><p><a href="${escapeHtml(href)}" style="color:#742d43">Open your session →</a></p><p>Times above are UTC. Nexus shows your local timezone when you open the session.</p><p>Your session page always shows the latest status.</p></main></body></html>`;
  return { subject: copy.title, text, html };
}
