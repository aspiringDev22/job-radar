# JobRadar PRD

Public job board for Indian startups and India roles at product companies. Listings come only from each company’s own public careers feed. Last local sync: **3,657** open roles across **62** companies.

## Who it is for

Someone in India looking at startup and MNC roles, who wants the posting from the company itself, with a filterable board, instead of LinkedIn, Naukri, or Indeed.

## What is live

**Board.** Home page is a three-pane layout: companies, role list, detail. Mobile uses a sheet; the role link goes to `/jobs/[slug]`. Search is word-contains across title, description, company, and location. Filters: city or a named area (Bengaluru, Delhi NCR, India, Remote), seniority, source, posted date, company. Each role page has the description, Apply link, JobPosting JSON-LD, and a sitemap entry.

**Pay.** A role shows the salary only when that posting publishes a range. If at least two roles at the same company and seniority publish a range, the page also shows a typical range, for example “Typical published pay for senior roles at Freshworks is $170k–$225k, from 8 roles.” The note includes the sample size and the currency the posting used. There is no INR conversion. There are no Glassdoor or AmbitionBox ratings.

**Ingestion.** `data/companies.json` is the company list. `pnpm db:seed` upserts it and closes roles for companies removed from the file. `pnpm sync` reads the public feeds. A company synced in the last 4 hours is skipped unless you pass `--force`. One failing company does not stop the run.

Feeds in use: Greenhouse, Lever, Ashby, Workable, SmartRecruiters, Recruitee, Workday, and Amazon’s own search. Keka is in the schema and not built.

**Which roles are kept**

| `locations` on the company | What is stored |
|---|---|
| omitted or `all` | The whole board. Used for Indian startups, including a few non-India roles at companies like Freshworks. |
| `india_or_remote` | India locations and remote roles. Used for Airbnb, AlphaSense, HighLevel, Navan, Agoda, Payoneer, Netskope, and similar boards. |
| Workday companies | India locations only. Adobe, Cisco, Intel, Nvidia, PayPal, Salesforce, Sprinklr. |
| Amazon | India only, and only Software Development, Applied Science, technical product, Solutions Architect, security engineering, Design, and Business Intelligence. Fulfillment and hourly operations are left off. |

Iteration 2 changes the remote and Amazon defaults. See `docs/iteration-2.md`.

## How to add a company

Confirm the public careers URL, add one row to `data/companies.json` (`name`, `ats_type`, `ats_slug`, optional `website` and `locations`), then `pnpm db:seed` and `pnpm sync`.

Workday slugs look like `wd5/adobe/external_experienced`. Amazon’s slug is `india`.

## Explicitly not built

- Google login, CV upload, profile, embeddings, “For you,” saved jobs
- Email digests
- Ads. `AdSlot` renders nothing
- Scheduled sync. Sync is a manual command
- Scraping LinkedIn, Indeed, Naukri, Glassdoor, or AmbitionBox

Companies from the coverage list that still have no readable public feed: Zomato, Blinkit, MakeMyTrip, Expedia, Spinny, Cars24, Acko, BharatPe, OYO, Delhivery, Gojek, DP World, Pluang, Syfe, Amex, OLX, Pocketpills, Dehaat, Times Internet, Info Edge, Housing, Akamai, LambdaTest, Wishlink, Unicommerce, Shipsy, Kotak, Confluent, Ticketmaster, Sophos, DoorDash, Nanonets, Microsoft. Attentive is US-office only. PayPay is a Japan board; PayPal is the one listed. Cars24’s only public posting is from 2018. Shipsy’s SmartRecruiters board was last updated in 2024. DTDL did not match a company.

## Planned next

Iteration 2 is the active plan: `docs/iteration-2.md`. Auth, CV, profile, embeddings, saved jobs, tracker, email, and ads stay out until that iteration is done.
