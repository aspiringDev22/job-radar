import Link from "next/link";

import { cn } from "@/shared/lib/utils";

import { boardHref } from "../lib/href";
import { pillClass } from "../lib/pill";
import type { BoardQuery } from "../lib/query";
import type { CompanySummary } from "../types";

export function CompanyList({
  companies,
  query,
}: {
  companies: CompanySummary[];
  query: BoardQuery;
}) {
  return (
    <nav aria-label="Companies" className="flex flex-col gap-1">
      <Link
        href={boardHref({ ...query, posted: query.postedWithinDays, company: null, job: null })}
        className={cn(
          "flex items-center justify-between rounded-xl px-3 py-2 text-sm",
          query.company ? "text-muted-foreground hover:bg-muted/60" : "bg-muted",
        )}
      >
        <span>All companies</span>
      </Link>
      {companies.map((company) => {
        const active = company.slug === query.company;
        return (
          <Link
            key={company.slug}
            href={boardHref({
              ...query,
              posted: query.postedWithinDays,
              company: company.slug,
              job: null,
            })}
            className={cn(
              "flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm",
              active ? "bg-muted" : "hover:bg-muted/60",
            )}
          >
            <span className="truncate">{company.name}</span>
            <span
              className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs", pillClass(company.slug))}
            >
              {company.openRoles}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
