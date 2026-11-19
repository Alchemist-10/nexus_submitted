import { before, beforeEach, after, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  createDatabase,
  resetFixtures,
  asUser,
  people,
  type DB,
} from "./helpers/database";
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
const save = (
  actor: string,
  username = "my_handle",
  variant = 3,
  path: string | null = null,
) =>
  asUser(db, actor, (a) =>
    a.query(
      "select update_public_profile('My Name',$1,'Engineering student',$2,$3)",
      [username, variant, path],
    ),
  );
test("new profiles get avatars and expose no account email", async () => {
  const rows = (
    await asUser(db, null, (a) => a.query("select * from profiles"), "anon")
  ).rows;
  assert.equal(rows.length, 4);
  for (const row of rows) {
    assert.ok(
      Number(row.avatar_variant) >= 0 && Number(row.avatar_variant) < 24,
    );
    assert.equal(row.avatar_path, null);
    assert.equal(row.email, undefined);
  }
});
test("authenticated profile editing is self-only and normalized; direct writes and anonymous RPC are denied", async () => {
  await save(people.learner, "  My_Handle  ");
  const rows = (await db.query("select id,username,full_name from profiles"))
    .rows;
  assert.equal(
    rows.find((r) => r.id === people.learner)?.username,
    "my_handle",
  );
  assert.equal(rows.find((r) => r.id === people.mentor)?.full_name, "mentor");
  await assert.rejects(
    asUser(db, people.outsider, (a) =>
      a.query("update profiles set full_name='Impersonated' where id=$1", [
        people.learner,
      ]),
    ),
    /permission denied/,
  );
  await assert.rejects(
    asUser(
      db,
      null,
      (a) =>
        a.query(
          "select update_public_profile('Fake Name','fake_handle','',1,null)",
        ),
      "anon",
    ),
    /permission denied/,
  );
});
test("handles remain unique; invalid variants and unsafe avatar references fail", async () => {
  await save(people.learner);
  await assert.rejects(save(people.mentor), /USERNAME_TAKEN/);
  await assert.rejects(save(people.learner, "bad handle"), /INVALID_PROFILE/);
  await assert.rejects(
    save(people.learner, "my_handle", 24),
    /INVALID_PROFILE/,
  );
  await assert.rejects(
    save(people.learner, "my_handle", 0, `${people.mentor}/profile/photo.png`),
    /INVALID_AVATAR/,
  );
  await assert.rejects(
    save(
      people.learner,
      "my_handle",
      0,
      `${people.learner}/profile/missing.png`,
    ),
    /INVALID_AVATAR/,
  );
  const path = `${people.learner}/profile/photo.png`;
  await db.query(
    "insert into storage.objects(bucket_id,name) values('post-images',$1)",
    [path],
  );
  await save(people.learner, "my_handle", 1, path);
  assert.equal(
    (
      await db.query("select avatar_path from profiles where id=$1", [
        people.learner,
      ])
    ).rows[0].avatar_path,
    path,
  );
});
test("member activity is author-scoped and views carry current profile identity", async () => {
  const first = randomUUID(),
    second = randomUUID(),
    answer = randomUUID();
  for (const [id, author] of [
    [first, people.learner],
    [second, people.outsider],
  ])
    await asUser(db, author, (a) =>
      a.query(
        "insert into community_posts(id,title,body,stuck_on,category,tags) values($1,'Please explain this algorithm','I tried recursion but need help deriving a transition.','Help me reason through the state.','coding',array['dsa'])",
        [id],
      ),
    );
  await asUser(db, people.mentor, (a) =>
    a.query(
      "insert into community_answers(id,post_id,body) values($1,$2,'Start by explaining the meaning of the state in plain language.')",
      [answer, first],
    ),
  );
  await asUser(db, people.learner, (a) =>
    a.query("select accept_community_answer($1,$2)", [first, answer]),
  );
  await save(people.learner);
  const mine = (
    await asUser(
      db,
      null,
      (a) =>
        a.query("select * from community_post_summaries where author_id=$1", [
          people.learner,
        ]),
      "anon",
    )
  ).rows;
  assert.equal(mine.length, 1);
  assert.equal(mine[0].id, first);
  assert.equal(mine[0].author_name, "My Name");
  assert.equal(mine[0].author_avatar_variant, 3);
  const stats = (
    await asUser(
      db,
      null,
      (a) =>
        a.query("select * from member_activity_counts where profile_id=$1", [
          people.mentor,
        ]),
      "anon",
    )
  ).rows[0];
  assert.equal(Number(stats.post_count), 0);
  assert.equal(Number(stats.answer_count), 1);
  assert.equal(Number(stats.helpful_answer_count), 1);
});
