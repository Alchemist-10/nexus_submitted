import Link from "next/link";
import { ArrowUpRight, CalendarDays, Video } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { MentorRating } from "@/components/mentor-rating";
import { TimeRange } from "@/components/time-range";
import { formatINR } from "@/features/payments/shared";
import { expertiseLabel } from "@/features/mentorship/presentation";
import type { listMentors } from "@/features/mentorship/queries";
type Mentor = Awaited<ReturnType<typeof listMentors>>[number];
export type MentorAvailability =
  { starts_at: string; ends_at: string } | null | undefined;

export function MentorCard({
  mentor: m,
  nextSlot,
}: {
  mentor: Mentor;
  nextSlot: MentorAvailability;
}) {
  return (
    <Link className="mentor-card discovery-card" href={`/mentors/${m.user_id}`}>
      <div className="mentor-card-cover" aria-hidden="true">
        <span>LEARN. CONNECT. GROW.</span>
        <ArrowUpRight size={22} />
      </div>
      <div className="discovery-card-body">
        <div className="mentor-top">
          <Avatar
            id={m.user_id}
            name={m.profile?.full_name || "Mentor"}
            path={m.profile?.avatar_path}
            variant={m.profile?.avatar_variant}
          />
          <span className="intro-tag">
            <Video size={13} aria-hidden="true" /> Free intro
          </span>
        </div>
        <h2>{m.profile?.full_name || "Nexus mentor"}</h2>
        <p className="mentor-headline">{m.headline}</p>
        <MentorRating
          average={m.rating?.average_rating}
          count={m.rating?.rating_count}
        />
        <div className="tags">
          {m.expertise.map((t) => (
            <span key={t}>{expertiseLabel(t)}</span>
          ))}
        </div>
        <div className="mentor-availability">
          <CalendarDays size={16} aria-hidden="true" />
          <div>
            <span>
              {nextSlot
                ? `Next available · ${Math.round((Date.parse(nextSlot.ends_at) - Date.parse(nextSlot.starts_at)) / 60000)} min`
                : nextSlot === null
                  ? "No open slots right now"
                  : "Availability preview unavailable"}
            </span>
            {nextSlot && <TimeRange start={nextSlot.starts_at} />}
          </div>
        </div>
        <div className="mentor-card-footer">
          <div>
            <strong>
              {m.session_price_paise
                ? formatINR(m.session_price_paise)
                : "Price not set"}
            </strong>
            <span>per follow-up session</span>
          </div>
          <span className="mentor-card-cta">
            View mentor <ArrowUpRight size={15} aria-hidden="true" />
          </span>
        </div>
      </div>
    </Link>
  );
}
