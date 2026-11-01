import assert from "node:assert/strict";
import test from "node:test";

import { cleanNote, parseSuggestionUrl } from "./suggestion.ts";

test("a bare domain becomes an https link keyed by its host", () => {
  assert.deepEqual(parseSuggestionUrl("  www.Acme.in/careers#open "), {
    ok: true,
    url: "https://www.acme.in/careers",
    host: "acme.in",
  });
  assert.deepEqual(parseSuggestionUrl("http://jobs.acme.com"), { ok: true, url: "http://jobs.acme.com/", host: "jobs.acme.com" });
});

test("empty, malformed and private addresses are refused", () => {
  assert.equal(parseSuggestionUrl("").ok, false);
  assert.equal(parseSuggestionUrl("not a url at all").ok, false);
  assert.equal(parseSuggestionUrl("ftp://acme.com").ok, false);
  assert.equal(parseSuggestionUrl("localhost:3000").ok, false);
  assert.equal(parseSuggestionUrl("192.168.1.10").ok, false);
  assert.equal(parseSuggestionUrl(`acme.com/${"a".repeat(400)}`).ok, false);
});

test("job boards are refused in favour of the company's own site", () => {
  const result = parseSuggestionUrl("https://www.linkedin.com/company/acme/jobs");
  assert.equal(result.ok, false);
  assert.equal(parseSuggestionUrl("in.indeed.com/cmp/acme").ok, false);
  assert.equal(parseSuggestionUrl("naukri.com/acme-jobs").ok, false);
});

test("notes are trimmed, collapsed and capped", () => {
  assert.equal(cleanNote("   "), null);
  assert.equal(cleanNote(" Uses  Lever,\n hiring in Pune "), "Uses Lever, hiring in Pune");
  assert.equal(cleanNote("x".repeat(900))?.length, 500);
});
