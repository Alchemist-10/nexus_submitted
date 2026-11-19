import { Star } from "lucide-react";
export function MentorRating({
  average,
  count,
}: {
  average?: number | null;
  count?: number;
}) {
  return (
    <span className="mentor-rating-summary">
      <Star
        size={14}
        aria-hidden="true"
        fill={count ? "currentColor" : "none"}
      />
      {count && average != null ? (
        <span>
          {Number(average).toFixed(1)} / 5{" "}
          <span className="rating-count">
            · {count} session {count === 1 ? "rating" : "ratings"}
          </span>
        </span>
      ) : (
        <span className="rating-count">No session ratings yet</span>
      )}
    </span>
  );
}
