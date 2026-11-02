import { PlusIcon } from "lucide-react";
import Link from "next/link";

import { cn } from "@/shared/lib/utils";

import { RadarGlyph } from "./radar";
import { ThemeToggle } from "./theme-toggle";

// wide matches the board, which uses the full screen for its list and detail panes.
// The header stays pinned; the board's sticky panes sit below its 4rem height.
export function SiteHeader({ wide = false }: { wide?: boolean }) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/65">
      <div className={cn("mx-auto flex h-16 items-center px-6", wide ? "max-w-[96rem]" : "max-w-6xl")}>
        <Link href="/" className="flex items-center gap-2 font-serif text-xl tracking-tight">
          <RadarGlyph className="text-signal" />
          JobRadar
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/suggest"
            className="inline-flex h-8 items-center gap-1.5 rounded-full border bg-card px-3 text-sm text-muted-foreground transition-colors hover:border-signal/40 hover:text-foreground"
          >
            <PlusIcon className="size-3.5" />
            <span className="hidden sm:inline">Suggest a company</span>
            <span className="sm:hidden">Suggest</span>
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
