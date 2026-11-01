import assert from "node:assert/strict";
import test from "node:test";

import { planSuccessfulSync, rolesClosedAfterFetch, type TrackedRole } from "./sync-plan.ts";

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
