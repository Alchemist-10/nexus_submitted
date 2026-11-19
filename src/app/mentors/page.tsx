import Link from "next/link";
import {
  ArrowUpRight,
  Search,
  SlidersHorizontal,
  Video,
  Compass,
} from "lucide-react";
import { listMentors, nextMentorSlots } from "@/features/mentorship/queries";
import { MentorCard } from "@/components/mentor-card";
import { topics } from "@/features/community/shared";
import {
  expertiseLabel,
  matchesMentorTopic,
} from "@/features/mentorship/presentation";

export default async function MentorDirectory({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; topic?: string }>;
}) {
  const { q = "", topic = "" } = await searchParams;
  const mentors = await listMentors();
  const selectedTopic = Object.hasOwn(topics, topic) ? topic : "";
  const search = q.trim().slice(0, 100).toLowerCase();
  const matching = mentors.filter(
    (m) =>
      (!search ||
        [m.profile?.full_name, m.headline, ...m.expertise.map(expertiseLabel)]
          .join(" ")
          .toLowerCase()
          .includes(search)) &&
      (!selectedTopic || matchesMentorTopic(m.expertise, selectedTopic)),
  );
  const slots = await nextMentorSlots(matching.map((m) => m.user_id));
  return (
    <div className="shell page-space workspace-page directory-page">
      <div className="section-heading workspace-heading">
        <div>
          <span className="eyebrow">
            <Compass size={15} aria-hidden="true" /> YOUR NEXT STEP, TOGETHER
          </span>
          <h1>
            Good people.
            <br />
            <span className="heading-accent">Better direction.</span>
          </h1>
          <p className="lead">
            Find a mentor who understands your problem, then work through it
            together.
          </p>
        </div>
        <div className="directory-intro-note">
          <span className="note-icon">
            <Video size={23} aria-hidden="true" />
          </span>
          <div>
            <strong>Your first call is on us.</strong>
            <p>
              One free introduction with each mentor.
              <br />
              Paid follow-ups when you’re ready.
            </p>
          </div>
        </div>
      </div>
      <form method="get" className="directory-filters">
        <label className="search-field">
          <Search size={18} aria-hidden="true" />
          <input
            name="q"
            defaultValue={q.slice(0, 100)}
            placeholder="Search a name, skill or field"
            aria-label="Search mentors"
            maxLength={100}
          />
        </label>
        <label className="directory-topic">
          <SlidersHorizontal size={16} aria-hidden="true" />
          <select
            name="topic"
            defaultValue={selectedTopic}
            aria-label="Filter mentors by expertise"
          >
            <option value="">All expertise</option>
            {Object.entries(topics).map(([id, label]) => (
              <option value={id} key={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <button className="button" type="submit">
          Find mentors
        </button>
      </form>
      <div className="directory-results">
        <span>
          <strong>{matching.length}</strong>{" "}
          {matching.length === 1 ? "mentor" : "mentors"}
          {search || selectedTopic ? " matching your search" : " to learn with"}
        </span>
        {search || selectedTopic ? (
          <Link className="text-link" href="/mentors">
            Clear filters
          </Link>
        ) : (
          <span className="muted">Real people. One-to-one conversations.</span>
        )}
      </div>
      {matching.length ? (
        <div className="mentor-grid">
          {matching.map((m) => (
            <MentorCard
              mentor={m}
              nextSlot={slots.get(m.user_id)}
              key={m.user_id}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <Compass size={28} aria-hidden="true" />
          <h2>
            {mentors.length
              ? "Let’s try another direction."
              : "The first mentors start with you."}
          </h2>
          <p>
            {mentors.length
              ? "Try a broader search or choose another area of expertise."
              : "Share your expertise and make room for a student’s next question."}
          </p>
          <Link
            href={mentors.length ? "/mentors" : "/dashboard/mentor"}
            className="button secondary"
          >
            {mentors.length ? "Browse all mentors" : "Become a mentor"}
            <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </div>
      )}
      <div className="directory-bottom-note">
        <div>
          <span className="eyebrow">NOT SURE WHO TO CHOOSE?</span>
          <h2>Start with what’s stopping you.</h2>
          <p>
            Share your question and get mentor recommendations based on its
            topics.
          </p>
        </div>
        <Link className="button secondary" href="/posts/new">
          Post a learning request <ArrowUpRight size={16} aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
