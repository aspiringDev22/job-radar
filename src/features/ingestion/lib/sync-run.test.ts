import assert from "node:assert/strict";
import test from "node:test";

import {
  dueForSync,
  formatDuration,
  MIN_SYNC_INTERVAL_MS,
  pickCompanies,
  RUN_GIVE_UP_MS,
  runState,
  runTotals,
} from "./sync-run.ts";

const NOW = Date.parse("2026-10-31T12:00:00Z");

test("a company synced inside the skip window is not due", () => {
  const recent = new Date(NOW - MIN_SYNC_INTERVAL_MS + 60_000);
  assert.equal(dueForSync(recent, NOW, false), false);
});

test("--force syncs a company inside the skip window", () => {
  const recent = new Date(NOW - 60_000);
  assert.equal(dueForSync(recent, NOW, true), true);
});

test("a company is due once the skip window has passed or it never succeeded", () => {
  assert.equal(dueForSync(new Date(NOW - MIN_SYNC_INTERVAL_MS), NOW, false), true);
  assert.equal(dueForSync(null, NOW, false), true);
});

test("a six hour schedule never lands inside the four hour window", () => {
  const lastScheduledRun = new Date(NOW - 6 * 60 * 60 * 1000);
  assert.equal(dueForSync(lastScheduledRun, NOW, false), true);
});

test("run totals count companies by outcome and roles from successful syncs only", () => {
  const totals = runTotals([
    { status: "ok", found: 10, added: 3, reopened: 1, closed: 2 },
    { status: "ok", found: 4, added: 0, reopened: 0, closed: 1 },
    { status: "failed", error: "Greenhouse returned 404" },
    { status: "skipped" },
  ]);
  assert.deepEqual(totals, {
    companiesOk: 2,
    companiesFailed: 1,
    companiesSkipped: 1,
    rolesAdded: 3,
    rolesReopened: 1,
    rolesClosed: 3,
  });
});

test("an empty run has zero totals", () => {
  assert.deepEqual(runTotals([]), {
    companiesOk: 0,
    companiesFailed: 0,
    companiesSkipped: 0,
    rolesAdded: 0,
    rolesReopened: 0,
    rolesClosed: 0,
  });
});

test("--only picks companies by slug and reports unknown ones", () => {
  const rows = [{ slug: "swiggy" }, { slug: "razorpay" }, { slug: "cred" }];
  const { picked, unknown } = pickCompanies(rows, ["Swiggy", " cred ", "zomato"]);
  assert.deepEqual(picked.map((row) => row.slug), ["swiggy", "cred"]);
  assert.deepEqual(unknown, ["zomato"]);
});

test("no --only keeps every company", () => {
  const rows = [{ slug: "swiggy" }, { slug: "razorpay" }];
  assert.deepEqual(pickCompanies(rows, []).picked, rows);
});

test("durations read as hours, minutes and seconds", () => {
  assert.equal(formatDuration(42_400), "42s");
  assert.equal(formatDuration(754_000), "12m 34s");
  assert.equal(formatDuration(56_789_000), "15h 46m");
});

test("a run without a finish time is running, then interrupted after the give-up window", () => {
  const finished = new Date(NOW - 1000);
  assert.equal(runState(new Date(NOW - 60_000), finished, NOW), "finished");
  assert.equal(runState(new Date(NOW - 60_000), null, NOW), "running");
  assert.equal(runState(new Date(NOW - RUN_GIVE_UP_MS), null, NOW), "interrupted");
});
