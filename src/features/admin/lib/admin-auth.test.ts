import assert from "node:assert/strict";
import test from "node:test";

import { adminAuthorized } from "./admin-auth.ts";

function basic(user: string, password: string): string {
  return `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`;
}

test("the right password is accepted with any user name", () => {
  assert.equal(adminAuthorized(basic("admin", "s3cret:with-colon"), "s3cret:with-colon"), true);
  assert.equal(adminAuthorized(basic("", "s3cret"), "s3cret"), true);
});

test("a wrong or missing password is refused", () => {
  assert.equal(adminAuthorized(basic("admin", "nope"), "s3cret"), false);
  assert.equal(adminAuthorized(null, "s3cret"), false);
  assert.equal(adminAuthorized("Bearer s3cret", "s3cret"), false);
  assert.equal(adminAuthorized(`Basic ${Buffer.from("no-separator").toString("base64")}`, "s3cret"), false);
});

test("nothing is accepted when no admin password is configured", () => {
  assert.equal(adminAuthorized(basic("admin", ""), null), false);
});
