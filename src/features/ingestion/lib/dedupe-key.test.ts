import assert from "node:assert/strict";
import test from "node:test";

import { dedupeKey } from "./dedupe-key.ts";

const DELIVERY =
  "Swiggy is India's leading on-demand delivery platform with a tech-first approach and a long enough body to identify the posting across cities.";
const DINEOUT =
  "About the team. Swiggy Dineout is building India's largest dining out platform with a long enough body to stay distinct.";

test("the same posting in two cities shares a key", () => {
  const patna = dedupeKey("swiggy", "Account Manager", "Patna", "Patna, BR, India", DELIVERY);
  const goa = dedupeKey("swiggy", "Account Manager", "Goa", "Goa, India", DELIVERY);
  assert.equal(patna, goa);
});

test("description whitespace does not split a posting", () => {
  const compact = dedupeKey("swiggy", "Account Manager", "Goa", "Goa, India", DELIVERY);
  const spaced = dedupeKey("swiggy", "Account Manager", "Goa", "Goa, India", DELIVERY.replaceAll(" ", "  "));
  assert.equal(compact, spaced);
});

test("different descriptions stay apart", () => {
  const delivery = dedupeKey("swiggy", "Account Manager", "Patna", "Patna, BR, India", DELIVERY);
  const dineout = dedupeKey("swiggy", "Account Manager", "Patna", "Patna, BR, India", DINEOUT);
  assert.notEqual(delivery, dineout);
});

test("roles never merge across companies", () => {
  const swiggy = dedupeKey("swiggy", "Account Manager", "Patna", "Patna, BR, India", DELIVERY);
  const paytm = dedupeKey("paytm", "Account Manager", "Patna", "Patna, BR, India", DELIVERY);
  assert.notEqual(swiggy, paytm);
});

test("a short description keeps the city in the key", () => {
  const bengaluru = dedupeKey("cisco", "Software Engineer", "Bengaluru", "Bengaluru, India", "Short");
  const mumbai = dedupeKey("cisco", "Software Engineer", "Mumbai", "Mumbai, India", "Short");
  const again = dedupeKey("cisco", "Software Engineer", "Bengaluru", "Bengaluru, India", "Short");
  assert.notEqual(bengaluru, mumbai);
  assert.equal(bengaluru, again);
});
