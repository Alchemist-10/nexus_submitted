import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { idSchema } from "@/lib/validation";
import { loadCheckout } from "@/features/payments/queries";
import { paymentConfigured } from "@/features/payments/server";
import { PaymentCheckout } from "@/components/payment-checkout";
import { TimeRange } from "@/components/time-range";

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser(),
    { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();
  const detail = await loadCheckout(id, user.id);
  if (!detail) notFound();
  const { booking, mentor, payment, requestTime } = detail;
  return (
    <div className="shell page-space checkout-shell">
      <Link className="text-link" href="/dashboard">
        <ArrowLeft size={16} /> My sessions
      </Link>
      <div className="detail-grid">
        <section className="panel">
          <span className="eyebrow">YOUR FOLLOW-UP</span>
          <h1>A little more clarity.</h1>
          <h2>
            <Link href={`/mentors/${mentor.id}`}>{mentor.full_name}</Link>
          </h2>
          <TimeRange start={booking.starts_at} end={booking.ends_at} />
          <p>
            {Math.round(
              (Date.parse(booking.ends_at) - Date.parse(booking.starts_at)) /
                60000,
            )}{" "}
            minute video session
          </p>
          <p>
            Your free introduction with this mentor is complete. This booking is
            a paid follow-up.
          </p>
          {booking.source_post_id && (
            <Link
              className="text-link"
              href={`/posts/${booking.source_post_id}`}
            >
              View the learning request for this call
            </Link>
          )}
          <small className="muted">Booking reference: {booking.id}</small>
        </section>
        <section className="panel">
          <PaymentCheckout
            id={id}
            amount={booking.amount_paise}
            mentorName={mentor.full_name}
            configured={paymentConfigured()}
            serverNow={requestTime}
            initial={{
              status: booking.status,
              paymentState: payment.state,
              expiresAt: booking.hold_expires_at,
            }}
          />
        </section>
      </div>
    </div>
  );
}
