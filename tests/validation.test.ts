import { test } from "node:test";
import assert from "node:assert/strict";
import {
  safeNext,
  bookingSchema,
  slotSchema,
  signUpSchema,
  meetingSchema,
  databaseError,
} from "../src/lib/validation";

test("redirect targets stay on the app origin", () => {
  for (const target of [
    "https://evil.test",
    "//evil.test",
    "/\\evil.test",
    "/\nevil.test",
    null,
  ])
    assert.equal(safeNext(target), "/dashboard");
  assert.equal(safeNext("/mentors/a?from=login"), "/mentors/a?from=login");
});
test("booking requires a slot UUID and a retry UUID", () => {
  assert.equal(
    bookingSchema.safeParse({ slotId: "not-a-slot", requestKey: "bad" })
      .success,
    false,
  );
});
test("availability requires timezone offsets and a valid duration", () => {
  assert.equal(
    slotSchema.safeParse({
      startsAt: "2026-12-01T10:00:00",
      endsAt: "2026-12-01T10:30:00",
    }).success,
    false,
  );
  assert.equal(
    slotSchema.safeParse({
      startsAt: "2026-12-01T10:00:00+05:30",
      endsAt: "2026-12-01T10:30:00+05:30",
    }).success,
    true,
  );
  assert.equal(
    slotSchema.safeParse({
      startsAt: "2026-12-01T10:30:00Z",
      endsAt: "2026-12-01T10:00:00Z",
    }).success,
    false,
  );
});
test("signup validates name, email, and password length", () => {
  assert.equal(
    signUpSchema.safeParse({
      fullName: "Akshay",
      email: "a@example.com",
      password: "short",
    }).success,
    false,
  );
  assert.equal(
    signUpSchema.safeParse({
      fullName: "Akshay",
      email: "a@example.com",
      password: "a-longer-password",
    }).success,
    true,
  );
});
test("meeting links require HTTPS without embedded credentials", () => {
  const bookingId = "10000000-0000-4000-8000-000000000001";
  for (const joinUrl of [
    "javascript:alert(1)",
    "http://example.com",
    "https://user:pass@example.com",
  ])
    assert.equal(
      meetingSchema.safeParse({ bookingId, joinUrl }).success,
      false,
    );
  assert.equal(
    meetingSchema.safeParse({
      bookingId,
      joinUrl: "https://meet.google.com/example",
    }).success,
    true,
  );
});
test("unexpected database errors are not exposed to users", () => {
  assert.equal(
    databaseError("sensitive internal SQL details"),
    "We could not complete that request. Please try again.",
  );
});
