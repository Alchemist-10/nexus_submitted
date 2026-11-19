import Link from "next/link";
import { ArrowUp, MessageSquare } from "lucide-react";
import { VoteButton } from "@/components/community-controls";

export function FeedPostActions({
  postId,
  title,
  authorId,
  viewerId,
  voted,
  upvotes,
  answerCount,
}: {
  postId: string;
  title: string;
  authorId: string;
  viewerId?: string;
  voted: boolean;
  upvotes: number;
  answerCount: number;
}) {
  const count = (
    <>
      <ArrowUp size={15} aria-hidden="true" />
      <span>{upvotes}</span>
      <span className="stat-label">{upvotes === 1 ? "upvote" : "upvotes"}</span>
    </>
  );
  return (
    <>
      {viewerId === authorId ? (
        <span
          className="own-vote-count"
          title="You cannot upvote your own post."
        >
          {count}
          <span className="stat-label">· your post</span>
        </span>
      ) : viewerId ? (
        <VoteButton
          postId={postId}
          targetId={postId}
          kind="post"
          voted={voted}
          count={upvotes}
          showLabel
          targetTitle={title}
        />
      ) : (
        <Link
          className="vote-button"
          href={`/login?next=${encodeURIComponent(`/posts/${postId}`)}`}
          aria-label={`Sign in to upvote post: ${title}`}
        >
          {count}
        </Link>
      )}
      <Link
        className="answer-link"
        href={`/posts/${postId}#answers`}
        aria-label={`View ${answerCount} ${answerCount === 1 ? "answer" : "answers"} and answer post: ${title}`}
      >
        <MessageSquare size={15} aria-hidden="true" />
        <span>{answerCount}</span>
        <span className="stat-label">
          {answerCount === 1 ? "answer" : "answers"}
        </span>
      </Link>
    </>
  );
}
