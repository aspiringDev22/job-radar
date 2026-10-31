import { readFile } from "node:fs/promises";
import path from "node:path";

import { eq, sql } from "drizzle-orm";

import { closeDb, getDb } from "../src/db/client.ts";
import { companiesFileSchema } from "../src/db/company-seed.ts";
import { companies } from "../src/db/schema/companies.ts";
import { jobs } from "../src/db/schema/jobs.ts";
import { uniqueSlug } from "../src/db/slug.ts";

async function main(): Promise<void> {
  const filePath = path.join(process.cwd(), "data", "companies.json");
  const raw = await readFile(filePath, "utf8");
  const parsed = companiesFileSchema.safeParse(JSON.parse(raw) as unknown);

  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const where = issue.path.join(".") || "file";
      console.error(`${where}: ${issue.message}`);
    }
    process.exitCode = 1;
    return;
  }

  const seenKeys = new Set<string>();
  for (const company of parsed.data) {
    const key = `${company.ats_type}:${company.ats_slug}`;
    if (seenKeys.has(key)) {
      throw new Error(`Duplicate company in data/companies.json: ${key}`);
    }
    seenKeys.add(key);
  }

  if (parsed.data.length === 0) {
    console.log("data/companies.json is empty. Nothing to seed.");
    return;
  }

  const usedSlugs = new Set<string>();
  const rows = parsed.data.map((company) => ({
    name: company.name,
    slug: uniqueSlug(company.name, company.ats_slug, usedSlugs),
    website: company.website ?? null,
    atsType: company.ats_type,
    atsSlug: company.ats_slug,
    active: true,
  }));

  const db = getDb();
  await db
    .insert(companies)
    .values(rows)
    .onConflictDoUpdate({
      target: [companies.atsType, companies.atsSlug],
      set: {
        name: sql`excluded.name`,
        website: sql`excluded.website`,
        active: true,
      },
    });

  const keys = rows.map((row) => `${row.atsType}:${row.atsSlug}`);
  await db
    .update(companies)
    .set({ active: false })
    .where(
      sql`(${companies.atsType} || ':' || ${companies.atsSlug}) not in (${sql.join(
        keys.map((key) => sql`${key}`),
        sql`, `,
      )})`,
    );

  await db
    .update(jobs)
    .set({ isActive: false })
    .where(
      sql`${jobs.companyId} in (select ${companies.id} from ${companies} where ${companies.active} = false)`,
    );

  const active = await db
    .select({ id: companies.id })
    .from(companies)
    .where(eq(companies.active, true));

  console.log(`Seeded ${rows.length} companies. ${active.length} active.`);
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Seed failed";
    console.error(message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDb();
  });
