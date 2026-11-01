import { classifyFamily } from "../../ingestion/index.ts";
import type { ListingGroup, ListingMember, RoleFamily } from "../../jobs/index.ts";

import { searchTokens } from "./query.ts";

// Words a searcher uses interchangeably. Each search word matches any word in its group.
const SYNONYM_GROUPS: string[][] = [
  ["developer", "engineer", "sde", "programmer"],
  ["frontend", "front end"],
  ["backend", "back end"],
  ["fullstack", "full stack"],
  ["react", "reactjs", "react.js"],
  ["node", "nodejs", "node.js"],
  ["javascript", "js"],
  ["kubernetes", "k8s"],
  ["ml", "machine learning"],
  ["ai", "artificial intelligence"],
  ["bengaluru", "bangalore", "blr"],
  ["gurugram", "gurgaon"],
  ["mumbai", "bombay"],
  ["chennai", "madras"],
  ["kolkata", "calcutta"],
];

const SYNONYMS = new Map<string, string[]>();
for (const group of SYNONYM_GROUPS) {
  for (const word of group) {
    SYNONYMS.set(word, [word, ...group.filter((other) => other !== word)]);
  }
}

// How much one search word adds to a role's score, by the best place it matched.
// The weights follow the tsvector: title A, company B, location C, description D.
export const FIELD_SCORES = { a: 1, b: 0.6, c: 0.4, d: 0.1 } as const;

// Added when the role's family is the one the query implies ("react developer" is frontend).
export const FAMILY_BOOST = 0.5;

export type SearchPlan = {
  // Every group must match somewhere. Any one alternative in a group is enough.
  groups: string[][];
  family: RoleFamily | null;
};

export function searchPlan(text: string): SearchPlan | null {
  const trimmed = text.trim().toLowerCase();
  if (!trimmed) {
    return null;
  }
  const tokens = searchTokens(trimmed);
  const words = tokens.length > 0 ? tokens : [trimmed];
  const family = classifyFamily(trimmed);
  return {
    groups: words.map((word) => SYNONYMS.get(word) ?? [word]),
    family: family === "other" ? null : family,
  };
}

// groupListings already orders by recency, and the sort is stable, so recency breaks ties.
export function rankGroups<T extends ListingMember>(
  groups: ListingGroup<T>[],
  score: (member: T) => number,
): ListingGroup<T>[] {
  const best = new Map(groups.map((group) => [group, Math.max(...group.members.map(score))]));
  return [...groups].sort((left, right) => (best.get(right) ?? 0) - (best.get(left) ?? 0));
}
