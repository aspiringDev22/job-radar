import assert from "node:assert/strict";
import test from "node:test";

import { headline } from "./format.ts";

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
