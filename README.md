# JobRadar

A public job board that lists roles directly from company career sites and, in later phases, ranks them against a profile.

The board lists open roles at Indian startups and India offices of product companies. Greenhouse, Lever, Ashby, Workable, SmartRecruiters, Recruitee, Workday, and Amazon's own careers search are read into Postgres. Filters, a page per role, and a sitemap are in place. Sign-in and matching come later.

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

If you use Neon or Supabase instead of Docker, put that connection string in `DATABASE_URL` before `pnpm db:migrate`.

## Scripts

| Script | What it does |
| --- | --- |
| `pnpm dev` | Start the Next.js app |
| `pnpm db:generate` | Write a SQL migration from the Drizzle schema |
| `pnpm db:migrate` | Apply migrations in `drizzle/` |
| `pnpm db:seed` | Upsert `data/companies.json`. Companies removed from the file are marked inactive and their roles are closed. |
| `pnpm sync` | Read Greenhouse, Lever, Ashby, Workable, SmartRecruiters, Recruitee, Workday, and Amazon boards into `jobs` |
| `pnpm test` | Run adapter and normalization tests |
| `pnpm lint` | Run ESLint |

`pnpm sync` skips a company that was synced in the last four hours. Pass `--force` to read it again: `pnpm sync -- --force`. One failing company is recorded in `sync_runs` and does not stop the others. SmartRecruiters publishes the role text one posting at a time, so the first sync of a large board such as Swiggy takes several minutes.

## Companies file

`data/companies.json` is an array of `{ "name", "ats_type", "ats_slug", "website"?, "locations"? }`. `locations` is `all` or `india_or_remote`. A company is added by confirming its public careers API, then adding one row and running `pnpm db:seed` and `pnpm sync`.

`ats_type` is one of `greenhouse`, `lever`, `ashby`, `workable`, `smartrecruiters`, `recruitee`, `keka`, `workday`.

The file is limited to Indian startups and India-based product companies whose public Greenhouse, Lever, or Ashby boards responded. Re-running `pnpm db:seed` updates name and website, leaves an existing slug stable, and closes roles for companies that were removed.

Search and filters live on the home page (`q`, `location`, `remote`, `seniority`, `source`, `posted`, `company`). Each role also has `/jobs/[slug]`, with JobPosting JSON-LD. `/sitemap.xml` lists those pages. Set `NEXT_PUBLIC_SITE_URL` before sharing the sitemap.

## Environment

Copy `.env.example` to `.env`. Local runs need `DATABASE_URL`. Set `NEXT_PUBLIC_SITE_URL` for canonical job links and the sitemap. The Auth.js, Anthropic, and embeddings keys are reserved for later phases.

## Project layout

- `src/app` — App Router pages
- `src/components/layout` — three-pane shell
- `src/components/ui` — shadcn components
- `src/db/schema` — Drizzle tables
- `scripts/seed.ts` — company seed
- `data/companies.json` — companies to load
- `workers` — sync scripts (Phase 2)
- `.cursor/rules` — project rules for Cursor
