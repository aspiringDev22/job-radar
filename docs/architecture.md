# Architecture

JobRadar is organised by feature. Each feature owns everything it needs: its tables, logic, data loading, UI, scripts and tests. Routes compose features. Shared code knows nothing about any feature.

```
src/
  app/              Routes only. Thin files that compose features.
  proxy.ts          Request routing for /admin and /jobs/[slug].
  features/
    <feature>/
      index.ts        Public: types, constants, pure functions.
      schema.ts       Public: Drizzle tables and enums.
      server.ts       Public: server-only loaders and request helpers.
      components.ts   Public: React components.
      constants.ts    Private from here down.
      types.ts
      lib/            Pure logic and its *.test.ts files.
      server/         Database access. In ingestion, the sync engine that scripts/ drive.
      components/     React components.
      scripts/        Node entry points (ingestion only).
  shared/
    components/       Site header, theme, page skeleton.
    components/ui/    shadcn primitives.
    db/client.ts      Postgres + Drizzle client.
    db/columns.ts     Custom column types (tsvector).
    lib/              cn, siteUrl, slug.
data/               companies.json and other input files.
drizzle/            SQL migrations.
docs/               Product spec and plans.
```

## Features

| Feature | Owns | Depends on |
|---|---|---|
| `companies` | `companies` table, ATS types | none |
| `jobs` | `jobs` table, job page, JSON-LD, pay note, location groups, listing grouping, closed-role rules | companies |
| `board` | Home page list, filters, full-text search and ranking, company list, hotkeys | jobs, companies, ads, ingestion (role family classifier) |
| `ingestion` | Feed adapters, normalization, dedupe key, sync engine and scripts, seed, `sync_runs` and `company_syncs` tables, backfills | jobs, companies |
| `feed-health` | Stale rule and the `/admin/health` report, including recent sync runs | jobs, companies, ingestion |
| `admin` | `ADMIN_PASSWORD` check for the proxy and for admin pages | none |
| `ads` | `AdSlot` (renders nothing) | none |
| `auth` | `users` and Auth.js tables, profile and preferences schemas (Phase 4) | none |
| `saved-jobs` | `saved_jobs` table (tracker, later) | auth, jobs |
| `suggestions` | `company_suggestions` table, the `/suggest` form and its Server Action, the `/admin/suggestions` list | companies |

Dependencies point one way. A feature that needs another feature imports only that feature's public entry files. Two features that need each other mean a piece belongs somewhere else. For example, `db:seed` closes jobs, so it lives in `ingestion`, not in `companies`.

## Public entry points

A feature exposes up to four files. Each exists because the same feature is consumed from different runtimes.

| File | Contains | Safe in |
|---|---|---|
| `index.ts` | Types, constants, pure functions. No JSX, database, Next or Node built-ins. | Client components, server code, Node scripts |
| `schema.ts` | Drizzle tables and enums | Server code, Node scripts, drizzle-kit |
| `server.ts` | Database loaders, request helpers | Next server only (routes, server components, proxy) |
| `components.ts` | React components, free of server code so client components can import them too | Routes and other features' components |

Client components (`"use client"`) import other features only through `index.ts`. That keeps the database driver out of browser bundles.

Inside a feature, files import each other directly by relative path, never through their own feature's public entries.

## Import paths

Node runs `pnpm sync`, `pnpm db:seed` and `pnpm test` directly, and Node does not resolve the `@/` alias.

- Files that Node loads use relative imports with a `.ts` extension. These are `index.ts`, `schema.ts`, `constants.ts`, `types.ts`, everything in `lib/`, everything in `ingestion/`, and `shared/db` and `shared/lib`.
- Everything else (components, `server/`, routes) uses `@/features/<name>/<entry>` and `@/shared/...` across features, and relative paths inside a feature.

## Enforcement

`pnpm lint` fails on:

- importing another feature's internals instead of a public entry, by alias or by relative path
- `shared/` importing a feature or a route
- a feature importing a route
- `@/` in a file that Node loads

The rules are in `eslint.config.mjs`. New feature folders are picked up automatically.

## Adding to the codebase

- **New table:** add it to the owning feature's `schema.ts`. drizzle-kit reads `src/features/*/schema.ts`, so `pnpm db:generate` sees it.
- **New pure logic:** put it in `lib/` with a `*.test.ts` next to it. `pnpm test` runs every `src/**/*.test.ts`.
- **New feature:** create `src/features/<name>/` and add only the entry files it needs.
- **New route:** add a thin file under `src/app` that renders a feature's components.
- **New script:** put it in the owning feature's `scripts/` folder and add a `package.json` script for it.
