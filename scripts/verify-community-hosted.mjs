import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
const manifest = process.argv[process.argv.indexOf("--fixtures") + 1];
assert.ok(
  process.argv.includes("--fixtures") && manifest,
  "Explicit temporary fixture manifest required",
);
const fixture = JSON.parse(await readFile(manifest, "utf8"));
const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
  key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
assert.equal(new URL(url).hostname, `${fixture.projectRef}.supabase.co`);
assert.equal(fixture.users.length, 3);
assert.ok(fixture.users.every((u) => u.email.endsWith("@example.test")));
const clients = {},
  checks = [];
const client = () =>
  createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
function pass(name) {
  checks.push(name);
  console.log(`PASS ${name}`);
}
function ok(result) {
  assert.equal(result.error, null, result.error?.message);
  return result.data;
}
const mentor = fixture.users.find((u) => u.role === "mentor"),
  learner = fixture.users.find((u) => u.role === "learner");
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aY1sAAAAASUVORK5CYII=",
  "base64",
);
try {
  for (const u of fixture.users) {
    clients[u.role] = client();
    ok(
      await clients[u.role].auth.signInWithPassword({
        email: u.email,
        password: u.password,
      }),
    );
  }
  pass("Real authenticated community accounts");
  ok(
    await clients.mentor.rpc("save_mentor_profile", {
      p_headline: "DSA walkthroughs for engineering students",
      p_bio: "Temporary community integration fixture. Removed after tests.",
      p_expertise: ["DSA", "Python"],
    }),
  );
  const start = new Date(Date.now() + 86400000);
  const [slot] = ok(
    await clients.mentor.rpc("create_availability", {
      p_starts_at: start.toISOString(),
      p_ends_at: new Date(+start + 1800000).toISOString(),
    }),
  );
  const postId = randomUUID(),
    path = `${learner.id}/${postId}/${randomUUID()}.png`;
  assert.ok(
    (
      await clients.outsider.storage
        .from("post-images")
        .upload(path, png, { contentType: "image/png" })
    ).error,
  );
  assert.ok(
    (
      await clients.learner.storage
        .from("post-images")
        .upload(`${learner.id}/${postId}/unsafe.svg`, Buffer.from("<svg/>"), {
          contentType: "image/svg+xml",
        })
    ).error,
  );
  assert.ok(
    (
      await client()
        .storage.from("post-images")
        .upload(path, png, { contentType: "image/png" })
    ).error,
  );
  ok(
    await clients.learner.storage
      .from("post-images")
      .upload(path, png, { contentType: "image/png" }),
  );
  const publicUrl = clients.learner.storage
    .from("post-images")
    .getPublicUrl(path).data.publicUrl;
  assert.equal((await fetch(publicUrl)).status, 200);
  pass(
    "Actual Storage accepts public raster image; rejects SVG, anonymous and cross-owner uploads",
  );
  ok(
    await clients.learner.from("community_posts").insert({
      id: postId,
      author_id: learner.id,
      title: "I need a mentor to walk through the dynamic programming approach",
      body: "I can write the recursive solution to this problem, but I cannot derive the DP transition. I have tried drawing the recursion tree.",
      stuck_on:
        "Please walk me through choosing the state and converting recursion to tabulation.",
      category: "coding",
      tags: ["dsa", "python"],
      image_paths: [path],
    }),
  );
  const visible = ok(
    await client()
      .from("community_post_summaries")
      .select("*")
      .eq("id", postId),
  );
  assert.equal(visible.length, 1);
  assert.ok(
    (
      await clients.outsider.from("community_posts").insert({
        id: randomUUID(),
        author_id: learner.id,
        title: "This author must not be impersonated",
        body: "This impersonated content must never become a public post.",
        stuck_on: "This action must not succeed.",
        category: "coding",
        tags: ["dsa"],
      })
    ).error,
  );
  pass("Public feed works while author impersonation is denied");
  const matches = ok(
    await client().rpc("recommend_post_mentors", { p_post_id: postId }),
  );
  assert.ok(
    matches.some(
      (m) =>
        m.mentor_id === mentor.id &&
        m.matched_tags.includes("dsa") &&
        m.next_available,
    ),
  );
  pass(
    "Real post recommendations match expertise and open introductory availability",
  );
  const aid = randomUUID();
  ok(
    await clients.mentor.from("community_answers").insert({
      id: aid,
      post_id: postId,
      author_id: mentor.id,
      body: "Let us define the state as the best result for the first i elements. Then compare the choices available at each state before writing the recurrence.",
    }),
  );
  ok(
    await clients.learner
      .from("community_votes")
      .upsert(
        { voter_id: learner.id, answer_id: aid },
        { onConflict: "voter_id,answer_id", ignoreDuplicates: true },
      ),
  );
  ok(
    await clients.learner
      .from("community_votes")
      .upsert(
        { voter_id: learner.id, answer_id: aid },
        { onConflict: "voter_id,answer_id", ignoreDuplicates: true },
      ),
  );
  assert.ok(
    (
      await clients.mentor
        .from("community_votes")
        .insert({ voter_id: mentor.id, answer_id: aid })
    ).error,
  );
  assert.equal(
    ok(
      await client()
        .from("community_answer_summaries")
        .select("upvotes")
        .eq("id", aid),
    )[0].upvotes,
    1,
  );
  pass("Answers and idempotent upvotes work; self-voting denied");
  assert.ok(
    (
      await clients.outsider.rpc("accept_community_answer", {
        p_post_id: postId,
        p_answer_id: aid,
      })
    ).error,
  );
  ok(
    await clients.learner.rpc("accept_community_answer", {
      p_post_id: postId,
      p_answer_id: aid,
    }),
  );
  const evidence = ok(
    await client().rpc("recommend_post_mentors", { p_post_id: postId }),
  ).find((m) => m.mentor_id === mentor.id);
  assert.equal(evidence.accepted_answers, 1);
  assert.equal(evidence.answer_upvotes, 1);
  ok(
    await clients.learner.rpc("accept_community_answer", {
      p_post_id: postId,
      p_answer_id: null,
    }),
  );
  pass(
    "Acceptance is owner-only and mentor evidence derives from actual contributions",
  );
  const [booking] = ok(
    await clients.learner.rpc("book_post_intro", {
      p_post_id: postId,
      p_slot_id: slot.id,
      p_request_key: randomUUID(),
    }),
  );
  assert.equal(booking.source_post_id, postId);
  assert.equal(
    ok(await clients.outsider.from("bookings").select("*").eq("id", booking.id))
      .length,
    0,
  );
  ok(
    await clients.learner.rpc("cancel_free_intro", {
      p_booking_id: booking.id,
    }),
  );
  pass(
    "Context-preserving free booking remains participant-private and cancellable",
  );
  ok(
    await clients.outsider.from("community_reports").insert({
      post_id: postId,
      reporter_id: fixture.users.find((u) => u.role === "outsider").id,
      reason: "Temporary report for authorization verification.",
    }),
  );
  assert.equal(
    ok(
      await clients.learner
        .from("community_reports")
        .select("*")
        .eq("post_id", postId),
    ).length,
    0,
  );
  assert.ok(
    (await clients.outsider.storage.from("post-images").remove([path])).error ||
      (await fetch(publicUrl)).status === 200,
  );
  pass("Reports stay private; another member cannot delete the image");
  fixture.browser = {
    postId,
    answerId: aid,
    mentorId: mentor.id,
    slotId: slot.id,
    imagePath: path,
  };
  await writeFile(manifest, JSON.stringify(fixture));
  await writeFile(
    "artifacts/community-hosted-results.json",
    JSON.stringify(
      { projectRef: fixture.projectRef, run: fixture.run, checks },
      null,
      2,
    ),
  );
  console.log(`${checks.length} hosted community checks passed.`);
} finally {
  for (const c of Object.values(clients)) ok(await c.auth.signOut());
}
