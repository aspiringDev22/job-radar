import assert from "node:assert/strict";
import test from "node:test";

import { descriptionMatchesLabel, headline, rangeLabel, syncedAgo } from "./format.ts";

test("the board headline counts live roles across companies", () => {
  assert.equal(
    headline({ totalRoles: 3524, companyCount: 62, filtered: false, company: null }),
    "3,524 live roles across 62 companies, read from their own career pages.",
  );
});

test("filters turn live roles into matching roles", () => {
  assert.equal(
    headline({ totalRoles: 1, companyCount: 1, filtered: true, company: null }),
    "1 matching role across 1 company, read from their own career pages.",
  );
});

test("a picked company gets its own count", () => {
  assert.equal(
    headline({ totalRoles: 3524, companyCount: 62, filtered: false, company: { name: "Freshworks", openRoles: 142 } }),
    "142 roles at Freshworks, read from its own careers page.",
  );
  assert.equal(
    headline({ totalRoles: 40, companyCount: 9, filtered: true, company: { name: "Freshworks", openRoles: 12 } }),
    "12 matching roles at Freshworks, read from its own careers page.",
  );
});

test("the range label shows where a page sits in the list", () => {
  assert.equal(rangeLabel({ page: 1, pageSize: 50, total: 3027 }), "1–50 of 3,027 roles");
  assert.equal(rangeLabel({ page: 61, pageSize: 50, total: 3027 }), "3,001–3,027 of 3,027 roles");
});

test("a list that fits on one page shows only its count", () => {
  assert.equal(rangeLabel({ page: 1, pageSize: 50, total: 50 }), "50 roles");
  assert.equal(rangeLabel({ page: 1, pageSize: 50, total: 1 }), "1 role");
});

test("the description note counts the roles a search left out", () => {
  assert.equal(descriptionMatchesLabel(1541), "1,541 more roles mention your search only in the description.");
  assert.equal(descriptionMatchesLabel(1), "1 more role mentions your search only in the description.");
});

test("the live badge says how long ago the last sync finished", () => {
  const now = new Date("2026-11-01T12:00:00.000Z");
  assert.equal(syncedAgo(null, now), "not synced yet");
  assert.equal(syncedAgo(new Date("2026-11-01T11:59:40.000Z"), now), "updated just now");
  assert.equal(syncedAgo(new Date("2026-11-01T11:35:00.000Z"), now), "updated 25 min ago");
  assert.equal(syncedAgo(new Date("2026-11-01T11:00:00.000Z"), now), "updated 1 hour ago");
  assert.equal(syncedAgo(new Date("2026-11-01T02:00:00.000Z"), now), "updated 10 hours ago");
  assert.equal(syncedAgo(new Date("2026-10-30T12:00:00.000Z"), now), "updated 2 days ago");
});
