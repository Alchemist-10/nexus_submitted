import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import {
  literalSearchPattern,
  normalizeSearch,
  postSearchFilter,
} from "../src/features/community/search";

let db: PGlite;
before(() => {
  db = new PGlite();
});
after(async () => {
  await db.close();
});

test("search normalizes URL input, bounds work, and leaves blank searches unfiltered", () => {
  assert.equal(normalizeSearch(["  DSA  ", "ignored"]), "DSA");
  assert.equal(normalizeSearch({ q: "DSA" }), "");
  assert.equal(normalizeSearch("x".repeat(500)).length, 100);
  assert.equal(normalizeSearch(" a\u0000b\n "), "a b");
  assert.equal(postSearchFilter(" \t\n "), null);
});

test("PostgREST values stay quoted even for filter-looking punctuation", () => {
  for (const term of [
    "a,b",
    '"),title.not.is.null,("',
    "back\\slash",
    "C++",
    "(n+1)",
    "*",
    "100%",
    "_",
    "/",
  ]) {
    const filter = postSearchFilter(term)!;
    const values = [...filter.matchAll(/"(?:\\.|[^"\\])*"/g)].map(([value]) =>
      JSON.parse(value),
    );
    assert.deepEqual(values, Array(3).fill(literalSearchPattern(term)));
    assert.equal(
      filter.replace(/"(?:\\.|[^"\\])*"/g, '"<literal>"'),
      'title.imatch."<literal>",body.imatch."<literal>",stuck_on.imatch."<literal>"' +
        (term === "C++" ? ",tags.ov.{cpp}" : ""),
    );
  }
  assert.ok(postSearchFilter("DSA")!.endsWith("tags.ov.{dsa}"));
  assert.ok(
    postSearchFilter("machine learning")!.endsWith(
      "tags.ov.{machine-learning}",
    ),
  );
});

test("Postgres search treats programming punctuation as literal text rather than patterns", async () => {
  const cases = [
    {
      term: "C++",
      yes: "Need help with C++ pointers",
      no: "Need help with C pointers",
    },
    { term: "100%", yes: "100% coverage", no: "100x coverage" },
    {
      term: "array[i]",
      yes: "Why is array[i] wrong?",
      no: "Why is arrayi wrong?",
    },
    { term: "a.b", yes: "a.b property", no: "acb property" },
    { term: "(n+1)", yes: "Explain (n+1)", no: "Explain nnn1" },
    { term: "\\d", yes: "Explain \\d in regex", no: "Explain 7 in regex" },
    { term: "*", yes: "O(n*m)", no: "A different problem" },
    { term: "_", yes: "train_test_split", no: "train-test-split" },
  ];
  for (const { term, yes, no } of cases) {
    const result = await db.query<{ value: string }>(
      "select value from unnest($1::text[]) as value where value ~* $2",
      [[yes, no], literalSearchPattern(term)],
    );
    assert.deepEqual(
      result.rows.map((r) => r.value),
      [yes],
      term,
    );
  }
});
