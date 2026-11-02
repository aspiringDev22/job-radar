import assert from "node:assert/strict";
import test from "node:test";

import { boardHref } from "./href.ts";
import { parseBoardQuery } from "./query.ts";

test("seniority reads the level from the title, and old links still work", () => {
  assert.equal(parseBoardQuery({ seniority: "senior" }).seniority, "senior");
  assert.equal(parseBoardQuery({ seniority: "staff_plus" }).seniority, "staff_plus");
  assert.equal(parseBoardQuery({ seniority: "principal" }).seniority, "staff_plus");
  assert.equal(parseBoardQuery({ seniority: "executive" }).seniority, "manager");
  assert.equal(parseBoardQuery({ seniority: "constructor" }).seniority, null);
});

test("description search is off unless desc=1", () => {
  assert.equal(parseBoardQuery({ q: "python" }).descriptions, false);
  assert.equal(parseBoardQuery({ q: "python", desc: "1" }).descriptions, true);
  assert.equal(parseBoardQuery({ q: "python", desc: "yes" }).descriptions, false);
});

test("page defaults to 1 and ignores junk", () => {
  assert.equal(parseBoardQuery({}).page, 1);
  assert.equal(parseBoardQuery({ page: "3" }).page, 3);
  assert.equal(parseBoardQuery({ page: "0" }).page, 1);
  assert.equal(parseBoardQuery({ page: "-2" }).page, 1);
  assert.equal(parseBoardQuery({ page: "99999" }).page, 1);
});

test("links carry description search and drop page 1", () => {
  assert.equal(boardHref({ q: "python", descriptions: true, page: 1 }), "/?q=python&desc=1");
  assert.equal(boardHref({ q: "python", page: 2 }), "/?q=python&page=2");
});

test("role picks a category and ignores anything else", () => {
  assert.equal(parseBoardQuery({ role: "design" }).category, "design");
  assert.equal(parseBoardQuery({ role: "astronaut" }).category, null);
  assert.equal(boardHref({ category: "engineering", q: "java" }), "/?q=java&role=engineering");
});
