import assert from "node:assert/strict";
import test from "node:test";

import { groupListings, type ListingMember } from "../../jobs/index.ts";

import { rankGroups, searchPlan } from "./search.ts";

test("react developer bangalore needs React, a developer word and Bengaluru", () => {
  assert.deepEqual(searchPlan("react developer bangalore"), {
    groups: [
      ["react", "reactjs", "react.js"],
      ["developer", "engineer", "sde", "programmer"],
      ["bangalore", "bengaluru", "blr"],
    ],
    family: "frontend",
  });
});

test("city aliases match both spellings", () => {
  assert.deepEqual(searchPlan("Gurgaon")?.groups, [["gurgaon", "gurugram"]]);
  assert.deepEqual(searchPlan("bengaluru")?.groups, [["bengaluru", "bangalore", "blr"]]);
});

test("a query implies a family only when its words name one", () => {
  assert.equal(searchPlan("android engineer")?.family, "mobile");
  assert.equal(searchPlan("data engineer")?.family, "data");
  assert.equal(searchPlan("swiggy")?.family, null);
});

test("stop words are dropped and a query of only stop words is searched as typed", () => {
  assert.deepEqual(searchPlan("engineer at swiggy")?.groups, [["engineer", "developer", "sde", "programmer"], ["swiggy"]]);
  assert.deepEqual(searchPlan("the")?.groups, [["the"]]);
  assert.equal(searchPlan("   "), null);
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
