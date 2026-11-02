"use client";

import { CheckIcon, ChevronDownIcon } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { cn } from "@/shared/lib/utils";

import { activeChipClass, chipClass } from "../lib/chip";
import { BoardLink } from "./board-navigation";

export type FilterOption = {
  label: string;
  href: string;
  active: boolean;
  count?: number;
};

// A filter chip that opens a menu of links. Picking one applies it at once; the first item clears it.
export function FilterMenu({
  label,
  value,
  options,
  resetHref,
  resetLabel,
}: {
  label: string;
  // The picked option's label, or null when the filter is off.
  value: string | null;
  options: FilterOption[];
  resetHref: string;
  resetLabel: string;
}) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(chipClass, "data-[state=open]:border-signal/50", value && activeChipClass)}
        >
          <span className={cn(value && "text-muted-foreground")}>{label}</span>
          {value ? <span className="max-w-44 truncate font-medium">{value}</span> : null}
          <ChevronDownIcon className="size-3.5 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <BoardLink href={resetHref}>
            <CheckIcon className={cn("text-signal", value ? "opacity-0" : "opacity-100")} />
            <span className="flex-1">{resetLabel}</span>
          </BoardLink>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {options.map((option) => (
          <DropdownMenuItem key={option.href} asChild>
            <BoardLink href={option.href} aria-current={option.active ? "true" : undefined}>
              <CheckIcon className={cn("text-signal", option.active ? "opacity-100" : "opacity-0")} />
              <span className={cn("flex-1", option.active && "font-medium")}>{option.label}</span>
              {option.count !== undefined ? (
                <span className="text-xs text-muted-foreground tabular-nums">{option.count.toLocaleString("en-IN")}</span>
              ) : null}
            </BoardLink>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
