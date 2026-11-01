import postgres from "postgres";

import { classifyFamily, classifyPlace, classifySeniority } from "../lib/normalize.ts";

const sql = postgres(process.env.DATABASE_URL ?? "", { max: 1 });
const rows = await sql<Array<{ id: string; title: string; location_normalized: string | null; is_remote: boolean }>>`
  select id, title, location_normalized, is_remote from jobs
`;

let updated = 0;
for (let index = 0; index < rows.length; index += 200) {
  const batch = rows.slice(index, index + 200);
  await sql.begin(async (tx) => {
    for (const row of batch) {
      const place = classifyPlace(row.location_normalized, row.is_remote);
      await tx`
        update jobs
        set canonical_seniority = ${classifySeniority(row.title)},
            role_family = ${classifyFamily(row.title)},
            city = ${place.city},
            region = ${place.region},
            country = ${place.country},
            work_mode = ${place.workMode}
        where id = ${row.id}
      `;
    }
  });
  updated += batch.length;
}

console.log(`Classified ${updated} roles.`);
await sql.end();
