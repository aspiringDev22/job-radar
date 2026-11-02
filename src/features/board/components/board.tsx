import { AdSlot } from "@/features/ads/components";
import { Radar } from "@/shared/components/radar";
import { cn } from "@/shared/lib/utils";

import { descriptionMatchesLabel, headline, rangeLabel, syncedAgo } from "../lib/format";
import { boardHref } from "../lib/href";
import { hasBoardFilters, PAGE_SIZE, parseBoardQuery } from "../lib/query";
import { loadBoard } from "../server/load-board";
import { BoardFilters } from "./board-filters";
import { BoardHotkeys } from "./board-hotkeys";
import { BoardLink, BoardNavigationProvider } from "./board-navigation";
import { BoardPagination } from "./board-pagination";
import { CompanyList } from "./company-list";
import { JobList } from "./job-list";
import { MobileFilters } from "./mobile-filters";
import { RolePane } from "./role-pane";

// Below lg: one column, and a role opens on its own page.
// lg: the list and a pinned detail pane. xl: the company list pinned on the left as well.
// The panes pin 5rem from the top, below the 4rem site header.
export async function Board({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = parseBoardQuery(await searchParams);
  const data = await loadBoard(query);
  const companyCount = data.companies.length;
  const showingJob = Boolean(query.job && data.selected);
  const filtered = hasBoardFilters(query);
  const pageQuery = { ...query, page: data.page };
  const descriptionsHref = boardHref({
    ...query,
    posted: query.postedWithinDays,
    descriptions: true,
    page: null,
    job: null,
  });

  return (
    <BoardNavigationProvider>
      <div className="relative">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[34rem] bg-grid" />
        <div
          aria-hidden
          className="pointer-events-none absolute top-0 right-0 h-[30rem] w-[min(60rem,100%)] bg-[radial-gradient(closest-side,color-mix(in_oklch,var(--signal)_14%,transparent),transparent)]"
        />
        <div className="relative mx-auto max-w-[96rem] px-6 pt-10 pb-16 md:pt-14">
          <BoardHotkeys slugs={data.jobs.map((job) => job.slug)} query={pageQuery} />
          <div className="flex items-center justify-between gap-10">
            <div className="min-w-0">
              <p className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 rounded-full border bg-card/80 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full rounded-full bg-signal opacity-60 motion-safe:animate-ping" />
                  <span className="relative inline-flex size-2 rounded-full bg-signal" />
                </span>
                <span className="font-medium text-foreground">Live in India</span>
                <span aria-hidden>·</span>
                <span>{data.newThisWeek.toLocaleString("en-IN")} new this week</span>
                <span aria-hidden className="hidden sm:inline">
                  ·
                </span>
                <span className="hidden sm:inline">{syncedAgo(data.updatedAt)}</span>
              </p>
              <h1
                className={cn(
                  "mt-5 max-w-3xl font-serif leading-[1.04] tracking-tight text-balance",
                  filtered || data.company ? "text-[2rem]/[1.1] sm:text-4xl md:text-5xl" : "text-[2.6rem]/[1.06] sm:text-5xl md:text-6xl",
                )}
              >
                {data.company ? (
                  <>
                    {data.company.name} <span className="text-signal italic">is hiring.</span>
                  </>
                ) : (
                  <>
                    Roles hiring right now, <span className="text-signal italic">straight from the source.</span>
                  </>
                )}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
                {headline({ totalRoles: data.totalRoles, companyCount, filtered, company: data.company })}
              </p>
            </div>
            <Radar className="hidden w-52 shrink-0 lg:block xl:w-60" />
          </div>
          <BoardFilters query={query} categoryCounts={data.categoryCounts} />

          <div className="mt-8 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-start lg:gap-6 xl:grid-cols-[14rem_minmax(0,5fr)_minmax(0,6fr)]">
            <div className="hidden xl:sticky xl:top-20 xl:block xl:max-h-[calc(100dvh-6rem)] xl:overflow-y-auto xl:overscroll-contain xl:scrollbar-thin">
              <AdSlot placement="sidebar" />
              <CompanyList companies={data.companies} query={query} />
            </div>
            <div
              id="roles"
              className={cn(
                "scroll-mt-24 transition-opacity duration-150 group-data-[pending]/board:opacity-55",
                showingJob ? "hidden lg:block" : "block",
              )}
            >
              <div className="mb-3 flex min-h-8 items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {rangeLabel({ page: data.page, pageSize: PAGE_SIZE, total: data.listTotal })}
                  </span>
                  {data.listTotal > 1 ? <span> · {query.q ? "best match first" : "newest first"}</span> : null}
                </p>
                <MobileFilters key={query.company ?? "all"}>
                  <CompanyList companies={data.companies} query={query} />
                </MobileFilters>
              </div>
              {data.descriptionMatches > 0 && data.jobs.length > 0 ? (
                <p className="mb-3 rounded-xl border border-dashed px-3.5 py-2.5 text-sm leading-6 text-muted-foreground">
                  {descriptionMatchesLabel(data.descriptionMatches)}{" "}
                  <BoardLink href={descriptionsHref} className="font-medium text-signal underline-offset-4 hover:underline">
                    Include them
                  </BoardLink>
                </p>
              ) : null}
              <JobList
                jobs={data.jobs}
                query={pageQuery}
                filtered={filtered}
                descriptionMatches={data.descriptionMatches}
                descriptionsHref={descriptionsHref}
              />
              <BoardPagination query={pageQuery} page={data.page} pageCount={data.pageCount} />
            </div>
            <div className={cn(showingJob ? "block" : "hidden lg:block", "lg:sticky lg:top-20")}>
              <RolePane initial={data.selected} query={pageQuery} />
            </div>
          </div>
        </div>
      </div>
    </BoardNavigationProvider>
  );
}
