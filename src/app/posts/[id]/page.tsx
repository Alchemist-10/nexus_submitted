import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { MentorRating } from "@/components/mentor-rating";
import { randomUUID } from "node:crypto";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Check, Video } from "lucide-react";
import { currentUser } from "@/lib/auth/session";
import { idSchema } from "@/lib/validation";
import { loadPost } from "@/features/community/queries";
import { categories, topics, type Topic } from "@/features/community/shared";
import {
  addAnswer,
  acceptAnswer,
  deleteContent,
  reportPost,
} from "@/features/community/actions";
import { ActionForm } from "@/components/action-form";
import { VoteButton } from "@/components/community-controls";
import { TimeRange } from "@/components/time-range";
export default async function PostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();
  const user = await currentUser();
  const data = await loadPost(id, user?.id);
  if (!data) notFound();
  const { post, answers, mentors, votes, imageUrls } = data;
  const owner = user?.id === post.author_id;
  return (
    <div className="shell page-space">
      <Link className="text-link" href="/">
        <ArrowLeft size={16} />
        Community
      </Link>
      <div className="question-layout">
        <div className="question-main">
          <article className="panel question-body">
            <div className="post-meta">
              <span>
                {categories[post.category as keyof typeof categories]}
              </span>
              <Link className="author-link" href={`/profile/${post.author_id}`}>
                <Avatar
                  id={post.author_id}
                  name={post.author_name}
                  path={post.author_avatar_path}
                  variant={post.author_avatar_variant}
                  size="tiny"
                />
                <span>Posted by {post.author_name}</span>
              </Link>
              <span>
                {new Date(post.created_at).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  timeZone: "UTC",
                })}
              </span>
            </div>
            <h1>{post.title}</h1>
            <div className="tags">
              {post.tags.map((tag) => (
                <Link href={`/?topic=${tag}`} key={tag}>
                  {topics[tag as Topic] || tag}
                </Link>
              ))}
            </div>
            <div className="post-text">{post.body}</div>
            {imageUrls.length > 0 && (
              <div className="post-images">
                {imageUrls.map((url, i) => (
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    key={url}
                    aria-label={`Open question image ${i + 1}`}
                  >
                    {/* User uploads are served directly from the constrained Storage bucket. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`Screenshot or diagram attached to: ${post.title} (${i + 1})`}
                      loading="lazy"
                    />
                  </a>
                ))}
              </div>
            )}
            <div className="stuck-box">
              <span className="eyebrow">WHERE I NEED A MENTOR</span>
              <p>{post.stuck_on}</p>
            </div>
            <div className="post-actions">
              {user && !owner ? (
                <VoteButton
                  postId={id}
                  targetId={id}
                  kind="post"
                  voted={votes.some((v) => v.post_id === id)}
                  count={post.upvotes}
                />
              ) : (
                <span>{post.upvotes} upvotes</span>
              )}
              <span
                className={post.accepted_answer_id ? "resolved-label" : "muted"}
              >
                {post.accepted_answer_id
                  ? "Helpful answer accepted"
                  : "Looking for guidance"}
              </span>
            </div>
          </article>
          <section className="answers-section" id="answers">
            <div className="section-heading">
              <div>
                <span className="eyebrow">LEARN FROM THE COMMUNITY</span>
                <h2>
                  Approaches & explanations{" "}
                  <span className="muted">({post.answer_count})</span>
                </h2>
              </div>
              <Link className="button secondary" href="#answer-form">
                Write an answer
              </Link>
            </div>
            <p className="muted">
              An explanation can help. A conversation can take it further.
              Mentor contributions are labelled so you can get to know their
              approach.
            </p>
            {answers.length === 0 ? (
              <div className="empty-state compact">
                <h3>No explanations yet.</h3>
                <p>Have a useful way to approach this? Share your thinking.</p>
              </div>
            ) : (
              answers.map((answer) => (
                <article
                  className={`panel answer-card ${post.accepted_answer_id === answer.id ? "accepted" : ""}`}
                  key={answer.id}
                >
                  <div className="post-meta">
                    <Link
                      className="author-link"
                      href={`/profile/${answer.author_id}`}
                    >
                      <Avatar
                        id={answer.author_id}
                        name={answer.author_name}
                        path={answer.author_avatar_path}
                        variant={answer.author_avatar_variant}
                        size="small"
                      />
                      <strong>{answer.author_name}</strong>
                    </Link>
                    {answer.is_mentor && (
                      <Link
                        className="mentor-label"
                        href={`/mentors/${answer.author_id}?post=${id}`}
                      >
                        Mentor <ArrowUpRight size={12} />
                      </Link>
                    )}
                    {post.accepted_answer_id === answer.id && (
                      <span className="resolved-label">
                        <Check size={14} />
                        Accepted by author
                      </span>
                    )}
                  </div>
                  <div className="post-text">{answer.body}</div>
                  <div className="answer-actions">
                    {user && user.id !== answer.author_id ? (
                      <VoteButton
                        postId={id}
                        targetId={answer.id}
                        kind="answer"
                        voted={votes.some((v) => v.answer_id === answer.id)}
                        count={answer.upvotes}
                      />
                    ) : (
                      <span>{answer.upvotes} upvotes</span>
                    )}
                    {owner && (
                      <ActionForm
                        action={acceptAnswer}
                        submitLabel={
                          post.accepted_answer_id === answer.id
                            ? "Clear accepted answer"
                            : "Mark helpful"
                        }
                        secondary
                      >
                        <input type="hidden" name="postId" value={id} />
                        <input
                          type="hidden"
                          name="answerId"
                          value={
                            post.accepted_answer_id === answer.id
                              ? ""
                              : answer.id
                          }
                        />
                      </ActionForm>
                    )}
                    {user?.id === answer.author_id && (
                      <details>
                        <summary>Remove answer</summary>
                        <ActionForm
                          action={deleteContent}
                          submitLabel="Confirm removal"
                          secondary
                        >
                          <input type="hidden" name="id" value={answer.id} />
                          <input type="hidden" name="kind" value="answer" />
                        </ActionForm>
                      </details>
                    )}
                  </div>
                </article>
              ))
            )}
          </section>
          <section className="panel" id="answer-form">
            <h2>Help them understand the approach.</h2>
            <p className="muted">
              Explain the reasoning, ask a useful question, or share what worked
              for you.
            </p>
            {user ? (
              <ActionForm action={addAnswer} submitLabel="Share explanation">
                <input type="hidden" name="postId" value={id} />
                <input type="hidden" name="id" value={randomUUID()} />
                <label>
                  Your explanation
                  <textarea
                    name="body"
                    rows={5}
                    minLength={20}
                    maxLength={10000}
                    placeholder="Start with the intuition, then walk through the steps…"
                    required
                  />
                </label>
              </ActionForm>
            ) : (
              <Link className="button" href={`/login?next=/posts/${id}`}>
                Sign in to contribute
              </Link>
            )}
          </section>
          {user && (
            <details className="content-tools">
              <summary>
                {owner ? "Manage this request" : "Report this request"}
              </summary>
              {owner ? (
                <ActionForm
                  action={deleteContent}
                  submitLabel="Delete request and its answers"
                  secondary
                >
                  <input type="hidden" name="id" value={id} />
                  <input type="hidden" name="kind" value="post" />
                  <p>
                    This permanently removes the discussion and detaches it from
                    any existing bookings. Your bookings remain.
                  </p>
                </ActionForm>
              ) : (
                <ActionForm
                  action={reportPost}
                  submitLabel="Submit report"
                  secondary
                >
                  <input type="hidden" name="postId" value={id} />
                  <label>
                    What is the issue?
                    <textarea
                      name="reason"
                      minLength={10}
                      maxLength={500}
                      required
                    />
                  </label>
                </ActionForm>
              )}
            </details>
          )}
        </div>
        <aside className="mentor-sidebar" aria-label="Recommended mentors">
          <div className="mentor-invite">
            <span className="eyebrow">
              <Video size={15} />
              WORK THROUGH IT TOGETHER
            </span>
            <h2>
              A real person.
              <br />A clearer approach.
            </h2>
            <p>
              Find someone who can explain it your way, in a one-to-one video
              call.
            </p>
            <span className="intro-pill">
              First introduction free per mentor
            </span>
          </div>
          <div className="recommendations">
            <h3>Mentors for this question</h3>
            <p className="muted small-copy">
              Matched by topics, helpful contributions, and availability.
            </p>
            {mentors.length === 0 ? (
              <div className="no-matches">
                <p>No relevant mentors have published a profile yet.</p>
                <Link className="text-link" href="/mentors">
                  Browse the mentor directory <ArrowUpRight size={14} />
                </Link>
                <Link className="text-link" href="/dashboard/mentor">
                  Know this topic? Offer mentorship
                </Link>
              </div>
            ) : (
              mentors.map((mentor) => (
                <article className="recommended-card" key={mentor.mentor_id}>
                  <div className="mentor-identity">
                    <Avatar
                      id={mentor.mentor_id}
                      name={mentor.full_name}
                      path={mentor.profile?.avatar_path}
                      variant={mentor.profile?.avatar_variant}
                    />
                    <div>
                      <h3>{mentor.full_name}</h3>
                      <p>{mentor.headline}</p>
                    </div>
                  </div>
                  <MentorRating
                    average={mentor.rating?.average_rating}
                    count={mentor.rating?.rating_count}
                  />
                  <p className="match-reason">
                    Matches{" "}
                    {mentor.matched_tags
                      .map((tag) => topics[tag as Topic] || tag)
                      .join(" · ")}
                  </p>
                  <p className="small-copy muted">
                    {mentor.accepted_answers > 0
                      ? `${mentor.accepted_answers} accepted answers in these topics`
                      : "Expertise listed on mentor profile"}
                    {mentor.answer_upvotes > 0
                      ? ` · ${mentor.answer_upvotes} answer upvotes`
                      : ""}
                  </p>
                  {mentor.next_available ? (
                    <p className="availability-note">
                      Next session: <TimeRange start={mentor.next_available} />
                    </p>
                  ) : (
                    <p className="muted small-copy">
                      No open session slots right now.
                    </p>
                  )}
                  <Link
                    className="button"
                    href={`/mentors/${mentor.mentor_id}?post=${id}`}
                  >
                    {mentor.next_available
                      ? "Choose a session"
                      : "View mentor profile"}
                    <ArrowUpRight size={15} />
                  </Link>
                </article>
              ))
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
