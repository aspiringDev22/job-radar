import assert from "node:assert/strict";
import test from "node:test";

import { compareFeedHealth, feedHealth, type FeedHealthInput } from "./feed-health.ts";

const NOW = Date.parse("2026-10-31T00:00:00.000Z");

function feed(overrides: Partial<FeedHealthInput> & Pick<FeedHealthInput, "name">): FeedHealthInput {
  return {
    consecutiveFailures: 0,
    openRoles: 12,
    datedRoles: 12,
    newestPostedAt: new Date("2026-10-20T00:00:00.000Z"),
    ...overrides,
  };
}

test("a Cars24 style feed whose only posting is from 2018 is stale", () => {
  const health = feedHealth(
    feed({ name: "Cars24", openRoles: 1, datedRoles: 1, newestPostedAt: new Date("2018-06-01T00:00:00.000Z") }),
    NOW,
  );
  assert.equal(health.status, "stale");
  assert.deepEqual(health.reasons, ["No role posted in the last 12 months"]);
});

test("a Shipsy style board last updated in 2024 is stale", () => {
  const health = feedHealth(
    feed({ name: "Shipsy", openRoles: 4, datedRoles: 4, newestPostedAt: new Date("2024-08-14T00:00:00.000Z") }),
    NOW,
  );
  assert.equal(health.status, "stale");
});

test("three failed syncs in a row make a feed stale", () => {
  const health = feedHealth(feed({ name: "Apna", consecutiveFailures: 3 }), NOW);
  assert.equal(health.status, "stale");
  assert.deepEqual(health.reasons, ["Last 3 syncs failed"]);
});

test("one or two failures are a warning, not stale", () => {
  assert.equal(feedHealth(feed({ name: "Apna", consecutiveFailures: 1 }), NOW).status, "failing");
  assert.deepEqual(feedHealth(feed({ name: "Apna", consecutiveFailures: 2 }), NOW).reasons, ["Last 2 syncs failed"]);
});

test("a role posted just inside 12 months keeps the feed healthy", () => {
  const health = feedHealth(feed({ name: "Mettl", newestPostedAt: new Date("2025-11-01T00:00:00.000Z") }), NOW);
  assert.equal(health.status, "ok");
  assert.deepEqual(health.reasons, []);
});

test("a board with no open roles is stale", () => {
  const health = feedHealth(feed({ name: "Empty", openRoles: 0, datedRoles: 0, newestPostedAt: null }), NOW);
  assert.equal(health.status, "stale");
  assert.deepEqual(health.reasons, ["No open roles"]);
});

test("roles without posting dates are not judged on age", () => {
  const health = feedHealth(feed({ name: "Undated", datedRoles: 0, newestPostedAt: null }), NOW);
  assert.equal(health.status, "ok");
  assert.deepEqual(health.reasons, ["Roles carry no posting date"]);
});

test("worst health sorts first", () => {
  const rows = [
    feed({ name: "Healthy" }),
    feed({ name: "Warning", consecutiveFailures: 1 }),
    feed({ name: "Old", newestPostedAt: new Date("2023-01-01T00:00:00.000Z") }),
    feed({ name: "Broken", consecutiveFailures: 4 }),
    feed({ name: "Older", newestPostedAt: new Date("2019-01-01T00:00:00.000Z") }),
  ].map((row) => ({ ...row, health: feedHealth(row, NOW) }));
  rows.sort(compareFeedHealth);
  assert.deepEqual(
    rows.map((row) => row.name),
    ["Broken", "Older", "Old", "Warning", "Healthy"],
  );
});
