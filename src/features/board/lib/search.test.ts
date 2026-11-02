import assert from "node:assert/strict";
import test from "node:test";

import { groupListings, type ListingMember } from "../../jobs/index.ts";

import { rankGroups, searchPlan, titleForms } from "./search.ts";

test("react developer bangalore needs React, a developer word and Bengaluru", () => {
  assert.deepEqual(searchPlan("react developer bangalore"), {
    groups: [
      { words: ["react", "reactjs", "react.js"], skill: true },
      { words: ["developer", "engineer", "sde", "programmer"], skill: false },
      { words: ["bangalore", "bengaluru", "blr"], skill: false },
    ],
    family: "frontend",
  });
});

test("city aliases match both spellings", () => {
  assert.deepEqual(searchPlan("Gurgaon")?.groups.map((group) => group.words), [["gurgaon", "gurugram"]]);
  assert.deepEqual(searchPlan("bengaluru")?.groups.map((group) => group.words), [["bengaluru", "bangalore", "blr"]]);
});

test("a query implies a family only when its words name one", () => {
  assert.equal(searchPlan("android engineer")?.family, "mobile");
  assert.equal(searchPlan("data engineer")?.family, "data");
  assert.equal(searchPlan("swiggy")?.family, null);
});

test("stop words are dropped and a query of only stop words is searched as typed", () => {
  assert.deepEqual(
    searchPlan("engineer at swiggy")?.groups.map((group) => group.words),
    [["engineer", "developer", "sde", "programmer"], ["swiggy"]],
  );
  assert.deepEqual(searchPlan("the")?.groups.map((group) => group.words), [["the"]]);
  assert.equal(searchPlan("   "), null);
});

test("two words that name one thing are read as one term", () => {
  assert.deepEqual(searchPlan("machine learning engineer")?.groups.map((group) => group.words), [
    ["machine learning", "ml"],
    ["engineer", "developer", "sde", "programmer"],
  ]);
  assert.deepEqual(searchPlan("front end developer")?.groups[0]?.words, ["front end", "frontend"]);
});

test("only skills may match the description", () => {
  const flags = (text: string) => searchPlan(text)?.groups.map((group) => group.skill);
  assert.deepEqual(flags("python developer"), [true, false]);
  assert.deepEqual(flags("product manager"), [false, false]);
  assert.deepEqual(flags("designer"), [false]);
  assert.deepEqual(flags("ml engineer"), [false, false]);
  assert.deepEqual(flags("js"), [true]);
});

test("title words also match their plural or singular", () => {
  assert.deepEqual(titleForms(["manager"]), ["manager", "managers"]);
  assert.deepEqual(titleForms(["designers"]), ["designers", "designer"]);
  assert.deepEqual(titleForms(["sales"]), ["sales", "sale"]);
});

test("short words, phrases and words with symbols are matched as typed", () => {
  assert.deepEqual(titleForms(["ml", "machine learning"]), ["ml", "machine learning"]);
  assert.deepEqual(titleForms(["react", "react.js"]), ["react", "reacts", "react.js"]);
});

function member(slug: string, postedAt: string, dedupeKey: string | null = null): ListingMember {
  return { slug, dedupeKey, city: null, location: null, isRemote: false, postedAt: new Date(postedAt), applyUrl: null };
}

test("groups are ordered by best score, then by recency", () => {
  const rows = [
    member("old-strong", "2026-01-01"),
    member("new-weak", "2026-10-01"),
    member("mid-strong", "2026-06-01"),
  ];
  const scores = new Map([
    ["old-strong", 2.4],
    ["new-weak", 1.5],
    ["mid-strong", 2.4],
  ]);
  const ranked = rankGroups(groupListings(rows), (row) => scores.get(row.slug) ?? 0);
  assert.deepEqual(
    ranked.map((group) => group.representative.slug),
    ["mid-strong", "old-strong", "new-weak"],
  );
});

test("a multi-city group ranks by its best-matching member", () => {
  const rows = [
    { ...member("pune", "2026-10-01", "k"), city: "Pune" },
    { ...member("blr", "2026-09-01", "k"), city: "Bengaluru" },
    member("other", "2026-10-15"),
  ];
  const scores = new Map([
    ["pune", 1],
    ["blr", 3],
    ["other", 2],
  ]);
  const ranked = rankGroups(groupListings(rows), (row) => scores.get(row.slug) ?? 0);
  assert.deepEqual(
    ranked.map((group) => group.members.map((item) => item.slug)),
    [["pune", "blr"], ["other"]],
  );
});
