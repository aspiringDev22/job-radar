# JobRadar PRD

Public job board for Indian startups and India roles at product companies. Listings come only from each company’s own public careers feed. Last local sync: **4,630** live India roles across **135** companies.

## Who it is for

Someone in India looking at startup and MNC roles, who wants the posting from the company itself, with a filterable board, instead of LinkedIn, Naukri, or Indeed.

## What is live

**Board.** Home page is a three-pane layout: companies, role list, detail. Mobile uses a sheet; the role link goes to `/jobs/[slug]`. Filters: city or a named area (Bengaluru, Delhi NCR, India, Remote), role category (17 kinds of work, with counts), seniority read from the title, source, posted date, company. Search words must be in the title, company or location; skills such as Python or React may be in the description, and a link includes the roles that match only in their description. The list shows 50 roles a page, and the company list and role detail stay in view while it scrolls. The headline count follows every filter, for example "30 roles at Freshworks". A role posted in several cities shows once, with "5 locations", and its page lists them all.

**Search.** Postgres full-text search. Title is weighted A, company B, location C and description D. Every word must match. Common alternatives count as the same word, such as bangalore and bengaluru, or developer and engineer. Results rank by where each word matched, with a boost when the role family matches the query, then by recency.

**Scope.** India roles by default. **Include worldwide remote** adds remote roles based outside India. Amazon shows its technical categories by default, and **Include Amazon operations** adds the rest. Onsite roles outside India are never listed on the board.

**Role pages.** Each role has the description, the Apply link, JobPosting JSON-LD, and a sitemap entry while it is open. A role that disappears from a successful sync is closed. Its page stays up for 30 days with a "No longer accepting applications" banner, then returns 410.

**Pay.** A role shows the salary only when that posting publishes a range, in the posting's own currency. If at least two roles at the same company and seniority publish a range, the page also shows a typical range: the median within the most common currency, with the currency and the number of roles named. There is no INR conversion. There are no Glassdoor or AmbitionBox ratings.

**Ingestion.** `data/companies.json` is the company list. `pnpm db:seed` upserts it and closes roles for companies removed from the file. `pnpm sync` reads the public feeds and runs once a day from `.github/workflows/sync.yml`. A company synced in the last 4 hours is skipped unless you pass `--force`. One failing company does not stop the run. Each run is recorded in `sync_runs`, with one `company_syncs` row per company.

Feeds in use: Greenhouse, Lever, Ashby, Workable, SmartRecruiters, Recruitee, Workday, Keka, and Amazon’s own search.

**Which roles are kept**

| `locations` on the company | What is stored |
|---|---|
| omitted or `all` | The whole board. Used for Indian startups. The board still shows only India roles by default. |
| `india_or_remote` | India locations and remote roles. Used for global boards such as Airbnb, Stripe, Databricks and GitLab. |
| Workday companies | India locations only. |
| Amazon | Every India role, with its category in `jobs.department`. |

**Internal pages.** `/admin/health` (HTTP Basic, `ADMIN_PASSWORD`) lists recent sync runs and every feed, worst first. A feed is stale after three failed syncs in a row, with no open roles, or with no role posted in 12 months. `/admin/suggestions` lists what visitors sent through **Suggest a company** (`/suggest`).

## How to add a company

Add `name,domain` to `data/seed-domains.csv` and run `pnpm discover --only "Name"`. It probes the public ATS APIs and the company's careers pages, and writes `data/discovered.json`. Check the sample role and India count, then add one row to `data/companies.json` (`name`, `ats_type`, `ats_slug`, optional `website` and `locations`), then `pnpm db:seed` and `pnpm sync`.

Workday slugs look like `wd5/adobe/external_experienced`. Amazon’s slug is `india`. Keka slugs are the subdomain of `{slug}.keka.com/careers`.

## Explicitly not built

- Google login, CV upload, profile, embeddings, “For you,” saved jobs
- Email digests
- Ads. `AdSlot` renders nothing
- Scraping LinkedIn, Indeed, Naukri, Glassdoor, or AmbitionBox
- Darwinbox. Its job API sits behind Cloudflare bot management, which refuses automated requests after a few calls. The 26 companies that use it, including Spinny, Rapido, PharmEasy and upGrad, stay off the board until a sanctioned feed exists.

`data/needs_manual.csv` lists the companies from the seed list that still have no readable public feed, with the reason. Most build their job list in the browser, or use Darwinbox, Zoho Recruit, Freshteam, Turbohire or SuccessFactors.

## Planned next

Iteration 2 is done (`docs/iteration-2.md`). Next: sign-in, profile, saved jobs and the application tracker, then matching.
