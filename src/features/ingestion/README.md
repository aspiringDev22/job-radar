# Ingestion

Reads public career feeds into Postgres. Nothing here runs during a page request.

- `scripts/sync.ts` (`pnpm sync`) parses the flags and calls `server/run-sync.ts`. The GitHub workflow `.github/workflows/sync.yml` runs it once a day with `--scheduled`.
- `server/run-sync.ts` takes the advisory lock, writes the run-level `sync_runs` row, skips companies synced in the last four hours, and syncs the rest two at a time. `server/sync-company.ts` syncs one company: it upserts `jobs`, closes roles missing from a successful fetch, and records a `company_syncs` row and the company's health columns.
- `scripts/seed.ts` (`pnpm db:seed`) upserts `data/companies.json` and closes roles of companies removed from it. Pass `--dry-run` to print the changes first.
- `adapters/` has one adapter per ATS: Greenhouse, Lever, Ashby, Workable, SmartRecruiters, Recruitee, Workday and Amazon. Each returns the `NormalizedJob` shape in `types.ts`. `adapters/fixtures` holds the payloads that `adapters.test.ts` parses.
- `lib/normalize.ts` classifies seniority, role family, role category and place. The category reads the title first and the feed's department only when the title names no kind of work; the rules run in order, job names before subject words. `lib/dedupe-key.ts` builds the key that groups one posting across cities. `lib/sync-plan.ts` decides which roles a sync opens, reopens or closes. `lib/sync-run.ts` holds the skip window and run totals, and `lib/sync-args.ts` parses the `pnpm sync` flags.
- `scripts/discover-ats.ts` (`pnpm discover`) finds the ATS behind each company in `data/seed-domains.csv`. `lib/discovery.ts` holds its pure parts: slug candidates, a Zod summary of each ATS's job list, careers-page link patterns and the `robots.txt` check. `lib/http.ts` gives it the shared per-host delay, with a shorter timeout and one retry. `lib/pool.ts` limits how many companies run at once, for discovery and sync alike.
- `scripts/backfill-normalization.ts` and `scripts/backfill-dedupe.ts` recompute those columns for every stored role. Run the first one after changing a classifier. Run them with `node --env-file=.env src/features/ingestion/scripts/<name>.ts`.
- `index.ts` exports the sync trigger values and `formatDuration` for `/admin/health`. `schema.ts` holds `sync_runs` and `company_syncs`.

Every file here runs under plain Node, so imports are relative and end in `.ts`.
