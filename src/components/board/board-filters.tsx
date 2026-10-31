import Link from "next/link";

import { SENIORITIES } from "@/db/schema/enums";
import {
  LOCATION_GROUPS,
  activeLocationId,
  hasBoardFilters,
  type BoardQuery,
} from "@/lib/filters";
import { boardHref } from "@/lib/format";
import { cn } from "@/lib/utils";

const SENIORITY_LABELS: Record<(typeof SENIORITIES)[number], string> = {
  intern: "Intern",
  junior: "Junior",
  mid: "Mid",
  senior: "Senior",
  staff: "Staff",
  principal: "Principal",
  executive: "Executive",
  unknown: "Not specified",
};

const controlClass =
  "h-9 rounded-full border bg-background px-4 text-sm outline-none focus-visible:border-ring";

export function BoardFilters({ query }: { query: BoardQuery }) {
  const activeLocation = activeLocationId(query.location);
  const formKey = [
    query.q,
    query.location,
    query.remote,
    query.seniority,
    query.source,
    query.postedWithinDays,
    query.company,
  ].join("|");

  return (
    <div className="mt-8">
      <form key={formKey} action="/" className="flex flex-wrap items-center gap-2">
        {query.company ? <input type="hidden" name="company" value={query.company} /> : null}
        {query.remote ? <input type="hidden" name="remote" value="1" /> : null}
        <input
          id="role-search"
          name="q"
          defaultValue={query.q ?? ""}
          placeholder="Title or description"
          aria-label="Search title or description"
          className={cn(controlClass, "w-44")}
        />
        <input
          name="location"
          defaultValue={
            LOCATION_GROUPS.find((group) => group.id === query.location)?.label ??
            query.location ??
            ""
          }
          placeholder="City"
          aria-label="City"
          className={cn(controlClass, "w-36")}
        />
        <select
          name="seniority"
          defaultValue={query.seniority ?? ""}
          aria-label="Seniority"
          className={controlClass}
        >
          <option value="">Any seniority</option>
          {SENIORITIES.map((level) => (
            <option key={level} value={level}>
              {SENIORITY_LABELS[level]}
            </option>
          ))}
        </select>
        <select
          name="source"
          defaultValue={query.source ?? ""}
          aria-label="Source"
          className={controlClass}
        >
          <option value="">Any source</option>
          <option value="greenhouse">Greenhouse</option>
          <option value="lever">Lever</option>
          <option value="ashby">Ashby</option>
          <option value="workable">Workable</option>
          <option value="smartrecruiters">SmartRecruiters</option>
          <option value="recruitee">Recruitee</option>
          <option value="workday">Workday</option>
          <option value="amazon">Amazon</option>
        </select>
        <select
          name="posted"
          defaultValue={query.postedWithinDays ? String(query.postedWithinDays) : ""}
          aria-label="Posted date"
          className={controlClass}
        >
          <option value="">Any time</option>
          <option value="1">Past day</option>
          <option value="7">Past week</option>
          <option value="30">Past month</option>
        </select>
        <button
          type="submit"
          className="h-9 rounded-full bg-foreground px-4 text-sm text-background"
        >
          Show roles
        </button>
        {hasBoardFilters(query) ? (
          <Link
            href={boardHref({ company: query.company })}
            className="px-2 text-sm text-muted-foreground"
          >
            Clear
          </Link>
        ) : null}
      </form>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href={boardHref({
            ...query,
            posted: query.postedWithinDays,
            remote: !query.remote,
            job: null,
          })}
          className={cn(
            "rounded-full border px-3 py-1 text-xs",
            query.remote ? "border-foreground bg-foreground text-background" : "text-muted-foreground",
          )}
        >
          Remote
        </Link>
        {LOCATION_GROUPS.map((group) => {
          const active = activeLocation === group.id;
          return (
            <Link
              key={group.id}
              href={boardHref({
                ...query,
                posted: query.postedWithinDays,
                location: active ? null : group.id,
                job: null,
              })}
              className={cn(
                "rounded-full border px-3 py-1 text-xs",
                active ? "border-foreground bg-foreground text-background" : "text-muted-foreground",
              )}
            >
              {group.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
