# Workers

`pnpm sync` runs `workers/sync.ts`. It is not called from a page request.

Greenhouse, Lever, and Ashby each have an adapter in `workers/adapters`. Every adapter returns the same `NormalizedJob` shape. Fixtures in `workers/fixtures` cover the parsers. Workable, SmartRecruiters, and Recruitee are not built yet.
