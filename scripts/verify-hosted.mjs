import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

// Opt-in integration run against explicitly provisioned, temporary .test users.
// Never uses a service-role key or resets a hosted database.
const args = process.argv.slice(2);
const manifestPath = args[args.indexOf("--fixtures") + 1];
if (!args.includes("--fixtures") || !manifestPath) {
  throw new Error("Provide --fixtures <ignored temporary fixture manifest>.");
}
const fixture = JSON.parse(await readFile(manifestPath, "utf8"));
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
assert.ok(url && key && fixture.projectRef);
assert.equal(new URL(url).hostname, `${fixture.projectRef}.supabase.co`);
assert.equal(fixture.users.length, 3);
assert.ok(fixture.users.every((user) => user.email.endsWith("@example.test")));

const clients = {};
const results = [];
const passed = (name) => {
  results.push({ name, passed: true });
  console.log(`PASS ${name}`);
};
const client = () =>
  createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
async function rpc(actor, name, params) {
  const result = await clients[actor].rpc(name, params);
  if (result.error) throw new Error(`${name}: ${result.error.message}`);
  return result.data;
}
async function rejectRpc(actor, name, params, message) {
  const { error } = await clients[actor].rpc(name, params);
  assert.ok(error, `${name} should fail`);
  assert.ok(
    error.message.includes(message),
    `${name}: expected ${message}, got ${error.message}`,
  );
}
const mentor = fixture.users.find((user) => user.role === "mentor");
const learner = fixture.users.find((user) => user.role === "learner");
const outsiders = fixture.users.find((user) => user.role === "outsider");
assert.ok(mentor && learner && outsiders);

try {
  const settingsResponse = await fetch(`${url}/auth/v1/settings`, {
    headers: { apikey: key },
  });
  assert.equal(settingsResponse.status, 200);
  const settings = await settingsResponse.json();
  results.push({
    name: "Hosted Auth settings reachable",
    passed: true,
    emailConfirmationRequired: !settings.mailer_autoconfirm,
  });

  const invalid = await client().auth.signInWithPassword({
    email: learner.email,
    password: "deliberately-wrong-test-password",
  });
  assert.ok(invalid.error);
  passed("Invalid password rejected");

  for (const user of fixture.users) {
    const instance = client();
    const { data, error } = await instance.auth.signInWithPassword({
      email: user.email,
      password: user.password,
    });
    assert.equal(error, null, `Sign-in failed for temporary ${user.role}`);
    assert.equal(data.user?.id, user.id);
    const verified = await instance.auth.getUser();
    assert.equal(verified.data.user?.id, user.id);
    clients[user.role] = instance;
  }
  passed(
    "Real Supabase password sign-in and server-verified identity for three temporary accounts",
  );

  await rpc("mentor", "save_mentor_profile", {
    p_headline: "Temporary integration test mentor",
    p_bio: "Automatically removed after verification.",
    p_expertise: ["Integration testing"],
  });
  const slots = [];
  for (const minutes of [24 * 60, 25 * 60, 10]) {
    const start = new Date(Date.now() + minutes * 60_000);
    const [slot] = await rpc("mentor", "create_availability", {
      p_starts_at: start.toISOString(),
      p_ends_at: new Date(start.getTime() + 30 * 60_000).toISOString(),
    });
    slots.push(slot);
  }
  passed("Mentor profile publication and availability creation");

  const anon = client();
  const available = await anon.rpc("get_available_slots", {
    p_mentor_id: mentor.id,
  });
  assert.equal(available.error, null);
  assert.equal(available.data.length, 3);
  const forbidden = await anon.rpc("book_free_intro", {
    p_slot_id: slots[0].id,
    p_request_key: randomUUID(),
  });
  assert.ok(forbidden.error);
  passed(
    "Anonymous availability discovery permitted; anonymous booking denied",
  );

  const request = randomUUID();
  const [first] = await rpc("learner", "book_free_intro", {
    p_slot_id: slots[0].id,
    p_request_key: request,
  });
  assert.equal(first.status, "confirmed");
  const [retry] = await rpc("learner", "book_free_intro", {
    p_slot_id: slots[0].id,
    p_request_key: request,
  });
  assert.equal(retry.id, first.id);
  await rejectRpc(
    "learner",
    "book_free_intro",
    { p_slot_id: slots[1].id, p_request_key: randomUUID() },
    "TRIAL_UNAVAILABLE",
  );
  await rejectRpc(
    "outsider",
    "book_free_intro",
    { p_slot_id: slots[0].id, p_request_key: randomUUID() },
    "SLOT_UNAVAILABLE",
  );
  passed(
    "Free introduction confirmed, retries idempotent, second trial and duplicate booking rejected",
  );

  const privateRows = await clients.outsider
    .from("bookings")
    .select("*")
    .eq("id", first.id);
  assert.equal(privateRows.error, null);
  assert.equal(privateRows.data.length, 0);
  const directWrite = await clients.learner
    .from("bookings")
    .delete()
    .eq("id", first.id);
  assert.ok(directWrite.error);
  passed("Hosted RLS hides other users' bookings and blocks direct mutation");

  await rpc("learner", "cancel_free_intro", { p_booking_id: first.id });
  const [near] = await rpc("learner", "book_free_intro", {
    p_slot_id: slots[2].id,
    p_request_key: randomUUID(),
  });
  await rpc("mentor", "set_booking_meeting", {
    p_booking_id: near.id,
    p_join_url: "https://meet.google.com/nexus-integration-test",
  });
  const joinUrl = await rpc("learner", "get_booking_join_url", {
    p_booking_id: near.id,
  });
  assert.equal(joinUrl, "https://meet.google.com/nexus-integration-test");
  await rejectRpc(
    "outsider",
    "get_booking_join_url",
    { p_booking_id: near.id },
    "NOT_ALLOWED",
  );
  const rawMeeting = await clients.learner.from("booking_meetings").select("*");
  assert.ok(rawMeeting.error);
  await rpc("learner", "cancel_free_intro", { p_booking_id: near.id });
  await rejectRpc(
    "learner",
    "get_booking_join_url",
    { p_booking_id: near.id },
    "OUTSIDE_JOIN_WINDOW",
  );
  passed(
    "Cancellation restores the trial; meeting access is private and revoked on cancellation",
  );

  const race = await Promise.all([
    clients.learner.rpc("book_free_intro", {
      p_slot_id: slots[0].id,
      p_request_key: randomUUID(),
    }),
    clients.outsider.rpc("book_free_intro", {
      p_slot_id: slots[0].id,
      p_request_key: randomUUID(),
    }),
  ]);
  assert.equal(race.filter((result) => !result.error).length, 1);
  assert.equal(
    race.filter((result) => result.error?.message.includes("SLOT_UNAVAILABLE"))
      .length,
    1,
  );
  const winner = race.find((result) => !result.error).data[0];
  await rpc("mentor", "cancel_free_intro", { p_booking_id: winner.id });
  passed("Concurrent real HTTP booking attempts produce exactly one winner");

  await rpc("mentor", "close_availability", { p_slot_id: slots[2].id });
  fixture.browser = {
    mentorId: mentor.id,
    slotId: slots[0].id,
    startsAt: slots[0].starts_at,
    endsAt: slots[0].ends_at,
  };
  await writeFile(manifestPath, JSON.stringify(fixture));
  await writeFile(
    "artifacts/hosted-api-results.json",
    JSON.stringify(
      { projectRef: fixture.projectRef, run: fixture.run, results },
      null,
      2,
    ),
  );
  console.log(`Hosted verification complete: ${results.length} checks passed.`);
} finally {
  for (const instance of Object.values(clients)) {
    const { error } = await instance.auth.signOut();
    assert.equal(error, null, "Temporary session sign-out failed");
  }
}
