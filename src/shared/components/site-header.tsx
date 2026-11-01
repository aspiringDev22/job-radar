import Link from "next/link";

import { ThemeToggle } from "./theme-toggle";

export function SiteHeader() {
  return (
    <header className="border-b">
      <div className="mx-auto flex h-16 max-w-6xl items-center px-6">
        <Link href="/" className="font-serif text-xl tracking-tight">
          JobRadar
        </Link>
        <div className="ml-auto flex items-center gap-4">
          <Link href="/suggest" className="text-sm text-muted-foreground hover:text-foreground">
            Suggest a company
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
