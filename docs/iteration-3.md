# JobRadar: Iteration 3 (Accounts, Saved jobs, Tracker, Matching)

Goal of this iteration: let a visitor sign in, say what they want, keep the roles they like, track their applications, and see the board ranked for them.
Out of scope: CV upload and parsing, embeddings, email digests, ads (see "Later").

Every section keeps the iteration 2 rules: Drizzle migrations for every schema change, Zod at every boundary, small pure functions with unit tests, no new dependency without asking.

---

## 1. Sign in with Google

**Requirements**

- Auth.js v5 (`next-auth@beta`) with the Google provider and `@auth/drizzle-adapter`, on the existing `users`, `accounts`, `sessions`, `verification_tokens` and `authenticators` tables. Database sessions.
- Header shows "Sign in" or the user's avatar with "Sign out".
- `/me` and everything under it require a session. Signed-out visitors are sent to sign in and back.
- The board, role pages and sitemap stay public and fully static-friendly. Reading the session happens only inside `Suspense` boundaries.
- Keys in `.env.example`: `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`. Nothing breaks while they are unset: the header hides "Sign in".

**Acceptance**

- Sign in, reload, sign out, on localhost.
- A signed-out request to `/me` lands on Google and returns to `/me`.
- `next build` passes with no new dynamic routes outside `/me` and `/api/auth`.

## 2. Profile and preferences

**Requirements**

- `/me/profile` form for `profile_json` (titles, skills, years of experience, locations, remote preference) and `preferences_json` (locations, remote only, seniorities, posted within). Validated with the existing Zod schemas in `src/features/auth/lib/profile.ts`, extended with role families.
- Server Action with the session checked inside it.
- Empty profile is valid; every field is optional to fill.

**Acceptance**

- Save, reload, values persist. Invalid input shows field errors and saves nothing.

## 3. Saved jobs

**Requirements**

- Save and unsave from the board detail pane and the role page. Signed-out visitors see "Sign in to save".
- `/me/saved` lists saved roles, newest first, with closed roles marked and kept.
- A saved role that closes stays in the list with "No longer accepting applications".

**Acceptance**

- Save a role on the board, see it on `/me/saved`, unsave it from either place.
- A user never sees another user's saved roles (checked in the Server Action and the loader).

## 4. Application tracker

**Requirements**

- `saved_jobs.status` moves through `saved → applied → interview → rejected`, plus `offer`. Add `offer` with a migration.
- `/me/applications` shows one column per status, with a count. Each card has company, title, last update and a notes field.
- Status changes and notes save through Server Actions. `updated_at` records each change.

**Acceptance**

- Move a role from saved to applied to interview; reload; it stays.
- Notes up to 2,000 characters persist.

## 5. Matching ("For you")

**Requirements**

- Rule-based, no embeddings: a pure `matchScore(job, profile, preferences)` from role family, canonical seniority, city or region, remote preference, recency, and skill words found by the full-text search.
- `/me/for-you` shows the top 50 open India roles by score, each with a one-line reason built from the rules ("Backend, senior, Bengaluru, matches Go and Kafka").
- Unit tests over at least 20 fixture roles and 5 profiles.

**Acceptance**

- A backend engineer in Bengaluru who wants senior roles sees senior backend roles in Bengaluru or remote first, and no Amazon operations roles.

## 6. Housekeeping carried over

Done 2026-11-01. Unknown and badly encoded slugs return 404 from the proxy. An empty feed is held for one sync (`holdEmptyFeed`). Product, program, project and account managers are levelled by the rest of the title; 867 stored roles moved out of `manager`.

- An unknown `/jobs/[slug]` returns HTTP 404 instead of 200 with the not-found page.
- A successful sync that returns zero roles for a company that had more than 10 does not close them until a second run agrees (mass-close guard).
- "Senior Product Manager" classifies as senior, not manager.

---

# Task order

Sign-in is on hold (decided 2026-11-01): no new auth dependencies and no Google keys yet. Sections 2 to 5 need a signed-in user, so they wait with it.

1. Housekeeping (section 6)
2. Sign in with Google, once the dependencies are approved
3. Profile and preferences
4. Saved jobs
5. Application tracker
6. Matching

Do one section at a time. Do not start the next section until the current one is accepted.

## Later (not tasks yet)

CV upload and parsing (Anthropic), embeddings and semantic matching, skill-gap notes, email digests, the daily task engine, ads.
