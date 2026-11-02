import postgres from "postgres";

import { classifyCategory, classifyFamily, classifyPlace, classifySeniority } from "../lib/normalize.ts";

const sql = postgres(process.env.DATABASE_URL ?? "", { max: 1 });
const rows = await sql<
  Array<{ id: string; title: string; department: string | null; location_normalized: string | null; is_remote: boolean }>
>`
  select id, title, department, location_normalized, is_remote from jobs
`;

let updated = 0;
for (let index = 0; index < rows.length; index += 200) {
  const batch = rows.slice(index, index + 200).map((row) => {
    const place = classifyPlace(row.location_normalized, row.is_remote);
    return [
      row.id,
      classifySeniority(row.title),
      classifyFamily(row.title),
      classifyCategory(row.title, row.department),
      place.city,
      place.region,
      place.country,
      place.workMode,
    ];
  });
  // One statement per batch: a round trip per row is slow against a hosted database.
  await sql`
    update jobs
    set canonical_seniority = v.canonical_seniority::canonical_seniority,
        role_family = v.role_family::role_family,
        category = v.category::role_category,
        city = v.city,
        region = v.region,
        country = v.country,
        work_mode = v.work_mode::work_mode
    from (values ${sql(batch)}) as v (id, canonical_seniority, role_family, category, city, region, country, work_mode)
    where jobs.id = v.id::uuid
  `;
  updated += batch.length;
}

console.log(`Classified ${updated} roles.`);
await sql.end();
