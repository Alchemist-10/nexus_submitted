"use client";

import { ActionForm } from "@/components/action-form";
import { createSlot } from "@/features/bookings/actions";
import type { ActionState } from "@/lib/validation";
import { useState } from "react";

async function submitLocalTime(
  state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const start = new Date(String(form.get("localStartsAt")));
  const end = new Date(String(form.get("localEndsAt")));
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()))
    return { error: "Choose a start and end time." };
  const payload = new FormData();
  payload.set("startsAt", start.toISOString());
  payload.set("endsAt", end.toISOString());
  return createSlot(state, payload);
}
export function AvailabilityForm() {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  function changeStart(value: string) {
    setStart(value);
    if (value && (!end || new Date(end) <= new Date(value))) {
      const next = new Date(new Date(value).getTime() + 30 * 60_000);
      const pad = (n: number) => String(n).padStart(2, "0");
      setEnd(
        `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}T${pad(next.getHours())}:${pad(next.getMinutes())}`,
      );
    }
  }
  return (
    <ActionForm action={submitLocalTime} submitLabel="Publish slot">
      <p className="muted">
        Enter times in your device&apos;s timezone. Sessions can last 15–120
        minutes, within the next 90 days.
      </p>
      <label>
        Starts
        <input
          name="localStartsAt"
          type="datetime-local"
          value={start}
          onChange={(event) => changeStart(event.target.value)}
          required
        />
      </label>
      <label>
        Ends
        <input
          name="localEndsAt"
          type="datetime-local"
          value={end}
          onChange={(event) => setEnd(event.target.value)}
          required
        />
      </label>
    </ActionForm>
  );
}
