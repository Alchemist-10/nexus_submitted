import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  Compass,
  Sparkles,
  Video,
} from "lucide-react";
import { listMentors } from "@/features/mentorship/queries";
import { isConfigured } from "@/lib/env";

export default async function HomePage() {
  const mentors = await listMentors();
  const configured = isConfigured();
  return (
    <div className="shell">
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">
            <span className="status-dot" /> A little guidance goes a long way
          </span>
          <h1>
            Your next step.
            <br />
            Someone&apos;s
            <br />
            <em>been there.</em>
          </h1>
          <p className="hero-description">
            Find your people, ask the questions that matter, and move forward
            with a mentor in your corner.
          </p>
          <div className="button-row">
            <Link className="button" href="#mentors">
              Find your mentor <ArrowUpRight size={18} />
            </Link>
            <Link className="text-link" href="/dashboard/mentor">
              Share what you know <ArrowRight size={16} />
            </Link>
          </div>
          <div className="hero-note">
            <Check size={15} /> Your first introduction with each mentor is
            free.
          </div>
        </div>
        <div
          className="hero-visual"
          role="group"
          aria-label="Start with a conversation, leave with a direction"
        >
          <span className="visual-orbit orbit-one" />
          <span className="visual-orbit orbit-two" />
          <div className="visual-label">
            <Sparkles size={15} /> A fresh perspective
          </div>
          <div className="conversation-card">
            <span className="card-kicker">YOUR NEXT CHAPTER</span>
            <div className="visual-icon">
              <Compass size={44} strokeWidth={1.3} />
            </div>
            <h2>
              Big questions.
              <br />
              Real conversations.
            </h2>
            <p>
              A new skill. A career decision.
              <br />A place to begin.
            </p>
            <div className="conversation-bottom">
              <span>
                <Video size={17} /> Free introduction
              </span>
              <span className="round-arrow">
                <ArrowUpRight size={18} />
              </span>
            </div>
          </div>
          <div className="floating-note">
            <span className="note-check">
              <Check size={17} />
            </span>
            <div>
              A time that works for you
              <small>One conversation at a time.</small>
            </div>
          </div>
        </div>
      </section>
      <section className="how-strip" aria-label="How Nexus works">
        <div>
          <span>01</span>
          <p>
            Find your person<small>Explore people and their expertise.</small>
          </p>
        </div>
        <div>
          <span>02</span>
          <p>
            Pick a time<small>A slot that fits your schedule.</small>
          </p>
        </div>
        <div>
          <span>03</span>
          <p>
            Start a conversation<small>Get to know each other, for free.</small>
          </p>
        </div>
      </section>
      <section className="mentor-section" id="mentors">
        <div className="section-heading">
          <div>
            <span className="eyebrow">GOOD PEOPLE, USEFUL PERSPECTIVES</span>
            <h2>Meet your next mentor.</h2>
          </div>
          <Link className="text-link" href="/dashboard/mentor">
            Become a mentor <ArrowUpRight size={16} />
          </Link>
        </div>
        {mentors.length > 0 ? (
          <div className="mentor-grid">
            {mentors.map((mentor) => (
              <Link
                className="mentor-card"
                href={`/mentors/${mentor.user_id}`}
                key={mentor.user_id}
              >
                <div className="mentor-top">
                  <span className="avatar">
                    {(mentor.profile?.full_name || "M").slice(0, 1)}
                  </span>
                  <ArrowUpRight size={20} />
                </div>
                <h3>{mentor.profile?.full_name || "Nexus mentor"}</h3>
                <p>{mentor.headline}</p>
                <div className="tags">
                  {mentor.expertise.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
                <div className="mentor-card-footer">
                  <span className="status-dot" /> Free first introduction
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <span className="empty-icon">
              <CalendarDays size={26} />
            </span>
            <h3>
              {configured
                ? "Make the first connection."
                : "A fresh start for Nexus."}
            </h3>
            <p>
              {configured
                ? "The mentor directory is ready. Publish a profile and open your first introductory slot."
                : "The clean app is ready for a new database. Connect Supabase to enable accounts, mentor profiles, and bookings."}
            </p>
            <Link
              href={configured ? "/dashboard/mentor" : "/setup"}
              className="button secondary"
            >
              {configured
                ? "Publish your mentor profile"
                : "Set up this workspace"}
              <ArrowRight size={16} />
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
