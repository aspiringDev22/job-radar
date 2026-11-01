import { readFile } from "node:fs/promises";
import path from "node:path";

import { and, eq, sql } from "drizzle-orm";

import { companies } from "../../companies/schema.ts";
import { jobs } from "../../jobs/schema.ts";
import { closeDb, getDb } from "../../../shared/db/client.ts";
import { uniqueSlug } from "../../../shared/lib/slug.ts";

import { companiesFileSchema } from "../lib/company-file.ts";

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
  const keys = rows.map((row) => `${row.atsType}:${row.atsSlug}`);
  const keyList = sql.join(
    keys.map((key) => sql`${key}`),
    sql`, `,
  );
  const retiring = await db
    .select({ name: companies.name, id: companies.id })
    .from(companies)
    .where(sql`(${companies.atsType} || ':' || ${companies.atsSlug}) not in (${keyList}) and ${companies.active} = true`);

  if (process.argv.includes("--dry-run")) {
    const openRoles = retiring.length
      ? await db
          .select({ id: jobs.id, slug: jobs.slug, title: jobs.title })
          .from(jobs)
          .where(
            and(
              eq(jobs.isActive, true),
              sql`${jobs.companyId} in (${sql.join(
                retiring.map((company) => sql`${company.id}`),
                sql`, `,
              )})`,
            ),
          )
      : [];
    console.log(`[dry-run] would deactivate ${retiring.length} companies and close ${openRoles.length} open roles`);
    for (const company of retiring) {
      console.log(`  deactivate ${company.name}`);
    }
    for (const role of openRoles.slice(0, 50)) {
      console.log(`  close ${role.slug} — ${role.title}`);
    }
    if (openRoles.length > 50) {
      console.log(`  … ${openRoles.length - 50} more`);
    }
    return;
  }

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

  await db
    .update(companies)
    .set({ active: false })
    .where(sql`(${companies.atsType} || ':' || ${companies.atsSlug}) not in (${keyList})`);

  const closedAt = new Date();
  await db
    .update(jobs)
    .set({ isActive: false, status: "closed", closedAt })
    .where(
      and(
        eq(jobs.isActive, true),
        sql`${jobs.companyId} in (select ${companies.id} from ${companies} where ${companies.active} = false)`,
      ),
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
