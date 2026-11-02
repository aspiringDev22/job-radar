import { classifyFamily } from "../../ingestion/index.ts";
import type { ListingGroup, ListingMember, RoleFamily } from "../../jobs/index.ts";

import { searchTokens } from "./query.ts";

// Words a searcher uses interchangeably. Each search word matches any word in its group.
// Two-word entries are read as one term when typed together ("machine learning engineer").
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
  ["senior", "sr"],
  ["junior", "jr"],
  ["program", "programme"],
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

// Skills are named in descriptions more often than in titles, so they may match the description.
// Every other word has to be in the title, the company name or the location.
// AI and ML stay out: nearly every engineering description mentions them.
const SKILL_WORDS = new Set([
  "python", "java", "javascript", "js", "typescript", "golang", "rust", "ruby", "rails", "php",
  "scala", "kotlin", "swift", "flutter", "dart", "react", "reactjs", "react.js", "angular", "vue",
  "node", "nodejs", "node.js", "nextjs", "next.js", "django", "flask", "fastapi", "spring",
  "springboot", "hibernate", "sql", "nosql", "postgres", "postgresql", "mysql", "mongodb", "redis",
  "elasticsearch", "kafka", "spark", "hadoop", "airflow", "snowflake", "databricks", "dbt", "aws",
  "azure", "gcp", "kubernetes", "k8s", "docker", "terraform", "ansible", "jenkins", "linux",
  "graphql", "grpc", "microservices", "pytorch", "tensorflow", "pandas", "llm", "llms", "langchain",
  "tableau", "powerbi", "figma", "selenium", "cypress", "playwright", "appium", "salesforce", "sap",
  "verilog", "systemverilog", "uvm", "fpga",
]);

// How much one search word adds to a role's score, by the best place it matched:
// title, company, location, then description.
export const FIELD_SCORES = { a: 1, b: 0.6, c: 0.4, d: 0.1 } as const;

// Added when the title holds the whole query in order ("Senior Program Manager" for "program manager").
export const PHRASE_BOOST = 1;

// Added when the role's family is the one the query implies ("react developer" is frontend).
export const FAMILY_BOOST = 0.5;

export type SearchGroup = {
  // Alternatives for one search word. Any one of them is enough.
  words: string[];
  // A skill may match the description. Other words need the title, company or location.
  skill: boolean;
};

export type SearchPlan = {
  // Every group must match.
  groups: SearchGroup[];
  family: RoleFamily | null;
};

function group(words: string[]): SearchGroup {
  return { words, skill: words.some((word) => SKILL_WORDS.has(word)) };
}

export function searchPlan(text: string): SearchPlan | null {
  const trimmed = text.trim().toLowerCase();
  if (!trimmed) {
    return null;
  }
  const tokens = searchTokens(trimmed);
  const words = tokens.length > 0 ? tokens : [trimmed];
  const groups: SearchGroup[] = [];
  for (let index = 0; index < words.length; index += 1) {
    const word = words[index] ?? "";
    const pair = `${word} ${words[index + 1] ?? ""}`;
    if (index + 1 < words.length && SYNONYMS.has(pair)) {
      groups.push(group(SYNONYMS.get(pair) ?? [pair]));
      index += 1;
      continue;
    }
    groups.push(group(SYNONYMS.get(word) ?? [word]));
  }
  const family = classifyFamily(trimmed);
  return { groups, family: family === "other" ? null : family };
}

// Titles are matched as whole words, so a word also matches its plural or singular form.
// "manager" finds "Managers"; "designer" no longer finds "Design Engineer".
function wordForms(word: string): string[] {
  if (!/^[a-z]{3,}$/.test(word)) {
    return [word];
  }
  return word.endsWith("s") ? [word, word.slice(0, -1)] : [word, `${word}s`];
}

export function titleForms(words: string[]): string[] {
  const forms: string[] = [];
  for (const word of words) {
    for (const candidate of wordForms(word)) {
      if (!forms.includes(candidate)) {
        forms.push(candidate);
      }
    }
  }
  return forms;
}

// groupListings already orders by recency, and the sort is stable, so recency breaks ties.
export function rankGroups<T extends ListingMember>(
  groups: ListingGroup<T>[],
  score: (member: T) => number,
): ListingGroup<T>[] {
  const best = new Map(groups.map((group) => [group, Math.max(...group.members.map(score))]));
  return [...groups].sort((left, right) => (best.get(right) ?? 0) - (best.get(left) ?? 0));
}
