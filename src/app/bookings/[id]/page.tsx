import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { idSchema } from "@/lib/validation";
import { loadMyBookings } from "@/features/bookings/queries";
import { SessionCard } from "@/components/session-card";
import { SessionRefresh } from "@/components/session-refresh";

export default async function SessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();
  const user = await requireUser(`/bookings/${id}`);
  const data = await loadMyBookings(id);
  const booking = data.bookings[0];
  if (!booking) notFound();
  return (
    <div className="shell page-space sessions-page workspace-page">
      <div className="section-heading workspace-heading">
        <div>
          <span className="eyebrow">YOUR CONVERSATION</span>
          <h1>
            Session details<span className="heading-dot">.</span>
          </h1>
          <p className="lead">The latest details, all in one place.</p>
        </div>
        <Link className="text-link" href="/dashboard">
          All my sessions →
        </Link>
      </div>
      <SessionRefresh
        active={
          booking.status === "confirmed" ||
          booking.status === "awaiting_payment"
        }
      />
      <SessionCard {...data} booking={booking} userId={user.id} />
    </div>
  );
}
