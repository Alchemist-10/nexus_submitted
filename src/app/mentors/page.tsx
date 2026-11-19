import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { MentorRating } from "@/components/mentor-rating";
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
                <Avatar
                  id={m.user_id}
                  name={m.profile?.full_name || "Mentor"}
                  path={m.profile?.avatar_path}
                  variant={m.profile?.avatar_variant}
                />
                <ArrowUpRight size={20} />
              </div>
              <h2>{m.profile?.full_name}</h2>
              <p>{m.headline}</p>
              <MentorRating
                average={m.rating?.average_rating}
                count={m.rating?.rating_count}
              />
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
