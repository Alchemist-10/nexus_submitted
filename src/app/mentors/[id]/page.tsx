import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { MentorRating } from "@/components/mentor-rating";
import { randomUUID } from "node:crypto";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Video, ShieldCheck } from "lucide-react";
import { mentorDetails } from "@/features/mentorship/queries";
import { currentUser } from "@/lib/auth/session";
import { isConfigured } from "@/lib/env";
import { idSchema } from "@/lib/validation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ActionForm } from "@/components/action-form";
import { TimeRange } from "@/components/time-range";
import { bookFreeIntro } from "@/features/bookings/actions";
import { reservePaidSession } from "@/features/payments/actions";
import { paymentConfigured } from "@/features/payments/server";
import { formatINR } from "@/features/payments/shared";

export default async function MentorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ post?: string }>;
}) {
  if (!isConfigured()) redirect("/setup");
  const { id } = await params;
  const { post: source } = await searchParams;
  const sourcePost = idSchema.safeParse(source).success ? source : undefined;
  if (!idSchema.safeParse(id).success) notFound();
  const detail = await mentorDetails(id);
  if (!detail) notFound();
  const { mentor, profile, slots, rating, requestTime } = detail;
  const user = await currentUser();
  const supabase = await createSupabaseServerClient();
  const { data: prior, error: eligibilityError } = user
    ? await supabase
        .from("bookings")
        .select("id,status")
        .eq("learner_id", user.id)
        .eq("mentor_id", id)
        .eq("kind", "intro")
        .in("status", ["confirmed", "completed"])
        .limit(1)
    : { data: [], error: null };
  if (eligibilityError)
    throw new Error("We could not check introductory call eligibility.");
  const usedTrial = Boolean(prior?.length);
  const completedIntro = prior?.some((b) => b.status === "completed") || false;
  const selectableSlots = completedIntro
    ? slots.filter((s) => Date.parse(s.starts_at) > requestTime + 15 * 60_000)
    : slots;
  const { data: pending, error: pendingError } = user
    ? await supabase
        .from("bookings")
        .select("id")
        .eq("learner_id", user.id)
        .eq("mentor_id", id)
        .eq("status", "awaiting_payment")
        .gt("hold_expires_at", new Date().toISOString())
        .limit(1)
    : { data: [], error: null };
  if (pendingError)
    throw new Error("We could not check your checkout reservation.");
  const checkoutReady = paymentConfigured();
  return (
    <div className="shell page-space">
      <Link href="/mentors" className="text-link">
        <ArrowLeft size={16} /> All mentors
      </Link>
      <div className="detail-grid">
        <section className="mentor-detail">
          <Avatar
            id={profile.id}
            name={profile.full_name}
            path={profile.avatar_path}
            variant={profile.avatar_variant}
            size="large"
          />
          <span className="eyebrow">MEET YOUR MENTOR</span>
          <h1>{profile.full_name}</h1>
          <Link className="text-link" href={`/profile/${profile.id}`}>
            Community profile: @{profile.username}
          </Link>
          <h2>{mentor.headline}</h2>
          <MentorRating
            average={rating?.average_rating}
            count={rating?.rating_count}
          />
          <div className="tags">
            {mentor.expertise.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
          <p className="lead preserve-lines">
            {mentor.bio ||
              "Start with an introduction and get to know each other."}
          </p>
          <div className="detail-note">
            <ShieldCheck size={22} />
            <p>
              One free introductory call.
              <small>
                Your first call with this mentor is free. Cancelling before the
                start time restores your introduction.{" "}
                {mentor.session_price_paise
                  ? `Follow-up sessions cost ${formatINR(mentor.session_price_paise)} per published slot.`
                  : "Paid follow-ups have not been enabled by this mentor yet."}
              </small>
            </p>
          </div>
        </section>
        <section className="panel booking-panel">
          <span className="eyebrow">
            <Video size={15} /> LET&apos;S TALK
          </span>
          <h2>Find a time to connect.</h2>
          {sourcePost && (
            <p className="feedback">
              This call will include the context from your{" "}
              <Link href={`/posts/${sourcePost}`}>learning request</Link>.
            </p>
          )}
          <p className="muted">Slots are shown in your timezone.</p>
          {completedIntro && (
            <p className="muted">
              New paid bookings close 15 minutes before the session starts.
            </p>
          )}
          {user?.id === id ? (
            <p className="feedback">
              This is your mentor profile.{" "}
              <Link href="/dashboard/mentor">Manage availability</Link>.
            </p>
          ) : pending?.length ? (
            <div className="feedback">
              <p>You have a checkout in progress with this mentor.</p>
              <Link className="button" href={`/checkout/${pending[0].id}`}>
                Resume checkout
              </Link>
            </div>
          ) : usedTrial && !completedIntro ? (
            <div className="feedback success">
              Your free introduction with this mentor is booked. Complete that
              call to unlock paid follow-ups.{" "}
              <Link href="/dashboard">View your sessions</Link>.
            </div>
          ) : completedIntro && !mentor.session_price_paise ? (
            <p className="feedback">
              Your free introduction is complete. This mentor has not enabled
              paid follow-up sessions yet.
            </p>
          ) : selectableSlots.length ? (
            <div className="slot-list">
              {selectableSlots.map((slot) => (
                <div className="slot-card" key={slot.id}>
                  <TimeRange start={slot.starts_at} end={slot.ends_at} />
                  {user && completedIntro && !checkoutReady ? (
                    <p className="muted">
                      {formatINR(mentor.session_price_paise!)} · Test checkout
                      is being configured.
                    </p>
                  ) : user ? (
                    <ActionForm
                      action={
                        completedIntro ? reservePaidSession : bookFreeIntro
                      }
                      submitLabel={
                        completedIntro
                          ? `Continue to payment · ${formatINR(mentor.session_price_paise!)}`
                          : "Book free introduction"
                      }
                    >
                      <input
                        name="sourcePostId"
                        type="hidden"
                        value={sourcePost || ""}
                      />
                      <input name="slotId" type="hidden" value={slot.id} />
                      <input
                        name="requestKey"
                        type="hidden"
                        value={randomUUID()}
                      />
                    </ActionForm>
                  ) : (
                    <Link
                      className="button secondary"
                      href={`/login?next=${encodeURIComponent(`/mentors/${id}${sourcePost ? `?post=${sourcePost}` : ""}`)}`}
                    >
                      Sign in to book
                    </Link>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="feedback">
              No open slots yet. Check back after this mentor adds availability.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
