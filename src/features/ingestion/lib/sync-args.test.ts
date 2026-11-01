import assert from "node:assert/strict";
import test from "node:test";

import { parseSyncArgs } from "./sync-args.ts";

test("no flags is a manual run that respects the skip window", () => {
  assert.deepEqual(parseSyncArgs([]), { force: false, dryRun: false, trigger: "manual", only: [] });
});

test("the scheduler marks its runs as scheduled", () => {
  assert.equal(parseSyncArgs(["--scheduled"]).trigger, "scheduled");
});

test("a leading -- from pnpm is ignored", () => {
  assert.deepEqual(parseSyncArgs(["--", "--force", "--dry-run"]), {
    force: true,
    dryRun: true,
    trigger: "manual",
    only: [],
  });
});

test("--only accepts repeats and comma lists", () => {
  assert.deepEqual(parseSyncArgs(["--only", "swiggy,cred", "--only=razorpay"]).only, ["swiggy", "cred", "razorpay"]);
});

test("an unknown flag is an error, not a silent full sync", () => {
  assert.throws(() => parseSyncArgs(["--froce"]));
});
