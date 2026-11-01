import type { Metadata } from "next";

import { SuggestCompanyForm } from "@/features/suggestions/components";
import { SiteHeader } from "@/shared/components/site-header";

export const metadata: Metadata = {
  title: "Suggest a company",
  description: "Tell us about an Indian startup or India office that should be on JobRadar.",
};

export default function SuggestPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="max-w-xl font-serif text-4xl tracking-tight text-balance">Suggest a company</h1>
        <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
          Know a startup or India office we are missing? Send its website or careers page. We add companies whose roles
          are published on a public careers system, after checking them by hand.
        </p>
        <SuggestCompanyForm />
      </main>
    </>
  );
}
