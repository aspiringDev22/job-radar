# JobRadar

A public job board that lists roles directly from company career sites and, in later phases, ranks them against a profile.

The board lists open roles at Indian startups and India offices of product companies. Greenhouse, Lever, Ashby, Workable, SmartRecruiters, Recruitee, Workday, Keka, and Amazon's own careers search are read into Postgres. Filters, a page per role, and a sitemap are in place. Sign-in and matching come later.

## Prerequisites

- Node.js 22 or newer
- pnpm 10 (`corepack enable`, then `corepack prepare pnpm@10.18.2 --activate`)
- Postgres 16 with the `vector` extension. Use the Docker Compose file below, or a Neon or Supabase database that allows `CREATE EXTENSION vector`. Compose publishes port 5433 so it does not collide with a Postgres already on 5432.

## Run locally

```bash
pnpm install
docker compose up -d
cp .env.example .env
pnpm db:migrate
pnpm db:seed
pnpm sync
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

If you use Neon instead of Docker, `neon init` writes both connection strings into `.env`. `DATABASE_URL` is the pooled one, which the app uses. `DATABASE_URL_UNPOOLED` is the direct one, which migrations and the sync's run lock use, because a pooler hands out a different server connection per transaction. For another host, put the pooled URL in `DATABASE_URL` and the direct one in `DATABASE_URL_UNPOOLED`. With a single URL, set only `DATABASE_URL`.

## Scripts

| Script | What it does |
| --- | --- |
| `pnpm dev` | Start the Next.js app |
| `pnpm db:generate` | Write a SQL migration from the Drizzle schema |
| `pnpm db:migrate` | Apply migrations in `drizzle/` |
| `pnpm db:seed` | Upsert `data/companies.json`. Companies removed from the file are marked inactive and their roles are closed. |
| `pnpm sync` | Read Greenhouse, Lever, Ashby, Workable, SmartRecruiters, Recruitee, Workday, Keka, and Amazon boards into `jobs`. Runs every six hours once scheduled (below). |
| `pnpm discover` | Find which public ATS each company in `data/seed-domains.csv` uses. Writes `data/discovered.json` and `data/needs_manual.csv` for review. |
| `pnpm test` | Run every `src/**/*.test.ts` |
| `pnpm lint` | Run ESLint |

`pnpm sync` skips a company that synced successfully in the last four hours. Flags:

- `--force` reads every company again, ignoring the four-hour window.
- `--only swiggy,cred` syncs only those company slugs.
- `--dry-run` prints what would be added, reopened and closed, and writes nothing.
- `--scheduled` marks the run as scheduled. The scheduler passes it.

Pass flags after `--`, for example `pnpm sync -- --force --only swiggy`.

Each run writes one `sync_runs` row: trigger, start and finish times, companies ok, failed and skipped, and roles added, reopened and closed. Each company it fetched gets a `company_syncs` row with its own counts or error. A failing company is recorded there and on the company row (`last_error`, `consecutive_failures`), and does not stop the others. A feed that suddenly returns no roles, for a company with more than 10 open, closes nothing. It is recorded as a failure, and the roles close only if the next sync also finds the feed empty.

The run exits non-zero only when the run itself fails, for example a bad flag, an unreachable database or an invalid `data/companies.json`. A Postgres advisory lock stops a second sync from starting while one is running. The second one prints a message and exits 0. SmartRecruiters and Workday publish the role text one posting at a time, so the first sync of a large board such as Swiggy or Cisco takes several minutes. A full run of the 62 companies takes about 15 minutes.

## Scheduled sync

`.github/workflows/sync.yml` runs `pnpm sync --scheduled` every six hours, at 00:17, 06:17, 12:17 and 18:17 UTC. To turn it on:

1. Push the repository to GitHub. Scheduled workflows run from the default branch.
2. Add the repository secrets `DATABASE_URL` and `DATABASE_URL_UNPOOLED` for the production database, the same two values as in `.env` when it points at Neon. The Docker database on your machine is not reachable from GitHub.
3. Apply migrations to that database with `pnpm db:migrate` before merging code that needs them. The workflow does not migrate.

You can also start a run by hand from the Actions tab (**Run workflow**), with optional `force` and `only` inputs. GitHub may start a scheduled run a few minutes late, and it pauses schedules in a repository with no activity for 60 days.

On a server, use cron instead of the workflow:

```cron
17 */6 * * * cd /srv/jobradar && pnpm sync --scheduled >> /var/log/jobradar-sync.log 2>&1
```

`/admin/health` lists the last ten runs, with the companies that failed in each.

## Companies file

`data/companies.json` is an array of `{ "name", "ats_type", "ats_slug", "website"?, "locations"? }`. `locations` is `all` or `india_or_remote`. A company is added by confirming its public careers API, then adding one row and running `pnpm db:seed` and `pnpm sync`.

`ats_type` is one of `greenhouse`, `lever`, `ashby`, `workable`, `smartrecruiters`, `recruitee`, `keka`, `workday`.

### Suggestions from visitors

`/suggest` takes a company's website or careers page and stores it in `company_suggestions`, one row per site. Repeat suggestions raise its count. Job boards such as LinkedIn or Naukri are refused, a site already on the board gets a "already listed" reply, and a hidden field and an hourly cap keep bots out. Review them at `/admin/suggestions`: add the name and domain to `data/seed-domains.csv`, run `pnpm discover --only "Name"`, and copy a confirmed feed into `companies.json`.

### Finding new companies

`data/seed-domains.csv` lists candidate companies as `name,domain`. `pnpm discover` works through the rows that are not in `companies.json` yet, five companies at a time, with a one-second delay per host and an eight-second timeout:

1. It tries the Greenhouse, Lever, Ashby, Workable, SmartRecruiters, Recruitee and Keka APIs with slugs built from the name and the domain. A hit is a public board with at least one role.
2. If none answers, it reads the company's `/careers`, `/jobs`, `/about/careers` and home pages, after checking `robots.txt`. It looks for ATS links, including Workday and Keka, and confirms each link against that ATS's API.
3. Each result records the role count, roles in India, a sample title and location, and a confidence. **High** means the API answered for a slug built from the name and some roles are in India. **Medium** means the slug came from the careers page. **Low** means none of the roles are in India, which often means another company with the same name.
4. Companies with no result go to `data/needs_manual.csv` with a reason, such as "uses Darwinbox" or "no ATS link found". Pages that build their job list in the browser cannot be read.

Pass `--limit 20` or `--only "Zepto,Juspay"` to try a few companies. Results are merged into the two files, and a company checked again replaces its old row. Pass `--resume` to skip companies that already have a row, which continues a run that stopped. The script never edits `companies.json`. Check the sample titles, then copy confirmed rows into `companies.json` and run `pnpm db:seed` and `pnpm sync`.

The file is limited to Indian startups and India-based product companies whose public Greenhouse, Lever, or Ashby boards responded. Re-running `pnpm db:seed` updates name and website, leaves an existing slug stable, and closes roles for companies that were removed.

Search and filters live on the home page (`q`, `location`, `remote`, `role`, `seniority`, `source`, `posted`, `company`, `desc`, `page`). The list shows 50 roles a page. `role` is the kind of work, one of 17 categories such as software engineering, design, sales or operations (`jobs.category`, set from the title, or from the feed's department when the title names no kind of work); the Role menu shows how many roles each category has under the other filters. `seniority` uses the level read from the title (`intern`, `junior`, `mid`, `senior`, `staff_plus`, `manager`, `unknown`), so "Sr. Engineer" counts as senior even when the feed sends no level; old links with `staff`, `principal` or `executive` still work.

The board shows India roles by default, meaning roles whose location names an Indian city or state, or India itself. Two toggles widen it:

- `worldwide=1` (**Include worldwide remote**) adds remote roles based outside India. Onsite roles outside India are never listed on the board, though their pages stay reachable.
- `ops=1` (**Include Amazon operations**) adds Amazon's non-technical categories, such as fulfilment, operations, finance, HR and sales. By default Amazon shows only the categories in `AMAZON_TECHNICAL_DEPARTMENTS`.

The headline count follows every filter and toggle, for example "30 roles at Freshworks". Published pay is shown in the currency it was posted in, and nothing is converted to INR. The level pay note on a role takes the median within the most common currency and names the currency and the number of roles behind it.

`q` uses Postgres full-text search. Every search word must be in the role's title, company name or location. Skills (python, react, kubernetes and about 80 others, listed in `src/features/board/lib/search.ts`) may be in the description instead, so "react developer" finds engineers whose description asks for React. Titles and locations are matched as whole words through `jobs.title_vector` (no stemming; a word also matches its plural), so "designer" does not find "Design Engineer" and "developer" does not find "Business Development". The description is matched through `jobs.search_vector` (English, stemmed), and the company name through `companies.search_vector`. All three are generated columns, so they stay current without a backfill. The list says how many roles matched only in their description, with a link to include them; "Search descriptions too" (`desc=1`) lets every word match the description. Common alternatives count as the same word, for example bangalore and bengaluru, developer and engineer, senior and sr, or frontend and front end, and two-word terms such as "machine learning" are read as one. Results rank by where each word matched (title, then company, location, description), with a boost when the title holds the whole query in order and another when the role's family matches the one the query implies. Ties go to the most recently posted. Typo tolerance is not in yet. Each role also has `/jobs/[slug]`, with JobPosting JSON-LD. The proxy answers 404 for a slug that was never stored and 410 for a role closed more than 30 days ago, before the page starts streaming. `/sitemap.xml` lists those pages. Set `NEXT_PUBLIC_SITE_URL` before sharing the sitemap.

## Environment

Copy `.env.example` to `.env`. Local runs need `DATABASE_URL`, and `DATABASE_URL_UNPOOLED` too when `DATABASE_URL` goes through a pooler. Set `NEXT_PUBLIC_SITE_URL` for canonical job links and the sitemap. Set `ADMIN_PASSWORD` to open `/admin/health` (HTTP Basic, any user name); it returns 404 while unset.

`/admin/health` lists recent sync runs and every active feed, worst first. `/admin/suggestions` lists what visitors sent through **Suggest a company** (`/suggest`), with the same password. A feed is stale after three failed syncs in a row, with no open roles, or when no open role was posted in the last 12 months. The Auth.js, Anthropic, and embeddings keys are reserved for later phases.

## Project layout

The code is organised by feature. See [docs/architecture.md](docs/architecture.md) for the rules, which `pnpm lint` enforces.

- `src/app` — routes; thin files that compose features
- `src/features/board` — home page list, filters and search
- `src/features/jobs` — job table, job page, closed roles, listing grouping
- `src/features/companies` — company table
- `src/features/ingestion` — feed adapters, normalization, `pnpm sync` and `pnpm db:seed`
- `src/features/feed-health` and `src/features/admin` — `/admin/health` and its password gate
- `src/features/suggestions` — the **Suggest a company** form and its review list
- `src/features/ads`, `auth`, `saved-jobs` — placeholders for later phases
- `src/shared` — header, theme, shadcn UI, database client, small helpers
- `data/companies.json` — companies to load
- `.cursor/rules` — project rules for Cursor
