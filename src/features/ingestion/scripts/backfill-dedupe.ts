import postgres from "postgres";

import { dedupeKey } from "../lib/dedupe-key.ts";

const sql = postgres(process.env.DATABASE_URL ?? "", { max: 1 });
const rows = await sql<
  Array<{
    id: string;
    company_slug: string;
    title: string;
    city: string | null;
    location_normalized: string | null;
    description_text: string | null;
  }>
>`
  select jobs.id, companies.slug as company_slug, jobs.title, jobs.city, jobs.location_normalized, jobs.description_text
  from jobs
  join companies on companies.id = jobs.company_id
`;

let updated = 0;
for (let index = 0; index < rows.length; index += 200) {
  const batch = rows.slice(index, index + 200);
  await sql.begin(async (tx) => {
    for (const row of batch) {
      await tx`
        update jobs
        set dedupe_key = ${dedupeKey(row.company_slug, row.title, row.city, row.location_normalized, row.description_text)}
        where id = ${row.id}
      `;
    }
  });
  updated += batch.length;
}

const multiCity = await sql<Array<{ groups: number }>>`
  select count(*)::int as groups
  from (
    select dedupe_key
    from jobs
    where is_active and dedupe_key is not null
    group by dedupe_key
    having count(distinct coalesce(city, location_normalized, '')) >= 5
  ) grouped
`;

console.log(`Keyed ${updated} roles. Groups with 5 or more locations: ${multiCity[0]?.groups ?? 0}.`);
await sql.end();
