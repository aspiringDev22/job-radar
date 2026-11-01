import assert from "node:assert/strict";
import test from "node:test";

import { groupListings, listPlaceLabel, postingLocations, type ListingMember } from "./listing.ts";

function row(overrides: Partial<ListingMember> & Pick<ListingMember, "slug" | "city">): ListingMember {
  return {
    dedupeKey: "shared",
    location: overrides.city,
    isRemote: false,
    postedAt: new Date("2026-01-01T00:00:00.000Z"),
    applyUrl: `https://example.com/${overrides.slug}`,
    ...overrides,
  };
}

test("a role posted for five cities shows once", () => {
  const cities = ["Patna", "Goa", "Pune", "Jaipur", "Kochi"];
  const rows = cities.map((city, index) =>
    row({
      slug: `account-${index}`,
      city,
      postedAt: new Date(Date.UTC(2026, 0, index + 1)),
    }),
  );
  const groups = groupListings(rows);
  assert.equal(groups.length, 1);
  assert.equal(groups[0]?.locationCount, 5);
  assert.equal(postingLocations(groups[0]?.members ?? []).length, 5);
  assert.equal(listPlaceLabel({ locationCount: 5, isRemote: false, location: "Patna" }), "5 locations");
});

test("same-city requisitions stay separate", () => {
  const rows = [1, 2, 3].map((index) =>
    row({
      slug: `engineer-${index}`,
      city: "Bengaluru",
      location: "Bengaluru, India",
      postedAt: new Date(Date.UTC(2026, 0, index)),
      applyUrl: `https://example.com/${index}`,
    }),
  );
  const groups = groupListings(rows);
  assert.equal(groups.length, 3);
  assert.ok(groups.every((group) => group.locationCount === 1));
});

test("one location keeps its place name", () => {
  assert.equal(listPlaceLabel({ locationCount: 1, isRemote: true, location: "Bengaluru" }), "Remote");
  assert.equal(listPlaceLabel({ locationCount: 1, isRemote: false, location: "Bengaluru" }), "Bengaluru");
});
