import Link from "next/link";
import { SessionRefresh } from "@/components/session-refresh";
import { EndSessionForm } from "@/components/end-session-form";
import { RateMentorForm } from "@/components/rate-mentor-form";
import { ArrowUpRight, CalendarDays, Video } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { loadMyBookings } from "@/features/bookings/queries";
import { ActionForm } from "@/components/action-form";
import { TimeRange } from "@/components/time-range";
import { cancelBooking, saveMeeting } from "@/features/bookings/actions";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const user = await requireUser();
  const { bookings, profiles, ratings, requestTime } = await loadMyBookings();
  const { notice } = await searchParams;
  return (
    <div className="shell page-space">
      <div className="section-heading">
        <div>
          <span className="eyebrow">YOUR CONNECTIONS</span>
          <h1>Room to grow.</h1>
          <p className="lead">Your introductions, all in one place.</p>
        </div>
        <Link className="button secondary" href="/mentors">
          Find a mentor <ArrowUpRight size={16} />
        </Link>
      </div>
      <SessionRefresh active={bookings.some((b) => b.status === "confirmed")} />
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
      {bookings.length ? (
        <div className="bookings-grid">
          {bookings.map((booking) => {
            const rating = ratings.find((r) => r.booking_id === booking.id);
            const isMentor = booking.mentor_id === user.id;
            const otherId = isMentor ? booking.learner_id : booking.mentor_id;
            const otherName =
              profiles?.find((profile) => profile.id === otherId)?.full_name ||
              "Nexus member";
            const future = new Date(booking.starts_at).getTime() > requestTime;
            const ended = new Date(booking.ends_at).getTime() <= requestTime;
            const started = !future;
            return (
              <article className="panel booking-card" key={booking.id}>
                <div className="booking-card-top">
                  <span className="eyebrow">
                    {isMentor ? "YOU ARE MENTORING" : "YOUR INTRODUCTION"}
                  </span>
                  <span className={`badge ${booking.status}`}>
                    {booking.status}
                  </span>
                </div>
                <h2>{otherName}</h2>
                {booking.source_post_id && (
                  <Link
                    className="text-link booking-context"
                    href={`/posts/${booking.source_post_id}`}
                  >
                    View the learning request for this call{" "}
                    <ArrowUpRight size={14} />
                  </Link>
                )}
                <TimeRange start={booking.starts_at} end={booking.ends_at} />
                <p className="muted">
                  <Video size={15} /> Free introductory video call
                </p>
                {booking.status === "completed" &&
                  (rating ? (
                    <p className="saved-session-rating">
                      {isMentor ? "Student rating" : "You rated this session"}:{" "}
                      <strong>{rating.score} / 5 stars</strong>
                    </p>
                  ) : !isMentor && started ? (
                    <RateMentorForm bookingId={booking.id} />
                  ) : null)}
                {booking.status === "confirmed" && (
                  <>
                    <Link
                      className="button secondary"
                      href={`/bookings/${booking.id}/join`}
                    >
                      Meeting access <ArrowUpRight size={16} />
                    </Link>
                    {isMentor && !ended && (
                      <details>
                        <summary>Add or replace meeting link</summary>
                        <ActionForm
                          action={saveMeeting}
                          submitLabel="Save privately"
                        >
                          <input
                            name="bookingId"
                            value={booking.id}
                            type="hidden"
                          />
                          <label>
                            HTTPS meeting URL
                            <input
                              name="joinUrl"
                              type="url"
                              placeholder="https://meet.google.com/…"
                              maxLength={1000}
                              required
                            />
                          </label>
                        </ActionForm>
                      </details>
                    )}
                    {future && (
                      <details>
                        <summary>Cancel this introduction</summary>
                        <p className="muted">
                          The free introduction and slot become available again.
                        </p>
                        <ActionForm
                          action={cancelBooking}
                          submitLabel="Confirm cancellation"
                          secondary
                        >
                          <input
                            name="bookingId"
                            value={booking.id}
                            type="hidden"
                          />
                        </ActionForm>
                      </details>
                    )}
                    {started &&
                      (isMentor ? (
                        <EndSessionForm bookingId={booking.id} />
                      ) : (
                        <p className="muted">
                          When your call is finished, ask your mentor to end
                          this session in Nexus. Your rating will appear here.
                        </p>
                      ))}
                  </>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="empty-state">
          <CalendarDays size={30} />
          <h2>Your first conversation starts here.</h2>
          <p>
            Find a mentor and book an introductory call at a time that works for
            you.
          </p>
          <Link className="button" href="/mentors">
            Explore mentors <ArrowUpRight size={16} />
          </Link>
        </div>
      )}
    </div>
  );
}
