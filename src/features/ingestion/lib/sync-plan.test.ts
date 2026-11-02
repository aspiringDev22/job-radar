import assert from "node:assert/strict";
import test from "node:test";

import {
  EMPTY_FEED_GUARD_MIN_OPEN,
  holdEmptyFeed,
  planSuccessfulSync,
  rolesClosedAfterFetch,
  type TrackedRole,
} from "./sync-plan.ts";

function role(overrides: Partial<TrackedRole> & Pick<TrackedRole, "externalId">): TrackedRole {
  return {
    slug: overrides.externalId,
    title: "Engineer",
    isActive: true,
    status: "open",
    ...overrides,
  };
}

test("a role missing from a successful sync is closed", () => {
  const existing = [role({ externalId: "keep" }), role({ externalId: "gone" })];
  const closed = rolesClosedAfterFetch(true, existing, ["keep"]);
  assert.deepEqual(closed.map((item) => item.externalId), ["gone"]);
});

test("a failed sync does not close roles", () => {
  const existing = [role({ externalId: "keep" }), role({ externalId: "still-open" })];
  assert.deepEqual(rolesClosedAfterFetch(false, existing, []), []);
});

test("a role that reappears is open again", () => {
  const existing = [
    role({ externalId: "back", isActive: false, status: "closed" }),
    role({ externalId: "still-open" }),
  ];
  const plan = planSuccessfulSync(existing, ["back", "still-open"]);
  assert.deepEqual(plan.reopening.map((item) => item.externalId), ["back"]);
  assert.deepEqual(plan.closing, []);
});

test("a closed role stays closed until it is seen again", () => {
  const existing = [role({ externalId: "old", isActive: false, status: "closed" })];
  const plan = planSuccessfulSync(existing, []);
  assert.deepEqual(plan.closing, []);
  assert.deepEqual(plan.reopening, []);
});

test("an empty feed for a company with many open roles is held, not closed", () => {
  assert.equal(holdEmptyFeed(0, 40, 38), true);
  assert.equal(holdEmptyFeed(0, 40, null), true);
});

test("the second empty sync in a row agrees, and the roles close", () => {
  assert.equal(holdEmptyFeed(0, 40, 0), false);
});

test("small boards and non-empty feeds are never held", () => {
  assert.equal(holdEmptyFeed(0, EMPTY_FEED_GUARD_MIN_OPEN, 12), false);
  assert.equal(holdEmptyFeed(3, 40, 38), false);
});
