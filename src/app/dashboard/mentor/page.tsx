import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ActionForm } from "@/components/action-form";
import { AvailabilityForm } from "@/components/availability-form";
import { TimeRange } from "@/components/time-range";
import { saveMentor, closeSlot } from "@/features/bookings/actions";
import { saveMentorPrice } from "@/features/payments/actions";

export default async function MentorStudioPage() {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  const [{ data: mentor, error }, { data: slots, error: slotError }] =
    await Promise.all([
      supabase
        .from("mentor_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("availability_slots")
        .select("*")
        .eq("mentor_id", user.id)
        .eq("is_open", true)
        .gt("starts_at", new Date().toISOString())
        .order("starts_at")
        .limit(100),
    ]);
  if (error || slotError)
    throw new Error("Your mentor studio could not be loaded.");
  return (
    <div className="shell page-space">
      <div className="section-heading">
        <div>
          <span className="eyebrow">MENTOR STUDIO</span>
          <h1>Someone can learn from you.</h1>
          <p className="lead">
            Share your perspective. Make room for a conversation.
          </p>
        </div>
        {mentor && (
          <Link className="button secondary" href={`/mentors/${user.id}`}>
            View your profile <ArrowUpRight size={16} />
          </Link>
        )}
      </div>
      <div className="studio-grid">
        <section className="panel">
          <h2>Your mentor profile</h2>
          <ActionForm
            action={saveMentor}
            submitLabel={mentor ? "Save profile" : "Publish profile"}
          >
            <label>
              How can you help?
              <input
                name="headline"
                defaultValue={mentor?.headline}
                minLength={5}
                maxLength={120}
                placeholder="Backend engineering, project reviews, and first interviews"
                required
              />
            </label>
            <label>
              About you
              <textarea
                name="bio"
                defaultValue={mentor?.bio}
                maxLength={1500}
                rows={5}
                placeholder="What have you learned, and who would you like to help?"
              />
            </label>
            <label>
              Expertise
              <input
                name="expertise"
                defaultValue={mentor?.expertise.join(", ")}
                placeholder="TypeScript, Databases, Interviews"
                required
              />
              <small>Up to eight topics, separated by commas.</small>
            </label>
          </ActionForm>
        </section>
        <div>
          {mentor && (
            <section className="panel spaced">
              <h2>Paid follow-up sessions</h2>
              <p className="muted">
                Each student&apos;s first call with you is free. After
                completing it, they can book a follow-up at your price.
              </p>
              <ActionForm
                action={saveMentorPrice}
                submitLabel="Save session price"
              >
                <label>
                  Price per session (INR)
                  <input
                    name="price"
                    inputMode="decimal"
                    defaultValue={
                      mentor.session_price_paise === null
                        ? ""
                        : String(mentor.session_price_paise / 100)
                    }
                    placeholder="199"
                    maxLength={8}
                  />
                  <small>
                    ₹1–₹25,000 per published slot. Leave blank to disable paid
                    follow-ups. Existing checkout prices stay fixed.
                  </small>
                </label>
              </ActionForm>
              <p className="muted">
                Razorpay test mode. No real money or mentor payouts in this
                test.
              </p>
            </section>
          )}
          <section className="panel">
            <h2>Open a session slot</h2>
            {mentor ? (
              <AvailabilityForm />
            ) : (
              <p className="muted">
                Publish your profile first, then choose a time for your first
                introductory call.
              </p>
            )}
          </section>
          <section className="panel spaced">
            <h2>Your upcoming slots</h2>
            {slots?.length ? (
              <div className="slot-list">
                {slots.map((slot) => (
                  <div className="slot-card" key={slot.id}>
                    <TimeRange start={slot.starts_at} end={slot.ends_at} />
                    <ActionForm
                      action={closeSlot}
                      submitLabel="Close slot"
                      secondary
                    >
                      <input name="slotId" value={slot.id} type="hidden" />
                    </ActionForm>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted">
                Your published availability will appear here.
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
