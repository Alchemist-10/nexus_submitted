import Link from "next/link";
import { loadSessionBooking } from "@/features/bookings/queries";
import { notFound } from "next/navigation";
import { ArrowUpRight, Video } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { idSchema, databaseError, meetingSchema } from "@/lib/validation";
import { RateMentorForm } from "@/components/rate-mentor-form";
import { EndSessionForm } from "@/components/end-session-form";
import { SessionRefresh } from "@/components/session-refresh";
import { TimeRange } from "@/components/time-range";
export default async function JoinPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();
  const db = await createSupabaseServerClient();
  const { booking, requestTime } = await loadSessionBooking(id);
  if (!booking) notFound();
  const isMentor = booking.mentor_id === user.id;
  const started = new Date(booking.starts_at).getTime() <= requestTime;
  const completed = booking.status === "completed";
  const { data: rating, error: ratingError } = completed
    ? await db
        .from("mentor_ratings")
        .select("score")
        .eq("booking_id", id)
        .maybeSingle()
    : { data: null, error: null };
  if (ratingError) throw new Error("Your rating could not be loaded.");
  const { data: url, error } =
    booking.status === "confirmed"
      ? await db.rpc("get_booking_join_url", { p_booking_id: id })
      : { data: null, error: null };
  const valid = url
    ? meetingSchema.safeParse({ bookingId: id, joinUrl: url }).success
    : false;
  return (
    <div className="shell narrow page-space">
      <div className="panel join-panel">
        <Video size={32} />
        <span className="eyebrow">YOUR SESSION</span>
        <h1>
          {completed
            ? "Session complete."
            : booking.status === "cancelled"
              ? "Session cancelled."
              : "A conversation away."}
        </h1>
        <TimeRange start={booking.starts_at} end={booking.ends_at} />
        <SessionRefresh active={booking.status === "confirmed"} />
        {completed ? (
          <>
            <p className="lead">
              This Nexus session has ended. Joining is no longer available.
            </p>
            {rating ? (
              <p className="saved-session-rating">
                {isMentor ? "Student rating" : "You rated this session"}:{" "}
                <strong>{rating.score} / 5 stars</strong>
              </p>
            ) : isMentor ? (
              <p className="feedback">The student can now rate this session.</p>
            ) : (
              <RateMentorForm bookingId={id} />
            )}
          </>
        ) : booking.status === "cancelled" ? (
          <p className="feedback">
            This booking was cancelled. Its meeting link is no longer available
            in Nexus.
          </p>
        ) : (
          <>
            {error || !valid ? (
              <p className="feedback">
                {databaseError(error?.message || "MEETING_NOT_READY")}
              </p>
            ) : (
              <>
                <p className="lead">
                  Your meeting opens in a new tab. Return here after your call.
                </p>
                <a
                  className="button"
                  href={`/bookings/${id}/launch`}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  Join video call <ArrowUpRight size={18} />
                </a>
              </>
            )}
            {started ? (
              isMentor ? (
                <EndSessionForm bookingId={id} />
              ) : (
                <p className="feedback">
                  Finished your call? Ask your mentor to click End session in
                  Nexus. Your rating will appear here automatically.
                </p>
              )
            ) : (
              <p className="muted">
                Access opens 15 minutes before your call. The mentor can end the
                session once its scheduled start has passed.
              </p>
            )}
            <p className="muted">
              Leaving Google Meet does not end this Nexus session. The Google
              Meet host must end the meeting for everyone separately.
            </p>
          </>
        )}
        <Link className="text-link" href="/dashboard">
          Back to your sessions
        </Link>
      </div>
    </div>
  );
}
