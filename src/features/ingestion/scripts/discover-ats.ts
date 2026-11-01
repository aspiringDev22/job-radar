import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";

import { z } from "zod";

import { ATS_TYPES, type AtsType } from "../../companies/index.ts";

import { companiesFileSchema } from "../lib/company-file.ts";
import {
  PROBES,
  atsLinksInPage,
  confidenceFor,
  parseCsvRows,
  parseSeedCsv,
  robotsAllows,
  slugCandidates,
  unsupportedSystemsInPage,
  workdayProbe,
  type Confidence,
  type ProbeSummary,
} from "../lib/discovery.ts";
import { fetchJson, fetchText } from "../lib/http.ts";
import { mapPool } from "../lib/pool.ts";

// Finds which public ATS each company in data/seed-domains.csv uses. Writes
// data/discovered.json and data/needs_manual.csv for review. Never edits companies.json.
//
//   pnpm discover [--limit 20] [--only "Zepto,Juspay"] [--resume]

const DATA = path.join(process.cwd(), "data");
const SEED_FILE = path.join(DATA, "seed-domains.csv");
const COMPANIES_FILE = path.join(DATA, "companies.json");
const DISCOVERED_FILE = path.join(DATA, "discovered.json");
const MANUAL_FILE = path.join(DATA, "needs_manual.csv");

const CONCURRENCY = 5;
const REQUEST = { timeoutMs: 8_000, attempts: 2 };
// An unknown board often redirects to a marketing page; for an API probe that is a miss.
const PROBE_REQUEST = { ...REQUEST, redirect: "manual" as const };
const CAREERS_PATHS = ["/careers", "/jobs", "/about/careers", "/"];
const MAX_PAGE_CHARS = 2_000_000;
const SUPPORTED: ReadonlySet<AtsType> = new Set([
  "greenhouse",
  "lever",
  "ashby",
  "workable",
  "smartrecruiters",
  "recruitee",
  "workday",
  "keka",
]);

type Seed = { name: string; domain: string };

type Discovered = {
  name: string;
  domain: string;
  ats_type: AtsType;
  ats_slug: string;
  role_count: number | null;
  india_roles: number | null;
  sample_title: string | null;
  sample_location: string | null;
  confidence: Confidence;
  via: "api" | "careers_page";
  supported: boolean;
};

type Manual = { name: string; domain: string; reason: string };

function key(name: string): string {
  return name.trim().toLowerCase();
}

function hostOf(domain: string): string {
  return domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "");
}

async function probeApi(type: AtsType, slug: string): Promise<ProbeSummary | null> {
  try {
    if (type === "workday") {
      const probe = workdayProbe(slug);
      return probe ? probe.read(await fetchJson(probe.url, probe.body, PROBE_REQUEST)) : null;
    }
    const probe = PROBES.find((item) => item.type === type);
    return probe ? probe.read(await fetchJson(probe.url(slug), undefined, PROBE_REQUEST)) : null;
  } catch {
    // A 404, a timeout or a refused connection all mean "not this ATS".
    return null;
  }
}

function hit(seed: Seed, type: AtsType, slug: string, summary: ProbeSummary, via: Discovered["via"]): Discovered {
  return {
    name: seed.name,
    domain: seed.domain,
    ats_type: type,
    ats_slug: slug,
    role_count: summary.roleCount,
    india_roles: summary.indiaRoles,
    sample_title: summary.sampleTitle,
    sample_location: summary.sampleLocation,
    confidence: confidenceFor(via, summary),
    via,
    supported: SUPPORTED.has(type),
  };
}

async function viaApi(seed: Seed): Promise<Discovered | null> {
  for (const slug of slugCandidates(seed.name, seed.domain)) {
    for (const probe of PROBES) {
      const summary = await probeApi(probe.type, slug);
      if (summary && summary.roleCount > 0) {
        return hit(seed, probe.type, slug, summary, "api");
      }
    }
  }
  return null;
}

// null when robots.txt cannot be read because the site is unreachable.
async function robotsFor(origin: string): Promise<string | null> {
  try {
    return await fetchText(`${origin}/robots.txt`, REQUEST);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    // No robots.txt (4xx) means everything is allowed.
    return /^HTTP 4\d\d/.test(message) ? "" : null;
  }
}

async function pageText(url: string): Promise<string | null> {
  try {
    return (await fetchText(url, REQUEST)).slice(0, MAX_PAGE_CHARS);
  } catch {
    return null;
  }
}

// Same-site links that look like a careers page, e.g. careers.acme.com or acme.com/company/careers.
function careersLinks(html: string, host: string, base: URL): URL[] {
  const links: URL[] = [];
  for (const match of html.matchAll(/href="((?:https?:\/\/|\/)[^"#]*)"/gi)) {
    try {
      const url = new URL(match[1] ?? "", base);
      const sameSite = url.hostname === host || url.hostname.endsWith(`.${host}`);
      if (sameSite && /career|jobs/i.test(`${url.hostname}${url.pathname}`)) {
        links.push(url);
      }
    } catch {
      continue;
    }
  }
  return links;
}

async function viaCareersPage(seed: Seed): Promise<{ found: Discovered | null; reason: string }> {
  const host = hostOf(seed.domain);
  const origin = `https://${host}`;
  const robots = await robotsFor(origin);
  if (robots === null) {
    return { found: null, reason: "site unreachable" };
  }

  const queue: URL[] = CAREERS_PATHS.map((pagePath) => new URL(pagePath, origin));
  const visited = new Set<string>();
  const robotsByHost = new Map<string, string | null>([[new URL(origin).hostname, robots]]);
  const unsupported = new Set<string>();
  const empty: string[] = [];
  let blocked = 0;

  while (queue.length > 0 && visited.size < 6) {
    const url = queue.shift();
    if (!url || visited.has(url.href)) {
      continue;
    }
    visited.add(url.href);
    if (!robotsByHost.has(url.hostname)) {
      robotsByHost.set(url.hostname, await robotsFor(url.origin));
    }
    const rules = robotsByHost.get(url.hostname);
    if (rules === null || rules === undefined) {
      continue;
    }
    if (!robotsAllows(rules, url.pathname)) {
      blocked += 1;
      continue;
    }
    const html = await pageText(url.href);
    if (!html) {
      continue;
    }
    for (const system of unsupportedSystemsInPage(html)) {
      unsupported.add(system);
    }
    for (const link of atsLinksInPage(html)) {
      if (!SUPPORTED.has(link.type)) {
        unsupported.add(link.type);
        continue;
      }
      const summary = await probeApi(link.type, link.slug);
      if (summary && summary.roleCount > 0) {
        return { found: hit(seed, link.type, link.slug, summary, "careers_page"), reason: "" };
      }
      empty.push(`${link.type}:${link.slug}`);
    }
    for (const link of careersLinks(html, host, url)) {
      if (!visited.has(link.href)) {
        queue.push(link);
      }
    }
  }

  if (empty.length > 0) {
    return { found: null, reason: `${empty.join(", ")} lists no roles` };
  }
  if (unsupported.size > 0) {
    return { found: null, reason: `uses ${[...unsupported].join(", ")}` };
  }
  if (blocked > 0 && blocked === visited.size) {
    return { found: null, reason: "careers pages disallowed by robots.txt" };
  }
  return { found: null, reason: "no ATS link found" };
}

async function discover(seed: Seed): Promise<Discovered | Manual> {
  const fromApi = await viaApi(seed);
  if (fromApi) {
    return fromApi;
  }
  const { found, reason } = await viaCareersPage(seed);
  return found ?? { name: seed.name, domain: seed.domain, reason };
}

const CONFIDENCE_ORDER: Record<Confidence, number> = { high: 0, medium: 1, low: 2 };

function csvField(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

const discoveredSchema = z.array(
  z.object({
    name: z.string(),
    domain: z.string(),
    ats_type: z.enum(ATS_TYPES),
    ats_slug: z.string(),
    role_count: z.number().nullable(),
    india_roles: z.number().nullable(),
    sample_title: z.string().nullable(),
    sample_location: z.string().nullable(),
    confidence: z.enum(["high", "medium", "low"]),
    via: z.enum(["api", "careers_page"]),
    supported: z.boolean(),
  }),
);

async function readIfExists(file: string): Promise<string | null> {
  try {
    return await readFile(file, "utf8");
  } catch {
    return null;
  }
}

async function readPrevious(): Promise<{ discovered: Discovered[]; manual: Manual[] }> {
  const json = await readIfExists(DISCOVERED_FILE);
  const csv = await readIfExists(MANUAL_FILE);
  const discovered = json ? discoveredSchema.parse(JSON.parse(json) as unknown) : [];
  const manual = csv
    ? parseCsvRows(csv)
        .slice(1)
        .flatMap(([name, domain, reason]) => (name && domain ? [{ name, domain, reason: reason ?? "" }] : []))
    : [];
  return { discovered, manual };
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    args: process.argv.slice(2).filter((arg) => arg !== "--"),
    options: {
      limit: { type: "string" },
      only: { type: "string" },
      resume: { type: "boolean", default: false },
    },
  });

  const seeds = parseSeedCsv(await readFile(SEED_FILE, "utf8"));
  const companies = companiesFileSchema.parse(JSON.parse(await readFile(COMPANIES_FILE, "utf8")) as unknown);
  const known = new Set(companies.map((company) => key(company.name)));
  const knownHosts = new Set(
    companies.flatMap((company) => (company.website ? [hostOf(new URL(company.website).hostname)] : [])),
  );

  // Earlier results are always kept. A company found again replaces its old row;
  // --resume skips companies that already have one.
  const previous = await readPrevious();
  const done = values.resume
    ? new Set([...previous.discovered, ...previous.manual].map((row) => key(row.name)))
    : new Set<string>();
  const only = values.only ? new Set(values.only.split(",").map(key)) : null;

  let todo = seeds.filter(
    (seed) =>
      !known.has(key(seed.name)) &&
      !knownHosts.has(hostOf(seed.domain)) &&
      !done.has(key(seed.name)) &&
      (!only || only.has(key(seed.name))),
  );
  if (values.limit) {
    todo = todo.slice(0, Number(values.limit));
  }
  console.log(`Discovering ${todo.length} of ${seeds.length} companies in the seed list`);

  let discovered = [...previous.discovered];
  let manual = [...previous.manual];
  let saving = Promise.resolve();
  const save = () => {
    saving = saving.then(async () => {
      discovered.sort(
        (left, right) =>
          CONFIDENCE_ORDER[left.confidence] - CONFIDENCE_ORDER[right.confidence] || left.name.localeCompare(right.name),
      );
      manual.sort((left, right) => left.name.localeCompare(right.name));
      await writeFile(DISCOVERED_FILE, `${JSON.stringify(discovered, null, 2)}\n`);
      await writeFile(
        MANUAL_FILE,
        `name,domain,reason\n${manual.map((row) => [row.name, row.domain, row.reason].map(csvField).join(",")).join("\n")}\n`,
      );
    });
    return saving;
  };

  let finished = 0;
  await mapPool(todo, CONCURRENCY, async (seed) => {
    const result = await discover(seed);
    finished += 1;
    const progress = `[${finished}/${todo.length}]`;
    discovered = discovered.filter((row) => key(row.name) !== key(seed.name));
    manual = manual.filter((row) => key(row.name) !== key(seed.name));
    if ("ats_type" in result) {
      discovered.push(result);
      const counts = `${result.role_count} roles, ${result.india_roles} in India`;
      console.log(`${progress} ${seed.name}: ${result.ats_type}:${result.ats_slug} (${counts}, ${result.confidence}) — ${result.sample_title ?? ""}`);
    } else {
      manual.push(result);
      console.log(`${progress} ${seed.name}: needs manual (${result.reason})`);
    }
    await save();
  });
  await saving;

  const count = (confidence: Confidence) => discovered.filter((row) => row.confidence === confidence).length;
  console.log(
    `Done: ${discovered.length} found (${count("high")} high, ${count("medium")} medium, ${count("low")} low), ${manual.length} need manual review.`,
  );
  console.log(`Review ${path.relative(process.cwd(), DISCOVERED_FILE)} before adding anything to data/companies.json.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
