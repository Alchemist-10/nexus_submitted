import assert from "node:assert/strict";
import { test } from "node:test";
import { sessionView } from "../src/features/bookings/presentation";
import {
  expertiseLabel,
  matchesMentorTopic,
} from "../src/features/mentorship/presentation";

const now = Date.parse("2026-11-19T10:00:00Z");
const future = "2026-11-20T10:00:00Z";
const past = "2026-11-18T10:00:00Z";

test("mentor filters handle existing free-text expertise as well as topic keys", () => {
  for (const skill of ["DSA", "dsa", "LeetCode", "DSA / LeetCode"])
    assert.equal(matchesMentorTopic([skill], "dsa"), true);
  assert.equal(
    matchesMentorTopic(["Machine learning", "Python"], "machine-learning"),
    true,
  );
  assert.equal(matchesMentorTopic(["ML"], "machine-learning"), true);
  assert.equal(matchesMentorTopic(["Python"], "java"), false);
  assert.equal(matchesMentorTopic(["Python"], "unknown-topic"), false);
  assert.equal(matchesMentorTopic(["Python"], "__proto__"), false);
  assert.equal(expertiseLabel("DSA"), "DSA / LeetCode");
  assert.equal(expertiseLabel("Custom speciality"), "Custom speciality");
});
test("confirmed sessions remain upcoming until their end, then move to history without changing status", () => {
  assert.equal(
    sessionView({ status: "confirmed", ends_at: future }, undefined, now),
    "upcoming",
  );
  assert.equal(
    sessionView({ status: "confirmed", ends_at: past }, undefined, now),
    "history",
  );
  assert.equal(
    sessionView(
      { status: "confirmed", ends_at: new Date(now).toISOString() },
      undefined,
      now,
    ),
    "history",
  );
});
test("checkout and refund attention take precedence, with resolved payments going to history", () => {
  assert.equal(
    sessionView(
      { status: "awaiting_payment", ends_at: future },
      undefined,
      now,
    ),
    "pending",
  );
  for (const state of ["refund_pending", "action_required"])
    assert.equal(
      sessionView({ status: "cancelled", ends_at: past }, { state }, now),
      "pending",
    );
  assert.equal(
    sessionView(
      { status: "cancelled", ends_at: future },
      { state: "refunded" },
      now,
    ),
    "history",
  );
  assert.equal(
    sessionView({ status: "completed", ends_at: past }, { state: "paid" }, now),
    "history",
  );
});
