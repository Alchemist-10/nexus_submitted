import { z } from "zod";

export const notificationKinds = [
  "booking_confirmed",
  "booking_cancelled",
  "meeting_updated",
  "session_completed",
  "reminder_24h",
  "reminder_15m",
  "missing_meeting",
] as const;
export type NotificationKind = (typeof notificationKinds)[number];
export const messageSchema = z.object({
  id: z.uuid(),
  recipientEmail: z.email().nullable(),
  bookingId: z.uuid(),
  kind: z.enum(notificationKinds),
  counterpartName: z.string().max(80),
  startsAt: z.string(),
  endsAt: z.string(),
  sessionKind: z.enum(["intro", "paid"]),
});
export type NotificationMessage = z.infer<typeof messageSchema>;
export function notificationCopy(kind: string, name: string) {
  switch (kind) {
    case "booking_confirmed":
      return {
        title: "Your session is confirmed",
        body: `Your session with ${name} is booked. Open the session for details and meeting access.`,
      };
    case "booking_cancelled":
      return {
        title: "Session cancelled",
        body: `Your session with ${name} has been cancelled. Open the session to check its latest status.`,
      };
    case "meeting_updated":
      return {
        title: "Meeting details updated",
        body: `${name} has added or updated the meeting link. Meeting access opens 15 minutes before your session.`,
      };
    case "session_completed":
      return {
        title: "How was your session?",
        body: `Your session with ${name} is complete. You can now leave your mentor a rating.`,
      };
    case "reminder_24h":
      return {
        title: "Your session is tomorrow",
        body: `A reminder about your upcoming session with ${name}. Check the time below and open the session for details.`,
      };
    case "reminder_15m":
      return {
        title: "Your session starts soon",
        body: `Your session with ${name} is coming up. Open Nexus to check meeting access.`,
      };
    case "missing_meeting":
      return {
        title: "Add your session's meeting link",
        body: `Your session with ${name} starts soon, but no meeting link has been added. Add it in your session so your student can join.`,
      };
    default:
      return {
        title: "Session update",
        body: "Open your session to check the latest details.",
      };
  }
}
export function sessionPath(bookingId: string) {
  if (!z.uuid().safeParse(bookingId).success)
    throw new Error("INVALID_BOOKING_ID");
  return `/bookings/${bookingId}`;
}
