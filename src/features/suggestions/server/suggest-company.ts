"use server";

import { count, eq, gte, sql } from "drizzle-orm";

import { companies } from "@/features/companies/schema";
import { getDb } from "@/shared/db/client";

import { cleanNote, parseSuggestionUrl, suggestionHost } from "../lib/suggestion";
import { companySuggestions } from "../schema";
import type { SuggestState } from "../types";

// A public form, so a global cap keeps a script from filling the table. Repeat
// suggestions of one site only bump its count.
const HOURLY_LIMIT = 60;

function hostOf(website: string): string | null {
  try {
    return suggestionHost(new URL(website).hostname);
  } catch {
    return null;
  }
}

export async function suggestCompany(_previous: SuggestState, formData: FormData): Promise<SuggestState> {
  // Hidden from people. A bot that fills every field gets a thank-you and nothing is stored.
  if (String(formData.get("company_fax") ?? "").trim()) {
    return { status: "ok", message: "Thanks. We'll take a look." };
  }

  const parsed = parseSuggestionUrl(String(formData.get("url") ?? ""));
  if (!parsed.ok) {
    return { status: "error", message: parsed.error };
  }
  const note = cleanNote(String(formData.get("note") ?? ""));
  const db = getDb();

  const listed = await db
    .select({ name: companies.name, website: companies.website })
    .from(companies)
    .where(eq(companies.active, true));
  const match = listed.find((company) => company.website && hostOf(company.website) === parsed.host);
  if (match) {
    return { status: "ok", message: `${match.name} is already on the board.` };
  }

  const [recent] = await db
    .select({ total: count() })
    .from(companySuggestions)
    .where(gte(companySuggestions.lastSuggestedAt, new Date(Date.now() - 60 * 60 * 1000)));
  if ((recent?.total ?? 0) >= HOURLY_LIMIT) {
    return { status: "error", message: "We're getting a lot of suggestions right now. Please try again in an hour." };
  }

  await db
    .insert(companySuggestions)
    .values({ url: parsed.url, host: parsed.host, note })
    .onConflictDoUpdate({
      target: companySuggestions.host,
      set: {
        timesSuggested: sql`${companySuggestions.timesSuggested} + 1`,
        lastSuggestedAt: new Date(),
        note: sql`coalesce(${companySuggestions.note}, excluded.note)`,
      },
    });
  return {
    status: "ok",
    message: `Thanks. We'll check ${parsed.host} for a public careers feed and add it if we find one.`,
  };
}
