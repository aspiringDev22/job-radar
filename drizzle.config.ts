import { defineConfig } from "drizzle-kit";

// drizzle-kit does not read .env itself. CI has no .env and passes the variables directly.
try {
  process.loadEnvFile();
} catch {
  // no .env file
}

// Migrations run on a direct connection. Neon's pooled DATABASE_URL goes through PgBouncer.
const databaseUrl =
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5433/jobradar";

export default defineConfig({
  schema: "./src/features/*/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});
