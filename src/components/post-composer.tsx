"use client";
import { useState } from "react";
import { ActionForm } from "./action-form";
import { createPost } from "@/features/community/actions";
import { categories, topics } from "@/features/community/shared";
export function PostComposer({ id }: { id: string }) {
  const [selected, setSelected] = useState<string[]>([]);
  return (
    <ActionForm
      action={createPost}
      submitLabel="Publish & find mentors"
      className="post-composer"
    >
      <input type="hidden" name="id" value={id} />
      <label>
        What do you need help with?
        <input
          name="title"
          minLength={10}
          maxLength={160}
          placeholder="I can solve this with recursion, but I don’t understand the DP approach"
          required
        />
      </label>
      <label>
        Area
        <select name="category" defaultValue="coding">
          {Object.entries(categories).map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Context & what you have tried
        <textarea
          name="body"
          rows={8}
          minLength={20}
          maxLength={10000}
          placeholder="Share the problem, your approach, and any code or explanation you tried. Plain text and code are welcome."
          required
        />
      </label>
      <label>
        Where should a mentor step in?
        <textarea
          name="stuckOn"
          rows={3}
          minLength={10}
          maxLength={2000}
          placeholder="For example: walk me through how to define the state and derive the transition, rather than giving me the solution."
          required
        />
      </label>
      <div>
        <span className="field-label">
          Topics <small>Choose 1–5 to find relevant mentors.</small>
        </span>
        <div className="topic-picker">
          {Object.entries(topics).map(([id, label]) => (
            <label key={id} className={selected.includes(id) ? "selected" : ""}>
              <input
                type="checkbox"
                name="tags"
                value={id}
                checked={selected.includes(id)}
                disabled={selected.length >= 5 && !selected.includes(id)}
                onChange={(e) =>
                  setSelected(
                    e.target.checked
                      ? [...selected, id]
                      : selected.filter((t) => t !== id),
                  )
                }
              />
              {label}
            </label>
          ))}
        </div>
      </div>
      <label>
        Screenshots or diagrams{" "}
        <small>Optional · up to 3 images · 3 MB each</small>
        <input
          name="images"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
        />
      </label>
      <p className="muted public-note">
        Your request, answers, and images will be public. Remove passwords, API
        keys, student IDs, and private information before publishing.
      </p>
    </ActionForm>
  );
}
