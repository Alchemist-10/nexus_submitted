export const sessionViews = ["upcoming", "pending", "history"] as const;
export type SessionView = (typeof sessionViews)[number];

export function sessionView(
  booking: { status: string; ends_at: string },
  payment: { state: string } | undefined,
  now: number,
): SessionView {
  if (
    booking.status === "awaiting_payment" ||
    payment?.state === "refund_pending" ||
    payment?.state === "action_required"
  )
    return "pending";
  if (
    booking.status === "confirmed" &&
    new Date(booking.ends_at).getTime() > now
  )
    return "upcoming";
  return "history";
}
