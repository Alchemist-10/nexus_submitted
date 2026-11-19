"use client";
import { useState } from "react";
import { Star } from "lucide-react";
import { ActionForm } from "@/components/action-form";
import { rateMentor } from "@/features/bookings/actions";
export function RateMentorForm({ bookingId }: { bookingId: string }) {
  const [selected, setSelected] = useState(0);
  return (
    <div className="session-rating">
      <ActionForm action={rateMentor} submitLabel="Submit rating" secondary>
        <input type="hidden" name="bookingId" value={bookingId} />
        <fieldset className="rating-group">
          <legend>Rate your mentor</legend>
          <p className="muted">
            How helpful was this session? Choose 1–5 stars. You can submit once.
          </p>
          <div className="rating-options">
            {[1, 2, 3, 4, 5].map((score) => (
              <label
                className={`rating-choice ${selected === score ? "selected" : ""}`}
                key={score}
              >
                <input
                  type="radio"
                  name="score"
                  value={score}
                  required
                  checked={selected === score}
                  onChange={() => setSelected(score)}
                  aria-label={`${score} out of 5 stars`}
                />
                <Star
                  size={19}
                  aria-hidden="true"
                  fill={score <= selected ? "currentColor" : "none"}
                />
                <span>{score}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </ActionForm>
    </div>
  );
}
