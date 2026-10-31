import { BoardFilters } from "@/components/board/board-filters";
import { BoardHotkeys } from "@/components/board/board-hotkeys";
import { CompanyList } from "@/components/board/company-list";
import { JobDetail } from "@/components/board/job-detail";
import { JobList } from "@/components/board/job-list";
import { AdSlot } from "@/components/layout/ad-slot";
import { MobileFilters } from "@/components/layout/mobile-filters";
import { loadBoard } from "@/lib/board";
import { hasBoardFilters, parseBoardQuery } from "@/lib/filters";
import { updatedLabel } from "@/lib/format";

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
  const roleWord = data.totalRoles === 1 ? "role" : "roles";

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <BoardHotkeys slugs={data.jobs.map((job) => job.slug)} selectedSlug={data.selected?.slug ?? null} query={query} />
      <p className="text-sm text-muted-foreground">India roles</p>
      <h1 className="mt-2 max-w-xl font-serif text-4xl tracking-tight text-balance md:text-5xl">
        Roles hiring right now
      </h1>
      <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
        {data.totalRoles.toLocaleString("en-IN")} {filtered ? "matching" : "live"} {roleWord} across{" "}
        {companyCount} {companyCount === 1 ? "company" : "companies"}, read from their own career
        pages.
      </p>
      <p className="mt-2 text-sm text-muted-foreground">{updatedLabel(data.updatedAt)}</p>
      <BoardFilters query={query} />

      <div className="mt-10 lg:grid lg:grid-cols-[14rem_minmax(0,1fr)_22rem] lg:items-start lg:gap-8">
        <div className={showingJob ? "hidden lg:block" : "block"}>
          <div className="mb-4 lg:hidden">
            <MobileFilters key={query.company ?? "all"}>
              <CompanyList companies={data.companies} query={query} />
            </MobileFilters>
          </div>
          <div className="hidden lg:block">
            <AdSlot placement="sidebar" />
            <CompanyList companies={data.companies} query={query} />
          </div>
        </div>
        <div className={showingJob ? "hidden lg:block" : "block"}>
          <JobList
            jobs={data.jobs}
            query={query}
            selectedSlug={data.selected?.slug ?? null}
            truncated={data.truncated}
            filtered={filtered}
          />
        </div>
        <div className={showingJob ? "block" : "hidden lg:block"}>
          <JobDetail job={data.selected} query={query} />
        </div>
      </div>
    </div>
  );
}
