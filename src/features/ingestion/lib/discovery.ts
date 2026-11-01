import { z } from "zod";

import type { AtsType } from "../../companies/index.ts";

import { isIndiaPlace } from "./normalize.ts";

export type ProbeSummary = {
  roleCount: number;
  indiaRoles: number;
  sampleTitle: string | null;
  sampleLocation: string | null;
};

export type Posting = { title: string; location: string | null; country: string | null };

export function summarize(postings: Posting[]): ProbeSummary {
  const india = postings.filter(
    (posting) =>
      isIndiaPlace(posting.location) || ["india", "in", "ind"].includes(posting.country?.trim().toLowerCase() ?? ""),
  );
  // Prefer an India role as the sample, so the reviewer sees what the board would show.
  const sample = india[0] ?? postings[0];
  return {
    roleCount: postings.length,
    indiaRoles: india.length,
    sampleTitle: sample?.title ?? null,
    sampleLocation: sample?.location ?? sample?.country ?? null,
  };
}

const nullableText = z.string().nullable().optional();

const greenhouseSchema = z.object({
  jobs: z.array(z.object({ title: z.string(), location: z.object({ name: nullableText }).nullable().optional() })),
});

const leverSchema = z.array(
  z.object({
    text: z.string(),
    country: nullableText,
    categories: z.object({ location: nullableText, allLocations: z.array(z.string()).optional() }).partial().optional(),
  }),
);

const ashbySchema = z.object({
  jobs: z.array(
    z.object({
      title: z.string(),
      location: nullableText,
      secondaryLocations: z.array(z.object({ location: nullableText })).optional(),
    }),
  ),
});

const workableSchema = z.object({
  jobs: z.array(z.object({ title: z.string(), city: nullableText, state: nullableText, country: nullableText })),
});

const smartRecruitersSchema = z.object({
  content: z.array(
    z.object({
      name: z.string(),
      location: z.object({ city: nullableText, country: nullableText, fullLocation: nullableText }).partial().optional(),
    }),
  ),
});

const recruiteeSchema = z.object({
  offers: z.array(z.object({ title: z.string(), location: nullableText, country: nullableText, country_code: nullableText })),
});

const kekaSchema = z.array(
  z.object({
    title: z.string(),
    jobLocations: z
      .array(z.object({ name: nullableText, city: nullableText, countryName: nullableText, countryCode: nullableText }))
      .nullable()
      .optional(),
  }),
);

function joined(...parts: Array<string | null | undefined>): string | null {
  const text = parts.filter((part): part is string => Boolean(part && part.trim())).join(", ");
  return text || null;
}

export type Probe = {
  type: AtsType;
  url: (slug: string) => string;
  // null when the payload is not this ATS's job list
  read: (payload: unknown) => ProbeSummary | null;
};

export const PROBES: Probe[] = [
  {
    type: "greenhouse",
    url: (slug) => `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(slug)}/jobs`,
    read: (payload) => {
      const parsed = greenhouseSchema.safeParse(payload);
      return parsed.success
        ? summarize(parsed.data.jobs.map((job) => ({ title: job.title, location: job.location?.name ?? null, country: null })))
        : null;
    },
  },
  {
    type: "lever",
    url: (slug) => `https://api.lever.co/v0/postings/${encodeURIComponent(slug)}?mode=json`,
    read: (payload) => {
      const parsed = leverSchema.safeParse(payload);
      return parsed.success
        ? summarize(
            parsed.data.map((job) => ({
              title: job.text,
              location: joined(job.categories?.location, ...(job.categories?.allLocations ?? [])),
              country: job.country ?? null,
            })),
          )
        : null;
    },
  },
  {
    type: "ashby",
    url: (slug) => `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(slug)}`,
    read: (payload) => {
      const parsed = ashbySchema.safeParse(payload);
      return parsed.success
        ? summarize(
            parsed.data.jobs.map((job) => ({
              title: job.title,
              location: joined(job.location, ...(job.secondaryLocations ?? []).map((item) => item.location)),
              country: null,
            })),
          )
        : null;
    },
  },
  {
    type: "workable",
    url: (slug) => `https://apply.workable.com/api/v1/widget/accounts/${encodeURIComponent(slug)}`,
    read: (payload) => {
      const parsed = workableSchema.safeParse(payload);
      return parsed.success
        ? summarize(
            parsed.data.jobs.map((job) => ({
              title: job.title,
              location: joined(job.city, job.state, job.country),
              country: job.country ?? null,
            })),
          )
        : null;
    },
  },
  {
    type: "smartrecruiters",
    url: (slug) => `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(slug)}/postings`,
    read: (payload) => {
      const parsed = smartRecruitersSchema.safeParse(payload);
      return parsed.success
        ? summarize(
            parsed.data.content.map((job) => ({
              title: job.name,
              location: job.location?.fullLocation ?? joined(job.location?.city, job.location?.country),
              country: job.location?.country ?? null,
            })),
          )
        : null;
    },
  },
  {
    type: "recruitee",
    url: (slug) => `https://${encodeURIComponent(slug)}.recruitee.com/api/offers/`,
    read: (payload) => {
      const parsed = recruiteeSchema.safeParse(payload);
      return parsed.success
        ? summarize(
            parsed.data.offers.map((job) => ({
              title: job.title,
              location: joined(job.location, job.country),
              country: job.country_code ?? job.country ?? null,
            })),
          )
        : null;
    },
  },
  {
    type: "keka",
    url: (slug) => `https://${encodeURIComponent(slug)}.keka.com/careers/api/jobs/default/active`,
    read: (payload) => {
      const parsed = kekaSchema.safeParse(payload);
      return parsed.success
        ? summarize(
            parsed.data.map((job) => {
              const places = job.jobLocations ?? [];
              return {
                title: job.title,
                location: joined(...places.map((place) => joined(place.city ?? place.name, place.countryName))),
                country: places[0]?.countryCode ?? null,
              };
            }),
          )
        : null;
    },
  },
];

const workdaySchema = z.object({
  total: z.number().optional(),
  jobPostings: z.array(z.object({ title: z.string(), locationsText: nullableText })),
});

// Workday needs a POST and a wdN/tenant/site slug, so it is only tried for careers-page links.
// The search text narrows the count to roles that mention India.
export function workdayProbe(slug: string): { url: string; body: unknown; read: (payload: unknown) => ProbeSummary | null } | null {
  const [cluster, tenant, site] = slug.split("/");
  if (!cluster || !tenant || !site) {
    return null;
  }
  return {
    url: `https://${tenant}.${cluster}.myworkdayjobs.com/wday/cxs/${tenant}/${site}/jobs`,
    body: { appliedFacets: {}, limit: 20, offset: 0, searchText: "India" },
    read: (payload) => {
      const parsed = workdaySchema.safeParse(payload);
      if (!parsed.success) {
        return null;
      }
      const summary = summarize(
        parsed.data.jobPostings.map((job) => ({ title: job.title, location: job.locationsText ?? null, country: null })),
      );
      return { ...summary, roleCount: parsed.data.total ?? summary.roleCount };
    },
  };
}

const NAME_SUFFIX = /\s+(?:technologies|technology|tech|labs|india|private limited|pvt\.? ltd\.?|limited|ltd\.?|inc\.?)$/;

// Slugs to try on each ATS: the name squashed, the name hyphenated, and the domain's first label.
export function slugCandidates(name: string, domain: string): string[] {
  const base = name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const short = base.replace(NAME_SUFFIX, "").trim();
  const label = domain.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split(/[./]/)[0] ?? "";
  return [...new Set([base.replace(/ /g, ""), base.replace(/ /g, "-"), short.replace(/ /g, ""), label])].filter(
    (slug) => slug.length >= 2,
  );
}

export type PageHit = { type: AtsType; slug: string };

// ATS links on a careers page. Workday is stored as wdN/tenant/site, like data/companies.json.
const PAGE_PATTERNS: Array<{ type: AtsType; pattern: RegExp; slug: (match: RegExpExecArray) => string | undefined }> = [
  {
    type: "greenhouse",
    pattern: /(?:job-)?boards(?:\.eu)?\.greenhouse\.io\/(?:embed\/job_board(?:\/js)?\?for=)?([a-z0-9_-]+)/gi,
    slug: (match) => match[1],
  },
  { type: "lever", pattern: /jobs\.lever\.co\/([a-z0-9_.-]+)/gi, slug: (match) => match[1] },
  { type: "ashby", pattern: /jobs\.ashbyhq\.com\/([a-z0-9_.%-]+)/gi, slug: (match) => match[1] },
  { type: "workable", pattern: /apply\.workable\.com\/([a-z0-9_-]+)/gi, slug: (match) => match[1] },
  { type: "smartrecruiters", pattern: /(?:careers|jobs)\.smartrecruiters\.com\/([a-z0-9_-]+)/gi, slug: (match) => match[1] },
  { type: "recruitee", pattern: /\/\/([a-z0-9-]+)\.recruitee\.com/gi, slug: (match) => match[1] },
  {
    type: "workday",
    pattern: /([a-z0-9-]+)\.(wd\d+)\.myworkdayjobs\.com\/(?:[a-z]{2}-[a-z]{2}\/)?([a-z0-9_-]+)/gi,
    slug: (match) => (match[1] && match[2] && match[3] ? `${match[2]}/${match[1]}/${match[3]}` : undefined),
  },
  { type: "keka", pattern: /\/\/([a-z0-9-]+)\.keka\.com\/careers/gi, slug: (match) => match[1] },
];

const IGNORED_SLUGS = new Set(["embed", "api", "v0", "v1", "j", "jobs", "careers", "static", "assets", "www", "app", "cdn"]);

export function atsLinksInPage(html: string): PageHit[] {
  const hits: PageHit[] = [];
  const seen = new Set<string>();
  for (const { type, pattern, slug } of PAGE_PATTERNS) {
    for (const match of html.matchAll(pattern)) {
      const value = slug(match);
      if (!value) {
        continue;
      }
      const cleaned = type === "workday" ? value : decodeURIComponent(value).replace(/[.]+$/, "");
      const key = `${type}:${cleaned.toLowerCase()}`;
      if (IGNORED_SLUGS.has(cleaned.toLowerCase()) || seen.has(key)) {
        continue;
      }
      seen.add(key);
      hits.push({ type, slug: cleaned });
    }
  }
  return hits;
}

// Careers systems the board cannot read yet. Named in needs_manual.csv so coverage gaps are visible.
const UNSUPPORTED_PATTERNS: Array<{ name: string; pattern: RegExp }> = [
  { name: "Darwinbox", pattern: /\.darwinbox\.(?:in|com)/i },
  { name: "Zoho Recruit", pattern: /zohorecruit\.(?:in|com)/i },
  { name: "Freshteam", pattern: /\.freshteam\.com/i },
  { name: "SuccessFactors", pattern: /successfactors\.(?:com|eu)|jobs\.sap\.com/i },
  { name: "Taleo", pattern: /\.taleo\.net/i },
  { name: "iCIMS", pattern: /\.icims\.com/i },
  { name: "Oracle Recruiting", pattern: /oraclecloud\.com\/hcmUI\/CandidateExperience/i },
  { name: "Turbohire", pattern: /turbohire\.co/i },
];

export function unsupportedSystemsInPage(html: string): string[] {
  return UNSUPPORTED_PATTERNS.filter(({ pattern }) => pattern.test(html)).map(({ name }) => name);
}

type RobotsRule = { allow: boolean; path: string };

function ruleMatches(rulePath: string, path: string): boolean {
  if (!rulePath) {
    return false;
  }
  const anchored = rulePath.endsWith("$");
  const body = (anchored ? rulePath.slice(0, -1) : rulePath)
    .split("*")
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");
  return new RegExp(`^${body}${anchored ? "$" : ""}`).test(path);
}

// Whether robots.txt lets a generic crawler fetch the path. The longest matching rule wins;
// Allow wins a tie. Groups for "*" and for JobRadar both apply.
export function robotsAllows(robotsTxt: string, path: string, agent = "jobradar"): boolean {
  const rules: RobotsRule[] = [];
  let groupAgents: string[] = [];
  let inRules = false;
  for (const rawLine of robotsTxt.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*/, "").trim();
    const separator = line.indexOf(":");
    if (separator < 0) {
      continue;
    }
    const field = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    if (field === "user-agent") {
      if (inRules) {
        groupAgents = [];
        inRules = false;
      }
      groupAgents.push(value.toLowerCase());
    } else if (field === "allow" || field === "disallow") {
      inRules = true;
      if (groupAgents.some((name) => name === "*" || (name.length > 0 && agent.includes(name)))) {
        rules.push({ allow: field === "allow", path: value });
      }
    }
  }
  let best: RobotsRule | null = null;
  for (const rule of rules) {
    if (!ruleMatches(rule.path, path)) {
      continue;
    }
    if (!best || rule.path.length > best.path.length || (rule.path.length === best.path.length && rule.allow)) {
      best = rule;
    }
  }
  return best ? best.allow : true;
}

export type Confidence = "high" | "medium" | "low";

// high: a public API answered with roles in India for a slug built from the name.
// medium: the slug came from the company's careers page.
// low: roles exist but none in India, which often means a different company with the same name.
export function confidenceFor(via: "api" | "careers_page", summary: ProbeSummary): Confidence {
  if (summary.indiaRoles === 0) {
    return "low";
  }
  return via === "api" ? "high" : "medium";
}

// Rows of a simple CSV: commas separate fields, double quotes wrap fields that contain them.
export function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) {
      continue;
    }
    const fields: string[] = [];
    let field = "";
    let quoted = false;
    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];
      if (quoted) {
        if (char === '"' && line[index + 1] === '"') {
          field += '"';
          index += 1;
        } else if (char === '"') {
          quoted = false;
        } else {
          field += char;
        }
      } else if (char === '"') {
        quoted = true;
      } else if (char === ",") {
        fields.push(field);
        field = "";
      } else {
        field += char;
      }
    }
    fields.push(field);
    rows.push(fields.map((value) => value.trim()));
  }
  return rows;
}

export function parseSeedCsv(text: string): Array<{ name: string; domain: string }> {
  return parseCsvRows(text).flatMap(([name, domain], index) => {
    const header = index === 0 && name?.toLowerCase() === "name";
    return name && domain && !name.startsWith("#") && !header ? [{ name, domain: domain.toLowerCase() }] : [];
  });
}
