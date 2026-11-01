import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// Tables live in each feature's schema.ts and are passed to queries directly,
// so the shared client does not depend on any feature.
function createDb(url: string) {
  const client = postgres(url, { max: 10 });
  return drizzle(client);
}

type Database = ReturnType<typeof createDb>;

const globalForDb = globalThis as typeof globalThis & {
  __jobradarDb?: Database;
};

export function getDb(): Database {
  if (globalForDb.__jobradarDb) {
    return globalForDb.__jobradarDb;
  }

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env and point it at Postgres.",
    );
  }

  const db = createDb(url);
  globalForDb.__jobradarDb = db;
  return db;
}

export async function closeDb(): Promise<void> {
  const db = globalForDb.__jobradarDb;
  if (!db) {
    return;
  }
  await db.$client.end({ timeout: 5 });
  globalForDb.__jobradarDb = undefined;
}
