import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { listMentors } from "@/features/mentorship/queries";
export default async function MentorDirectory() {
  const mentors = await listMentors();
  return (
    <div className="shell page-space">
      <div className="section-heading">
        <div>
          <span className="eyebrow">LEARN WITH SOMEONE WHO HAS BEEN THERE</span>
          <h1>Find your mentor.</h1>
          <p className="lead">
            Start with one free introduction. Bring a problem, leave with a
            direction.
          </p>
        </div>
        <Link className="button secondary" href="/posts/new">
          Post where you’re stuck
        </Link>
      </div>
      {mentors.length ? (
        <div className="mentor-grid">
          {mentors.map((m) => (
            <Link
              className="mentor-card"
              href={`/mentors/${m.user_id}`}
              key={m.user_id}
            >
              <div className="mentor-top">
                <span className="avatar">
                  {m.profile?.full_name.slice(0, 1)}
                </span>
                <ArrowUpRight size={20} />
              </div>
              <h3>{m.profile?.full_name}</h3>
              <p>{m.headline}</p>
              <div className="tags">
                {m.expertise.map((t) => (
                  <span key={t}>{t}</span>
                ))}
              </div>
              <div className="mentor-card-footer">Free first introduction</div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h2>The first mentors start with you.</h2>
          <p>
            Share your expertise and make room for a student’s next question.
          </p>
          <Link href="/dashboard/mentor" className="button">
            Become a mentor
          </Link>
        </div>
      )}
    </div>
  );
}
