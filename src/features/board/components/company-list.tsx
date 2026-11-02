"use client";

import { SearchIcon } from "lucide-react";
import { useState } from "react";

import { cn } from "@/shared/lib/utils";

import { boardHref } from "../lib/href";
import type { BoardQuery } from "../lib/query";
import type { CompanySummary } from "../types";
import { BoardLink } from "./board-navigation";

const rowClass = "flex items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 text-sm transition-colors";

export function CompanyList({
  companies,
  query,
}: {
  companies: CompanySummary[];
  query: BoardQuery;
}) {
  const [filter, setFilter] = useState("");
  const needle = filter.trim().toLowerCase();
  const shown = needle ? companies.filter((company) => company.name.toLowerCase().includes(needle)) : companies;
  const base = { ...query, posted: query.postedWithinDays, job: null, page: null };

  return (
    <nav aria-label="Companies" className="flex flex-col gap-0.5">
      <label className="mb-2 flex h-9 items-center gap-2 rounded-lg border bg-card px-2.5 focus-within:border-signal/40">
        <SearchIcon className="size-3.5 shrink-0 text-muted-foreground" />
        <input
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder={`Filter ${companies.length} companies`}
          aria-label="Filter companies"
          className="h-full w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground/80"
        />
      </label>
      <BoardLink
        href={boardHref({ ...base, company: null })}
        className={cn(rowClass, query.company ? "text-muted-foreground hover:bg-muted/70" : "bg-signal/10 font-medium")}
      >
        All companies
      </BoardLink>
      {shown.map((company) => {
        const active = company.slug === query.company;
        return (
          <BoardLink
            key={company.slug}
            href={boardHref({ ...base, company: company.slug })}
            aria-current={active ? "true" : undefined}
            className={cn(rowClass, active ? "bg-signal/10 font-medium" : "hover:bg-muted/70")}
          >
            <span className="truncate">{company.name}</span>
            <span
              className={cn(
                "shrink-0 text-xs tabular-nums",
                active ? "text-signal" : "text-muted-foreground",
                company.openRoles === 0 && "opacity-50",
              )}
            >
              {company.openRoles.toLocaleString("en-IN")}
            </span>
          </BoardLink>
        );
      })}
      {shown.length === 0 ? <p className="px-2.5 py-2 text-sm text-muted-foreground">No company matches.</p> : null}
    </nav>
  );
}
