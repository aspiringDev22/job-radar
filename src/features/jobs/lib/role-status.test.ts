import assert from "node:assert/strict";
import test from "node:test";

import { CLOSED_ROLE_VISIBLE_MS, roleAvailability } from "./role-status.ts";

test("a closed role stays viewable for 30 days and then is gone", () => {
  const now = Date.parse("2026-10-31T00:00:00.000Z");
  const justInside = new Date(now - CLOSED_ROLE_VISIBLE_MS);
  const past = new Date(now - CLOSED_ROLE_VISIBLE_MS - 1);
  assert.equal(roleAvailability("closed", justInside, now), "closed");
  assert.equal(roleAvailability("closed", past, now), "gone");
  assert.equal(roleAvailability("open", past, now), "open");
  assert.equal(roleAvailability("closed", null, now), "closed");
});
