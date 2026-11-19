import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowUpRight,
  PenLine,
  CalendarDays,
  MessageSquare,
} from "lucide-react";
import { currentUser } from "@/lib/auth/session";
import { idSchema } from "@/lib/validation";
import { loadMember } from "@/features/profiles/queries";
import { Avatar } from "@/components/avatar";
import { MentorRating } from "@/components/mentor-rating";
import { topics, type Topic, categories } from "@/features/community/shared";
export default async function MemberPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; page?: string; saved?: string }>;
}) {
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();
  const query = await searchParams,
    tab = query.tab === "answers" ? "answers" : "posts",
    page = Math.max(1, Math.min(100, Math.trunc(Number(query.page)) || 1));
  const [data, user] = await Promise.all([
    loadMember(id, tab, page),
    currentUser(),
  ]);
  if (!data) notFound();
  const {
      profile,
      stats,
      mentor,
      rating,
      posts,
      answers,
      answerPosts,
      hasMore,
    } = data,
    own = user?.id === id;
  return (
    <div className="shell page-space">
      <div className="profile-heading">
        <span className="eyebrow">
          {own ? "YOUR CORNER OF NEXUS" : "COMMUNITY PROFILE"}
        </span>
        <Link className="text-link" href="/">
          Back to community <ArrowUpRight size={14} />
        </Link>
      </div>
      {own && query.saved === "1" && (
        <p className="feedback success" role="status">
          Your profile has been updated.
        </p>
      )}
      <section className="panel member-header">
        <Avatar
          id={id}
          name={profile.full_name}
          variant={profile.avatar_variant}
          path={profile.avatar_path}
          size="large"
        />
        <div className="member-intro">
          <div className="member-role">
            {mentor ? "Mentor & community member" : "Community member"}
            {own && <span>My profile</span>}
          </div>
          <h1>{profile.full_name}</h1>
          <p className="member-handle">@{profile.username}</p>
          <p className="member-bio">
            {profile.bio ||
              (own
                ? "Add a short bio to let people know what you are learning and building."
                : "Learning, building, and sharing along the way.")}
          </p>
          <p className="muted">
            Joined{" "}
            {new Date(profile.created_at).toLocaleDateString("en-IN", {
              month: "long",
              year: "numeric",
              timeZone: "Asia/Kolkata",
            })}
          </p>
          {mentor && (
            <MentorRating
              average={rating?.average_rating}
              count={rating?.rating_count}
            />
          )}
        </div>
        <div className="member-actions">
          {own ? (
            <>
              <Link className="button" href="/profile/edit">
                <PenLine size={15} />
                Edit profile
              </Link>
              <Link className="button secondary" href="/dashboard">
                <CalendarDays size={15} />
                My sessions
              </Link>
              <Link className="text-link" href="/dashboard/mentor">
                Mentor studio <ArrowUpRight size={14} />
              </Link>
            </>
          ) : mentor ? (
            <Link className="button" href={`/mentors/${id}`}>
              Book an introduction <ArrowUpRight size={15} />
            </Link>
          ) : null}
        </div>
      </section>
      <div className="member-stats">
        <div>
          <strong>{stats?.post_count || 0}</strong>
          <span>Learning requests</span>
        </div>
        <div>
          <strong>{stats?.answer_count || 0}</strong>
          <span>Explanations shared</span>
        </div>
        <div>
          <strong>{stats?.helpful_answer_count || 0}</strong>
          <span>Answers accepted by others</span>
        </div>
      </div>
      <div className="member-content">
        <section className="member-activity">
          <div className="section-heading">
            <h2>{own ? "My activity" : "Community activity"}</h2>
            {own && (
              <Link className="text-link" href="/posts/new">
                Post a question <PenLine size={14} />
              </Link>
            )}
          </div>
          <nav className="feed-tabs" aria-label="Profile activity">
            <Link
              className={tab === "posts" ? "active" : ""}
              aria-current={tab === "posts" ? "page" : undefined}
              href={`/profile/${id}?tab=posts`}
            >
              {own ? "My posts" : "Posts"} ({stats?.post_count || 0})
            </Link>
            <Link
              className={tab === "answers" ? "active" : ""}
              aria-current={tab === "answers" ? "page" : undefined}
              href={`/profile/${id}?tab=answers`}
            >
              {own ? "My answers" : "Answers"} ({stats?.answer_count || 0})
            </Link>
          </nav>
          {tab === "posts" ? (
            posts.length ? (
              posts.map((post) => (
                <article className="feed-card" key={post.id}>
                  <span className="eyebrow">
                    {categories[post.category as keyof typeof categories]}
                  </span>
                  <h3>
                    <Link href={`/posts/${post.id}`}>{post.title}</Link>
                  </h3>
                  <p className="feed-excerpt">{post.stuck_on}</p>
                  <div className="tags">
                    {post.tags.map((t) => (
                      <Link key={t} href={`/?topic=${t}`}>
                        {topics[t as Topic] || t}
                      </Link>
                    ))}
                  </div>
                  <div className="feed-card-bottom">
                    <span className="muted">
                      {post.upvotes} upvotes · {post.answer_count} explanations
                    </span>
                    <Link className="text-link" href={`/posts/${post.id}`}>
                      Open request <ArrowUpRight size={14} />
                    </Link>
                  </div>
                </article>
              ))
            ) : (
              <div className="empty-state">
                <MessageSquare size={28} />
                <h3>
                  {own
                    ? "Your questions belong here."
                    : "No learning requests yet."}
                </h3>
                <p>
                  {own
                    ? "The community feed shows everyone's questions. This tab shows only yours."
                    : "This member has not published a learning request."}
                </p>
                {own && (
                  <Link className="button" href="/posts/new">
                    Post where you&apos;re stuck
                  </Link>
                )}
              </div>
            )
          ) : answers.length ? (
            answers.map((answer) => (
              <article className="feed-card" key={answer.id}>
                <span className="eyebrow">EXPLANATION</span>
                <h3>
                  <Link href={`/posts/${answer.post_id}#answers`}>
                    {answerPosts.find((p) => p.id === answer.post_id)?.title ||
                      "View the conversation"}
                  </Link>
                </h3>
                <p className="feed-excerpt">{answer.body}</p>
                <div className="feed-card-bottom">
                  <span className="muted">{answer.upvotes} upvotes</span>
                  <Link
                    className="text-link"
                    href={`/posts/${answer.post_id}#answers`}
                  >
                    View explanation <ArrowUpRight size={14} />
                  </Link>
                </div>
              </article>
            ))
          ) : (
            <div className="empty-state">
              <MessageSquare size={28} />
              <h3>
                {own
                  ? "Your explanations will appear here."
                  : "No explanations yet."}
              </h3>
              <p>
                {own
                  ? "Share your approach on a community question to get started."
                  : "This member has not contributed an explanation."}
              </p>
              <Link className="text-link" href="/">
                Explore the community <ArrowUpRight size={14} />
              </Link>
            </div>
          )}
          <div className="pagination">
            {page > 1 && (
              <Link
                className="text-link"
                href={`/profile/${id}?tab=${tab}&page=${page - 1}`}
              >
                Previous page
              </Link>
            )}
            {hasMore && (
              <Link
                className="text-link"
                href={`/profile/${id}?tab=${tab}&page=${page + 1}`}
              >
                More activity <ArrowUpRight size={14} />
              </Link>
            )}
          </div>
        </section>
        <aside className="member-aside">
          {mentor ? (
            <div className="panel">
              <span className="eyebrow">LEARN WITH ME</span>
              <h2>{mentor.headline}</h2>
              <div className="tags">
                {mentor.expertise.map((t) => (
                  <span key={t}>{t}</span>
                ))}
              </div>
              <p className="muted">
                One free introductory call per learner and mentor.
              </p>
              <Link className="button secondary" href={`/mentors/${id}`}>
                {own ? "View mentor profile" : "View availability"}{" "}
                <ArrowUpRight size={14} />
              </Link>
            </div>
          ) : own ? (
            <div className="panel">
              <span className="eyebrow">SOMETHING TO SHARE?</span>
              <h2>Be someone&apos;s next mentor.</h2>
              <p className="muted">
                Publish your expertise and open time for an introductory
                conversation.
              </p>
              <Link className="text-link" href="/dashboard/mentor">
                Set up mentor profile <ArrowUpRight size={14} />
              </Link>
            </div>
          ) : null}
          {own && (
            <p className="profile-privacy-note">
              Only you see the shortcuts to your sessions and profile settings.
              Booking details are never listed on this public profile.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
