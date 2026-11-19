import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { EndSessionForm } from "@/components/end-session-form";
import { RateMentorForm } from "@/components/rate-mentor-form";
import { ArrowUpRight, Video, Clock3 } from "lucide-react";
import { ActionForm } from "@/components/action-form";
import { TimeRange, SessionDateTile } from "@/components/time-range";
import { cancelBooking, saveMeeting } from "@/features/bookings/actions";
import { formatINR, paymentStateLabel } from "@/features/payments/shared";
import type { loadMyBookings } from "@/features/bookings/queries";
type SessionData = Awaited<ReturnType<typeof loadMyBookings>>;
export function SessionCard({
  booking,
  profiles,
  ratings,
  payments,
  requestTime,
  userId,
}: Omit<SessionData, "bookings"> & {
  booking: SessionData["bookings"][number];
  userId: string;
}) {
  const rating = ratings.find((r) => r.booking_id === booking.id);
  const payment = payments.find((p) => p.booking_id === booking.id);
  const paid = booking.kind === "paid";
  const isMentor = booking.mentor_id === userId;
  const otherId = isMentor ? booking.learner_id : booking.mentor_id;
  const person = profiles?.find((p) => p.id === otherId);
  const otherName = person?.full_name || "Nexus member";
  const paymentNeedsAttention =
    payment && ["refund_pending", "action_required"].includes(payment.state);
  const future = new Date(booking.starts_at).getTime() > requestTime;
  const ended = new Date(booking.ends_at).getTime() <= requestTime;
  const started = !future;
  return (
    <article className="panel booking-card" key={booking.id}>
      <SessionDateTile start={booking.starts_at} />
      <div className="session-card-content">
        <div className="booking-card-top">
          <span className="eyebrow">
            {isMentor ? "YOU ARE MENTORING" : "YOUR SESSION"}
          </span>
          <span className={`badge ${booking.status}`}>
            {booking.status.replaceAll("_", " ")}
          </span>
        </div>
        <div className="session-person">
          <Avatar
            id={otherId}
            name={otherName}
            path={person?.avatar_path}
            variant={person?.avatar_variant}
            size="small"
          />
          <h2>
            <Link href={`/profile/${otherId}`}>{otherName}</Link>
          </h2>
        </div>
        {booking.source_post_id && (
          <Link
            className="text-link booking-context"
            href={`/posts/${booking.source_post_id}`}
          >
            View the learning request for this call <ArrowUpRight size={14} />
          </Link>
        )}
        <TimeRange start={booking.starts_at} end={booking.ends_at} />
        <div className="session-facts">
          <span>
            <Video size={15} />{" "}
            {paid
              ? `Paid session · ${formatINR(booking.amount_paise)}`
              : "Free introduction"}
          </span>
          <span>
            <Clock3 size={15} aria-hidden="true" />
            {Math.round(
              (Date.parse(booking.ends_at) - Date.parse(booking.starts_at)) /
                60000,
            )}{" "}
            min
          </span>
        </div>
        {payment && (
          <p className="payment-status" data-state={payment.state}>
            {paymentStateLabel[payment.state]}
          </p>
        )}
        {paid && !isMentor && (
          <Link
            className={
              booking.status === "awaiting_payment" || paymentNeedsAttention
                ? "button session-primary"
                : "text-link payment-details-link"
            }
            href={`/checkout/${booking.id}`}
          >
            {booking.status === "awaiting_payment"
              ? "Resume checkout"
              : payment?.state === "refund_pending"
                ? "Track refund"
                : payment?.state === "action_required"
                  ? "Review payment"
                  : "View payment status"}{" "}
            <ArrowUpRight size={14} />
          </Link>
        )}
        {booking.status === "awaiting_payment" && (
          <details>
            <summary>Cancel checkout</summary>
            <ActionForm
              action={cancelBooking}
              submitLabel="Cancel checkout"
              secondary
            >
              <input type="hidden" name="bookingId" value={booking.id} />
            </ActionForm>
          </details>
        )}
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
            {!ended && (
              <Link
                className="button session-primary"
                href={`/bookings/${booking.id}/join`}
              >
                <Video size={16} aria-hidden="true" /> Meeting access{" "}
                <ArrowUpRight size={16} />
              </Link>
            )}
            {isMentor && !ended && (
              <details>
                <summary>Add or replace meeting link</summary>
                <ActionForm action={saveMeeting} submitLabel="Save privately">
                  <input name="bookingId" value={booking.id} type="hidden" />
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
                <summary>Cancel this session</summary>
                <p className="muted">
                  {paid
                    ? "Cancel before the start for a full refund. Processing is shown in your payment status."
                    : "The free introduction and slot become available again."}
                </p>
                <ActionForm
                  action={cancelBooking}
                  submitLabel="Confirm cancellation"
                  secondary
                >
                  <input name="bookingId" value={booking.id} type="hidden" />
                </ActionForm>
              </details>
            )}
            {started &&
              (isMentor ? (
                <EndSessionForm bookingId={booking.id} />
              ) : (
                <p className="muted">
                  When your call is finished, ask your mentor to end this
                  session in Nexus. Your rating will appear here.
                </p>
              ))}
          </>
        )}
      </div>
    </article>
  );
}
