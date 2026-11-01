import Link from "next/link";

import { SiteHeader } from "@/shared/components/site-header";

export function JobNotFound() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-xl px-6 py-24 text-center">
        <h1 className="font-serif text-4xl tracking-tight">This role is no longer listed</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          It may have been closed on the company career page.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex h-9 items-center rounded-full bg-foreground px-4 text-sm text-background"
        >
          Back to roles
        </Link>
      </main>
    </>
  );
}
