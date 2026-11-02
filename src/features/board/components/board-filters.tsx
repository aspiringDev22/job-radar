import { CheckIcon, MapPinIcon, SearchIcon, XIcon } from "lucide-react";
import Link from "next/link";

import {
  CANONICAL_SENIORITIES,
  LOCATION_GROUPS,
  ROLE_CATEGORIES,
  ROLE_CATEGORY_LABELS,
  activeLocationId,
  sourceLabel,
  type CanonicalSeniority,
  type RoleCategory,
} from "@/features/jobs";
import { cn } from "@/shared/lib/utils";

import { activeChipClass, chipClass } from "../lib/chip";
import { boardHref } from "../lib/href";
import { BOARD_SOURCES, hasBoardFilters, type BoardQuery } from "../lib/query";
import { FilterMenu } from "./filter-menu";

const SENIORITY_LABELS: Record<CanonicalSeniority, string> = {
  intern: "Intern",
  junior: "Junior",
  mid: "Mid-level",
  senior: "Senior",
  staff_plus: "Staff and principal",
  manager: "Manager and above",
  unknown: "Level not stated",
};

const POSTED_LABELS: Record<number, string> = {
  1: "Past day",
  7: "Past week",
  30: "Past month",
};

// How many categories the landing page offers as one-click links.
const BROWSE_COUNT = 6;

export function BoardFilters({
  query,
  categoryCounts,
}: {
  query: BoardQuery;
  categoryCounts: Partial<Record<RoleCategory, number>>;
}) {
  const activeLocation = activeLocationId(query.location);
  const locationGroup = LOCATION_GROUPS.find((group) => group.id === activeLocation) ?? null;
  // Every link below keeps the other filters, drops the open role and goes back to page 1.
  const base = { ...query, posted: query.postedWithinDays, job: null, page: null };
  const href = (change: Parameters<typeof boardHref>[0]) => boardHref({ ...base, ...change });
  const formKey = [query.q, query.location].join("|");
  const filtered = hasBoardFilters(query);
  const toggles = [
    { label: "Remote", active: query.remote, href: href({ remote: !query.remote }) },
    { label: "Worldwide remote", active: query.worldwide, href: href({ worldwide: !query.worldwide }) },
    { label: "Amazon operations", active: query.operations, href: href({ operations: !query.operations }) },
    // Only matters with search words, so it shows only then.
    ...(query.q
      ? [{ label: "Search descriptions too", active: query.descriptions, href: href({ descriptions: !query.descriptions }) }]
      : []),
  ];
  const browse = ROLE_CATEGORIES.filter((category) => category !== "other" && (categoryCounts[category] ?? 0) > 0)
    .sort((left, right) => (categoryCounts[right] ?? 0) - (categoryCounts[left] ?? 0))
    .slice(0, BROWSE_COUNT);

  return (
    <div className="mt-8 space-y-4">
      <form
        key={formKey}
        action="/"
        role="search"
        className="flex flex-col gap-1 rounded-2xl border bg-card p-1.5 shadow-sm shadow-black/[0.03] transition-shadow focus-within:border-signal/40 focus-within:ring-4 focus-within:ring-signal/10 sm:flex-row sm:items-center"
      >
        {/* A new search keeps the filters that are already on. */}
        {query.company ? <input type="hidden" name="company" value={query.company} /> : null}
        {query.category ? <input type="hidden" name="role" value={query.category} /> : null}
        {query.seniority ? <input type="hidden" name="seniority" value={query.seniority} /> : null}
        {query.source ? <input type="hidden" name="source" value={query.source} /> : null}
        {query.postedWithinDays ? <input type="hidden" name="posted" value={query.postedWithinDays} /> : null}
        {query.remote ? <input type="hidden" name="remote" value="1" /> : null}
        {query.worldwide ? <input type="hidden" name="worldwide" value="1" /> : null}
        {query.operations ? <input type="hidden" name="ops" value="1" /> : null}
        {query.descriptions ? <input type="hidden" name="desc" value="1" /> : null}
        <label className="flex h-11 flex-1 items-center gap-3 px-3">
          <SearchIcon className="size-4.5 shrink-0 text-muted-foreground" />
          <input
            id="role-search"
            name="q"
            defaultValue={query.q ?? ""}
            placeholder="Role, skill or company"
            aria-label="Search by role, skill or company"
            className="h-full w-full min-w-0 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground/80"
          />
          <kbd className="hidden h-6 shrink-0 items-center rounded-md border bg-muted px-1.5 font-sans text-xs text-muted-foreground md:inline-flex">
            /
          </kbd>
        </label>
        <span aria-hidden className="mx-1 hidden h-6 w-px bg-border sm:block" />
        <label className="flex h-11 items-center gap-3 border-t px-3 sm:w-60 sm:border-t-0">
          <MapPinIcon className="size-4.5 shrink-0 text-muted-foreground" />
          <input
            name="location"
            defaultValue={locationGroup?.label ?? query.location ?? ""}
            placeholder="City"
            aria-label="City"
            className="h-full w-full min-w-0 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground/80"
          />
        </label>
        <button
          type="submit"
          className="h-11 shrink-0 rounded-xl bg-signal px-6 text-sm font-medium text-signal-foreground transition-[filter] hover:brightness-110 focus-visible:ring-3 focus-visible:ring-signal/30 focus-visible:outline-none"
        >
          Search
        </button>
      </form>

      <div className="-mx-6 flex items-center gap-2 overflow-x-auto px-6 pb-1 scrollbar-none sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        <FilterMenu
          label="Role"
          value={query.category ? ROLE_CATEGORY_LABELS[query.category] : null}
          resetHref={href({ category: null })}
          resetLabel="Any role"
          options={ROLE_CATEGORIES.filter(
            (category) => (categoryCounts[category] ?? 0) > 0 || category === query.category,
          ).map((category) => ({
            label: ROLE_CATEGORY_LABELS[category],
            href: href({ category }),
            active: query.category === category,
            count: categoryCounts[category] ?? 0,
          }))}
        />
        <FilterMenu
          label="City"
          value={locationGroup?.label ?? query.location}
          resetHref={href({ location: null })}
          resetLabel="Anywhere in scope"
          options={LOCATION_GROUPS.map((group) => ({
            label: group.label,
            href: href({ location: group.id }),
            active: activeLocation === group.id,
          }))}
        />
        <FilterMenu
          label="Seniority"
          value={query.seniority ? SENIORITY_LABELS[query.seniority] : null}
          resetHref={href({ seniority: null })}
          resetLabel="Any level"
          options={CANONICAL_SENIORITIES.map((level) => ({
            label: SENIORITY_LABELS[level],
            href: href({ seniority: level }),
            active: query.seniority === level,
          }))}
        />
        <FilterMenu
          label="Posted"
          value={query.postedWithinDays ? (POSTED_LABELS[query.postedWithinDays] ?? null) : null}
          resetHref={href({ posted: null })}
          resetLabel="Any time"
          options={[1, 7, 30].map((days) => ({
            label: POSTED_LABELS[days] ?? "",
            href: href({ posted: days }),
            active: query.postedWithinDays === days,
          }))}
        />
        <FilterMenu
          label="Source"
          value={query.source ? sourceLabel(query.source) : null}
          resetHref={href({ source: null })}
          resetLabel="Any careers site"
          options={BOARD_SOURCES.map((source) => ({
            label: sourceLabel(source),
            href: href({ source }),
            active: query.source === source,
          }))}
        />
        <span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-border" />
        {toggles.map((toggle) => (
          <Link
            key={toggle.label}
            href={toggle.href}
            aria-pressed={toggle.active}
            className={cn(chipClass, toggle.active && activeChipClass)}
          >
            <span
              className={cn(
                "flex size-4 items-center justify-center rounded-full border transition-colors",
                toggle.active ? "border-signal bg-signal text-signal-foreground" : "border-foreground/25",
              )}
            >
              {toggle.active ? <CheckIcon className="size-3" strokeWidth={3} /> : null}
            </span>
            {toggle.label}
          </Link>
        ))}
        {filtered ? (
          <Link
            href={boardHref({ company: query.company })}
            className="inline-flex h-9 shrink-0 items-center gap-1 rounded-full px-3 text-sm text-muted-foreground hover:text-foreground"
          >
            <XIcon className="size-3.5" />
            Clear
          </Link>
        ) : null}
      </div>

      {!filtered && !query.company && browse.length > 0 ? (
        <div className="-mx-6 flex items-center gap-1 overflow-x-auto px-6 text-sm whitespace-nowrap scrollbar-none sm:mx-0 sm:flex-wrap sm:gap-y-2 sm:px-0">
          <span className="mr-2 shrink-0 text-muted-foreground">Browse</span>
          {browse.map((category) => (
            <Link
              key={category}
              href={href({ category })}
              className="group inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 transition-colors hover:bg-signal/10"
            >
              <span className="text-foreground/85 group-hover:text-foreground">{ROLE_CATEGORY_LABELS[category]}</span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {(categoryCounts[category] ?? 0).toLocaleString("en-IN")}
              </span>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
