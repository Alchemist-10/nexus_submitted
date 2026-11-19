"use client";
import { useActionState } from "react";
import { ArrowUp } from "lucide-react";
import { setVote } from "@/features/community/actions";
export function VoteButton({
  postId,
  targetId,
  kind,
  voted,
  count,
  showLabel = false,
  targetTitle,
}: {
  postId: string;
  targetId: string;
  kind: "post" | "answer";
  voted: boolean;
  count: number;
  showLabel?: boolean;
  targetTitle?: string;
}) {
  const [state, action, pending] = useActionState(setVote, {});
  return (
    <form action={action} className="vote-form">
      <input type="hidden" name="postId" value={postId} />
      <input type="hidden" name="targetId" value={targetId} />
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="active" value={String(!voted)} />
      <button
        disabled={pending}
        className={`vote-button ${voted ? "is-voted" : ""}`}
        aria-pressed={voted}
        aria-label={`${voted ? "Remove upvote from" : "Upvote"} ${kind}${targetTitle ? `: ${targetTitle}` : ""}`}
      >
        <ArrowUp size={17} />
        <span>{count}</span>
        {showLabel && (
          <span className="stat-label">
            {count === 1 ? "upvote" : "upvotes"}
          </span>
        )}
      </button>
      {state.error && (
        <span className="vote-error" role="alert">
          {state.error}
        </span>
      )}
    </form>
  );
}
