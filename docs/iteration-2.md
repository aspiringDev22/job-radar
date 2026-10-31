# JobRadar: Iteration 2 (Coverage, Quality, Search)

Goal of this iteration: make the board live, bigger, cleaner and searchable **before** adding auth, matching or the tracker.
Out of scope: Google login, CV upload, embeddings, tracker (see "Later").

---

## 1. Scheduled sync

**Problem.** Sync is manual, so the board goes stale.

**Requirements**

- A scheduled job runs `pnpm sync` every 6 hours (GitHub Actions cron or server cron).
- Per-company skip window stays at 4 hours; `--force` still overrides.
- One company failing never fails the run.
- Each run writes a `sync_runs` row: `started_at`, `finished_at`, `companies_ok`, `companies_failed`, `roles_added`, `roles_closed`.

**Acceptance**

- Two consecutive scheduled runs complete without manual input.
- A deliberately broken slug appears as failed in `sync_runs` and the other companies still sync.

## 2. Feed health

**Requirements**

- Per company store: `last_synced_at`, `last_success_at`, `last_error`, `consecutive_failures`, `last_role_count`.
- Mark a company `stale` when `consecutive_failures >= 3` or no role has a `posted_at` within 12 months.
- Internal page `/admin/health` lists companies sorted by worst health. Protect with a simple env-based password.

**Acceptance**

- Cars24 and Shipsy style dead feeds show up as `stale` without a manual note.

## 3. Closed roles

**Requirements**

- When a role disappears from a successful sync, set `status = closed`, `closed_at = now`.
- Closed roles stay viewable at their URL for 30 days with a "No longer accepting applications" banner, then return 410.
- Sitemap includes open roles only.

**Acceptance**

- A role that reappears is open again.
- A role that disappears during a failed sync is not closed.

## 4. Dedupe

**Requirements**

- `dedupe_key = hash(normalized_company + normalized_title + normalized_city)`.
- Roles sharing a key collapse into one list row; the detail page shows all locations.
- Never merge across companies.

**Acceptance**

- A role posted for 5 cities shows once in the list with "5 locations".

## 5. Normalization

**Seniority** (canonical): `intern | junior | mid | senior | staff_plus | manager | unknown`

- Rule-based mapping from title: SDE-1 / Engineer I → junior, SDE-2 / Engineer II → mid, SDE-3 / Senior → senior, Staff / Principal / L6+ → staff_plus, Engineering Manager / Head / Director → manager.
- Keep the raw title untouched; store canonical in a separate column.

**Location** (canonical): `city`, `region` (e.g. Delhi NCR), `country`, `work_mode` (`onsite | hybrid | remote | unknown`)

- Alias table: Bangalore→Bengaluru, Gurgaon→Gurugram, Noida/Gurugram/Delhi/Ghaziabad/Faridabad→Delhi NCR (region).

**Role family:** `backend | frontend | fullstack | mobile | data | ml | devops | qa | product | design | other`, from title keywords.

**Acceptance**

- Unit tests with at least 40 real titles from the current database covering each seniority and family.

## 6. Search

**Requirements**

- Replace word-contains with Postgres full-text search (tsvector, weighted: title A, company B, location C, description D) or Meilisearch if Postgres FTS feels limiting.
- Typo tolerance is a nice-to-have, not a blocker.
- Ranking: text rank, then recency.

**Acceptance**

- Searching "react developer bangalore" returns frontend roles in Bengaluru above unrelated matches.

## 7. Scope decisions (resolved)

| Decision | Choice |
|---|---|
| Remote outside India (AlphaSense, HighLevel, Airbnb, Navan) | India-only by default, "Include worldwide remote" toggle |
| Amazon | Software and technical roles by default, "Include operations" toggle |
| Headline count | Reflects the active filters, e.g. "142 roles at Freshworks" |
| Pay display | Show sample size and currency; no INR conversion yet |

## 8. Coverage

- Run the ATS auto-discovery script (below) against a seed list of 300 to 500 Indian startup domains.
- Add Keka as a feed type.
- Add "Suggest a company" form (URL input, stored in `company_suggestions`, reviewed manually).

**Acceptance**

- Board grows from 62 to at least 120 companies.

## 9. Not in this iteration

Auth, CV, profile, embeddings, saved jobs, tracker, email digests, ads.

---

# ATS auto-discovery: script outline

File: `scripts/discover-ats.ts`. Input: `data/seed-domains.csv` (`name,domain`). Output: `data/discovered.json`, reviewed by hand before merging into `data/companies.json`.

## Flow

1. For each company, build slug candidates: lowercase name, name without spaces, name with hyphens, domain without TLD.
2. Probe each ATS endpoint with each slug. A hit is a 200 response with at least one job.
3. If nothing hits, fetch `https://{domain}/careers` (also `/jobs`, `/about/careers`), and scan the HTML for ATS hostnames and extract the slug.
4. Output one result per company: `ats_type`, `ats_slug`, `role_count`, `confidence`.
5. Anything unresolved goes to a `needs_manual.csv`.

## Probe endpoints

| ATS | URL pattern |
|---|---|
| Greenhouse | `https://boards-api.greenhouse.io/v1/boards/{slug}/jobs` |
| Lever | `https://api.lever.co/v0/postings/{slug}?mode=json` |
| Ashby | `https://api.ashbyhq.com/posting-api/job-board/{slug}` |
| Workable | `https://apply.workable.com/api/v1/widget/accounts/{slug}` |
| SmartRecruiters | `https://api.smartrecruiters.com/v1/companies/{slug}/postings` |
| Recruitee | `https://{slug}.recruitee.com/api/offers/` |

## Careers page detection patterns

```
boards.greenhouse.io/{slug} | job-boards.greenhouse.io/{slug}
jobs.lever.co/{slug}
jobs.ashbyhq.com/{slug}
apply.workable.com/{slug}
careers.smartrecruiters.com/{slug}
{slug}.recruitee.com
{slug}.keka.com/careers   (Keka, once supported)
```

## Skeleton

```ts
type Hit = { ats_type: string; ats_slug: string; role_count: number; confidence: "high" | "medium" };

const probes = [
  { type: "greenhouse", url: (s: string) => `https://boards-api.greenhouse.io/v1/boards/${s}/jobs`, count: (j: any) => j.jobs?.length ?? 0 },
  { type: "lever", url: (s: string) => `https://api.lever.co/v0/postings/${s}?mode=json`, count: (j: any) => Array.isArray(j) ? j.length : 0 },
  { type: "ashby", url: (s: string) => `https://api.ashbyhq.com/posting-api/job-board/${s}`, count: (j: any) => j.jobs?.length ?? 0 },
  // workable, smartrecruiters, recruitee ...
];

function slugCandidates(name: string, domain: string): string[] {
  const base = name.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
  return [...new Set([base.replace(/ /g, ""), base.replace(/ /g, "-"), domain.split(".")[0]])];
}

async function probe(slug: string): Promise<Hit | null> {
  for (const p of probes) {
    const res = await fetchWithTimeout(p.url(slug), 8000);
    if (!res?.ok) continue;
    const n = p.count(await res.json());
    if (n > 0) return { ats_type: p.type, ats_slug: slug, role_count: n, confidence: "high" };
  }
  return null;
}

async function discover(company: { name: string; domain: string }) {
  for (const slug of slugCandidates(company.name, company.domain)) {
    const hit = await probe(slug);
    if (hit) return hit;
  }
  return await detectFromCareersPage(company.domain); // regex scan, confidence "medium"
}
```

## Guardrails

- Concurrency of 5, a 1 second delay per host, 8 second timeout, no retries beyond one.
- Same-name risk: a slug can belong to a different company. Always print `name`, `domain` and a sample role title in the output so you can verify before merging.
- Respect robots.txt on careers pages; only public pages and public APIs.
- Never auto-write into `companies.json`. Output to `discovered.json` and review.

---

# Task order

1. Normalization functions plus tests (pure code, lowest risk, helps everything after)
2. Dedupe
3. Closed-role handling (with the "failed sync must not close roles" test)
4. Feed health fields plus `/admin/health`
5. Scheduled sync
6. Search
7. Scope toggles and headline count
8. `scripts/discover-ats.ts`
9. Keka feed plus "Suggest a company"

Do one section at a time. Do not start the next section until the current one is accepted.

Anything that deletes or closes roles needs a `--dry-run` that prints what would change before it writes.

## Later (not tasks yet)

Auth, profile form, saved jobs and application pipeline, then rule-based matching, embeddings, skill-gap analysis and the daily task engine.
