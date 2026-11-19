import { after, before, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  createDatabase,
  resetFixtures,
  asUser,
  makeSlot,
  people,
  type DB,
} from "./helpers/database";
import { postSchema, imageType } from "../src/features/community/shared";
let db: DB;
before(async () => {
  db = await createDatabase();
});
beforeEach(async () => {
  await resetFixtures(db);
});
after(async () => {
  await db?.close();
});
async function post(author = people.learner, tags = ["dsa"]) {
  const id = randomUUID();
  await asUser(db, author, (a) =>
    a.query(
      "insert into public.community_posts(id,title,body,stuck_on,category,tags) values($1,'Help with dynamic programming','I tried a recursive solution but cannot understand the transition.','Please walk me through the state transition.','coding',$2)",
      [id, tags],
    ),
  );
  return id;
}
async function answer(postId: string, author = people.mentor) {
  const id = randomUUID();
  await asUser(db, author, (a) =>
    a.query(
      "insert into public.community_answers(id,post_id,body) values($1,$2,'Start by defining the state and enumerate the choices from it.')",
      [id, postId],
    ),
  );
  return id;
}
test("community reads are public; anonymous writes and author impersonation fail", async () => {
  const id = await post();
  assert.equal(
    (
      await asUser(
        db,
        null,
        (a) => a.query("select * from community_post_summaries"),
        "anon",
      )
    ).rows.length,
    1,
  );
  await assert.rejects(
    asUser(
      db,
      null,
      (a) =>
        a.query(
          "insert into community_answers(post_id,body) values($1,'An unauthorized answer should not be written')",
          [id],
        ),
      "anon",
    ),
    /permission denied/,
  );
  await assert.rejects(
    asUser(db, people.outsider, (a) =>
      a.query(
        "insert into community_answers(post_id,author_id,body) values($1,$2,'An impersonated answer should not be written')",
        [id, people.mentor],
      ),
    ),
    /row-level security/,
  );
});
test("votes exclude self-voting, remain unique, and reverse derived counts", async () => {
  const id = await post();
  const aid = await answer(id);
  await assert.rejects(
    asUser(db, people.learner, (a) =>
      a.query("insert into community_votes(post_id) values($1)", [id]),
    ),
    /row-level security/,
  );
  await asUser(db, people.outsider, async (a) => {
    await a.query(
      "insert into community_votes(post_id) values($1) on conflict do nothing",
      [id],
    );
    await a.query(
      "insert into community_votes(post_id) values($1) on conflict do nothing",
      [id],
    );
    await a.query("insert into community_votes(answer_id) values($1)", [aid]);
  });
  assert.equal(
    Number(
      (
        await db.query(
          "select upvotes from community_post_summaries where id=$1",
          [id],
        )
      ).rows[0].upvotes,
    ),
    1,
  );
  await asUser(db, people.learner, (a) =>
    a.query("delete from community_votes where post_id=$1", [id]),
  );
  assert.equal(
    Number(
      (
        await db.query(
          "select upvotes from community_post_summaries where id=$1",
          [id],
        )
      ).rows[0].upvotes,
    ),
    1,
  );
  await asUser(db, people.outsider, (a) =>
    a.query("delete from community_votes where post_id=$1", [id]),
  );
  assert.equal(
    Number(
      (
        await db.query(
          "select upvotes from community_post_summaries where id=$1",
          [id],
        )
      ).rows[0].upvotes,
    ),
    0,
  );
});
test("only post owner accepts an answer, and cross-post acceptance fails", async () => {
  const id = await post();
  const aid = await answer(id);
  const other = await post();
  await assert.rejects(
    asUser(db, people.outsider, (a) =>
      a.query("select accept_community_answer($1,$2)", [id, aid]),
    ),
    /NOT_ALLOWED/,
  );
  await assert.rejects(
    asUser(db, people.learner, (a) =>
      a.query("select accept_community_answer($1,$2)", [other, aid]),
    ),
    /INVALID_ANSWER/,
  );
  await asUser(db, people.learner, (a) =>
    a.query("select accept_community_answer($1,$2)", [id, aid]),
  );
  assert.equal(
    (
      await db.query(
        "select accepted_answer_id from community_posts where id=$1",
        [id],
      )
    ).rows[0].accepted_answer_id,
    aid,
  );
  await asUser(db, people.mentor, (a) =>
    a.query("delete from community_answers where id=$1", [aid]),
  );
  assert.equal(
    (
      await db.query(
        "select accepted_answer_id from community_posts where id=$1",
        [id],
      )
    ).rows[0].accepted_answer_id,
    null,
  );
});
test("recommendations require relevance, include new mentors and derive reversible topic evidence", async () => {
  const id = await post();
  await db.query(
    "update mentor_profiles set expertise=array['LeetCode'] where user_id=$1",
    [people.mentor],
  );
  await makeSlot(db);
  let rows = (
    await asUser(
      db,
      null,
      (a) => a.query("select * from recommend_post_mentors($1)", [id]),
      "anon",
    )
  ).rows;
  assert.equal(rows.length, 1);
  assert.equal(rows[0].mentor_id, people.mentor);
  assert.ok(rows[0].next_available);
  const aid = await answer(id, people.secondMentor);
  await asUser(db, people.learner, (a) =>
    a.query("select accept_community_answer($1,$2)", [id, aid]),
  );
  rows = (await db.query("select * from recommend_post_mentors($1)", [id]))
    .rows;
  assert.equal(rows.length, 2);
  await asUser(db, people.learner, (a) =>
    a.query("select accept_community_answer($1,null)", [id]),
  );
  assert.equal(
    (await db.query("select * from recommend_post_mentors($1)", [id])).rows
      .length,
    1,
  );
});
test("image references cannot point to someone else's file or a missing object", async () => {
  const id = randomUUID();
  await assert.rejects(
    asUser(db, people.learner, (a) =>
      a.query(
        "insert into community_posts(id,title,body,stuck_on,category,tags,image_paths) values($1,'A screenshot question','This question includes a screenshot I cannot attach.','Help me read this error.','coding',array['python'],array[$2])",
        [id, `${people.mentor}/${id}/fake.png`],
      ),
    ),
    /INVALID_IMAGE/,
  );
});
test("reports stay private and only authors can delete content", async () => {
  const id = await post();
  await asUser(db, people.outsider, (a) =>
    a.query(
      "insert into community_reports(post_id,reason) values($1,'This post includes inappropriate content.')",
      [id],
    ),
  );
  assert.equal(
    (
      await asUser(db, people.learner, (a) =>
        a.query("select * from community_reports"),
      )
    ).rows.length,
    0,
  );
  await asUser(db, people.outsider, (a) =>
    a.query("delete from community_posts where id=$1", [id]),
  );
  assert.equal(
    (await db.query("select id from community_posts where id=$1", [id])).rows
      .length,
    1,
  );
});
test("post booking preserves context and rejects changing context on a retry", async () => {
  const id = await post();
  const other = await post();
  const slot = await makeSlot(db);
  const key = randomUUID();
  const rows = (
    await asUser(db, people.learner, (a) =>
      a.query("select * from book_post_intro($1,$2,$3)", [id, slot.id, key]),
    )
  ).rows;
  assert.equal(rows[0].source_post_id, id);
  await assert.rejects(
    asUser(db, people.learner, (a) =>
      a.query("select * from book_post_intro($1,$2,$3)", [other, slot.id, key]),
    ),
    /REQUEST_KEY_REUSED/,
  );
  assert.equal(
    (
      await db.query("select source_post_id from bookings where id=$1", [
        rows[0].id,
      ])
    ).rows[0].source_post_id,
    id,
  );
});
test("post input and raster signatures reject unsupported content", () => {
  assert.equal(
    imageType(new TextEncoder().encode('<svg onload="alert(1)">')),
    null,
  );
  assert.equal(
    imageType(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]))?.mime,
    "image/png",
  );
  assert.equal(
    postSchema.safeParse({
      id: randomUUID(),
      title: "A useful question",
      body: "This is detailed context about the problem.",
      stuckOn: "I need a walkthrough.",
      category: "coding",
      tags: ["made-up"],
    }).success,
    false,
  );
});
