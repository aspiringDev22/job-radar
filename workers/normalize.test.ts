import assert from "node:assert/strict";
import test from "node:test";

import {
  decodeHtml,
  detectRemote,
  guessEmployment,
  guessSeniority,
  htmlToText,
  keepListedLocation,
  normalizeLocation,
  parsePostedAt,
  parseSalary,
} from "./normalize.ts";

test("htmlToText decodes Greenhouse entities and drops tags", () => {
  const text = htmlToText("&lt;h2&gt;Who we are&lt;/h2&gt;&lt;p&gt;Keep the platform safe.&lt;/p&gt;");
  assert.equal(text, "Who we are\nKeep the platform safe.");
});

test("decodeHtml leaves already decoded markup alone", () => {
  assert.equal(decodeHtml("<p>Hello</p>"), "<p>Hello</p>");
});

test("normalizeLocation collapses whitespace", () => {
  assert.equal(normalizeLocation("  New York,  NY  "), "New York, NY");
  assert.equal(normalizeLocation("   "), null);
  assert.equal(normalizeLocation("N/A"), null);
});

test("keepListedLocation keeps India and remote roles for global boards", () => {
  const nyc = { isRemote: false, locationRaw: "New York, NY", locationNormalized: "New York, NY" };
  const remote = { isRemote: true, locationRaw: "Remote - United States", locationNormalized: "Remote - United States" };
  const gurugram = { isRemote: false, locationRaw: "Gurugram, India", locationNormalized: "Gurugram, India" };
  assert.equal(keepListedLocation("india_or_remote", nyc), false);
  assert.equal(keepListedLocation("india_or_remote", remote), true);
  assert.equal(keepListedLocation("india_or_remote", gurugram), true);
  assert.equal(keepListedLocation("all", nyc), true);
});

test("detectRemote reads the location and an explicit flag", () => {
  assert.equal(detectRemote(["Remote - US"]), true);
  assert.equal(detectRemote(["New York, NY"]), false);
  assert.equal(detectRemote(["Hybrid"], true), true);
});

test("guessSeniority reads the title", () => {
  assert.equal(guessSeniority("Senior / Staff Fullstack Engineer"), "staff");
  assert.equal(guessSeniority("Engineering Intern"), "intern");
  assert.equal(guessSeniority("Head of Design"), "executive");
  assert.equal(guessSeniority("Account Executive"), "unknown");
  assert.equal(guessSeniority("Office Coordinator"), "unknown");
});

test("guessEmployment maps ATS labels", () => {
  assert.equal(guessEmployment("FullTime"), "full_time");
  assert.equal(guessEmployment("Permanent"), "full_time");
  assert.equal(guessEmployment("Internship"), "internship");
  assert.equal(guessEmployment(null), null);
});

test("parsePostedAt accepts ISO strings and millisecond timestamps", () => {
  const iso = parsePostedAt("2026-09-09T10:50:29-04:00");
  assert.ok(iso instanceof Date);
  const millis = parsePostedAt(1792767640768);
  assert.equal(millis?.getTime(), 1792767640768);
  assert.equal(parsePostedAt("not-a-date"), null);
});

test("parseSalary reads a dollar range", () => {
  assert.deepEqual(parseSalary("base range is $87,069-$124,385 plus equity"), {
    min: 87069,
    max: 124385,
    currency: "USD",
  });
  assert.deepEqual(parseSalary("₹18,00,000–₹24,00,000 a year"), {
    min: 1800000,
    max: 2400000,
    currency: "INR",
  });
  assert.deepEqual(parseSalary("no numbers here"), {
    min: null,
    max: null,
    currency: null,
  });
});
