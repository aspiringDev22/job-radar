import assert from "node:assert/strict";
import test from "node:test";

import { formatSalary } from "./format.ts";

test("salaries keep the currency they were published in", () => {
  assert.equal(formatSalary(2_500_000, 4_000_000, "INR"), "₹25L–₹40L");
  assert.equal(formatSalary(150_000, 190_000, "USD"), "$150k–$190k");
  assert.equal(formatSalary(60_000, 80_000, "EUR"), "€60k–€80k");
});

test("a currency without a symbol is named, and a missing one is not guessed", () => {
  assert.equal(formatSalary(120_000, 150_000, "CAD"), "CAD 120k–150k");
  assert.equal(formatSalary(120_000, 150_000, null), "120k–150k");
  assert.equal(formatSalary(null, 150_000, "USD"), null);
});
