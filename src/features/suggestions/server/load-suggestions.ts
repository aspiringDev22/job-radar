import { connection } from "next/server";
import { desc, sql } from "drizzle-orm";

import { getDb } from "@/shared/db/client";

import { companySuggestions } from "../schema";

export type SuggestionRow = typeof companySuggestions.$inferSelect;

// New ones first, then the most often suggested.
export async function loadSuggestions(): Promise<SuggestionRow[]> {
  await connection();
  return getDb()
    .select()
    .from(companySuggestions)
    .orderBy(
      sql`${companySuggestions.status} = 'new' desc`,
      desc(companySuggestions.timesSuggested),
      desc(companySuggestions.lastSuggestedAt),
    )
    .limit(500);
}
