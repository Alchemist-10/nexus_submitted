import { z } from "zod";

export type ActionState = { error?: string; success?: string };
export const idSchema = z.uuid();
export const signInSchema = z.object({
  email: z.email().max(254),
  password: z.string().min(1).max(128),
});
export const signUpSchema = signInSchema.extend({
  fullName: z.string().trim().min(2, "Enter your name.").max(80),
  password: z.string().min(12, "Use at least 12 characters.").max(128),
});
export const mentorSchema = z.object({
  headline: z.string().trim().min(5).max(120),
  bio: z.string().trim().max(1500),
  expertise: z.array(z.string().trim().min(1).max(40)).min(1).max(8),
});
export const slotSchema = z
  .object({
    startsAt: z.iso.datetime({ offset: true }),
    endsAt: z.iso.datetime({ offset: true }),
  })
  .superRefine(({ startsAt, endsAt }, ctx) => {
    const duration = Date.parse(endsAt) - Date.parse(startsAt);
    if (duration < 15 * 60_000 || duration > 120 * 60_000) {
      ctx.addIssue({
        code: "custom",
        message: "Sessions must last between 15 minutes and two hours.",
      });
    }
  });
export const bookingSchema = z.object({
  slotId: idSchema,
  requestKey: idSchema,
});
export const ratingSchema = z.object({
  bookingId: idSchema,
  score: z.coerce
    .number()
    .int()
    .min(1, "Choose 1–5 stars.")
    .max(5, "Choose 1–5 stars."),
});
export const meetingSchema = z.object({
  bookingId: idSchema,
  joinUrl: z
    .url()
    .max(1000)
    .refine((value) => {
      const url = new URL(value);
      return url.protocol === "https:" && !url.username && !url.password;
    }, "Use an HTTPS meeting URL without embedded credentials."),
});

export function safeNext(value: unknown): string {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\r\n]/.test(value)
  )
    return "/dashboard";
  try {
    const url = new URL(value, "https://nexus.invalid");
    return url.origin === "https://nexus.invalid"
      ? url.pathname + url.search
      : "/dashboard";
  } catch {
    return "/dashboard";
  }
}

const databaseMessages: Record<string, string> = {
  INVALID_RATING: "Choose 1–5 stars.",
  RATING_NOT_READY:
    "You can rate this mentor once the session has ended and is marked complete.",
  RATING_ALREADY_SUBMITTED:
    "You have already rated this session. Submitted ratings cannot be changed.",
  POST_UNAVAILABLE:
    "This learning request is no longer available. Book from the mentor directory instead.",
  AUTH_REQUIRED: "Please sign in to continue.",
  TRIAL_UNAVAILABLE:
    "You already have a confirmed or completed free introduction with this mentor.",
  SLOT_UNAVAILABLE:
    "This slot is no longer available. Please choose another time.",
  SCHEDULE_CONFLICT:
    "This time overlaps an existing session or availability slot.",
  SELF_BOOKING: "Choose another mentor to book an introduction.",
  REQUEST_KEY_REUSED:
    "This request belongs to a different slot. Refresh and try again.",
  NOT_ALLOWED: "You do not have permission to do that.",
  CANNOT_CANCEL:
    "Only confirmed sessions that have not started can be cancelled.",
  CANNOT_COMPLETE: "A confirmed session can be completed after its end time.",
  SLOT_HAS_BOOKING: "Cancel the confirmed booking before closing this slot.",
  INVALID_SLOT: "Choose a future slot within 90 days, lasting 15–120 minutes.",
  MENTOR_REQUIRED: "Publish your mentor profile before adding availability.",
  OUTSIDE_JOIN_WINDOW:
    "Meeting access opens 15 minutes before the session and closes 15 minutes after it ends.",
  MEETING_NOT_READY: "Your mentor has not added the meeting link yet.",
  INVALID_STATE: "This session can no longer be changed.",
  INVALID_MEETING_URL: "Enter a valid HTTPS meeting URL.",
};
export function databaseError(message: string): string {
  return (
    databaseMessages[message] ||
    "We could not complete that request. Please try again."
  );
}
