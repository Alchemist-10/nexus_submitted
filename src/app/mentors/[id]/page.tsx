import Link from "next/link";
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
  const { mentor, profile, slots, rating } = detail;
  const user = await currentUser();
  const supabase = await createSupabaseServerClient();
  const { data: prior, error: eligibilityError } = user
    ? await supabase
        .from("bookings")
        .select("id")
        .eq("learner_id", user.id)
        .eq("mentor_id", id)
        .in("status", ["confirmed", "completed"])
        .limit(1)
    : { data: [], error: null };
  if (eligibilityError)
    throw new Error("We could not check introductory call eligibility.");
  const usedTrial = Boolean(prior?.length);
  return (
    <div className="shell page-space">
      <Link href="/mentors" className="text-link">
        <ArrowLeft size={16} /> All mentors
      </Link>
      <div className="detail-grid">
        <section className="mentor-detail">
          <span className="avatar large">{profile.full_name.slice(0, 1)}</span>
          <span className="eyebrow">MEET YOUR MENTOR</span>
          <h1>{profile.full_name}</h1>
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
                start time restores your introduction.
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
          {user?.id === id ? (
            <p className="feedback">
              This is your mentor profile.{" "}
              <Link href="/dashboard/mentor">Manage availability</Link>.
            </p>
          ) : usedTrial ? (
            <div className="feedback success">
              You already have a confirmed or completed introduction with this
              mentor. <Link href="/dashboard">View your sessions</Link>.
            </div>
          ) : slots.length ? (
            <div className="slot-list">
              {slots.map((slot) => (
                <div className="slot-card" key={slot.id}>
                  <TimeRange start={slot.starts_at} end={slot.ends_at} />
                  {user ? (
                    <ActionForm
                      action={bookFreeIntro}
                      submitLabel="Book free introduction"
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
