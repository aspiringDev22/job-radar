ALTER TABLE "companies" ADD COLUMN "last_success_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "last_error" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "consecutive_failures" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "last_role_count" integer;--> statement-breakpoint
UPDATE "companies" SET "last_success_at" = "last_synced_at";--> statement-breakpoint
UPDATE "companies" SET "last_role_count" = "latest"."jobs_found"
FROM (
  SELECT DISTINCT ON ("source") "source", "jobs_found"
  FROM "sync_runs"
  WHERE "error" IS NULL AND "finished_at" IS NOT NULL
  ORDER BY "source", "started_at" DESC
) AS "latest"
WHERE "latest"."source" = "companies"."ats_type" || ':' || "companies"."ats_slug";--> statement-breakpoint
UPDATE "companies" SET
  "consecutive_failures" = "failed"."runs",
  "last_error" = "failed"."last_error",
  "last_synced_at" = GREATEST("companies"."last_synced_at", "failed"."last_attempt")
FROM (
  SELECT "run"."source", count(*)::int AS "runs", max("run"."started_at") AS "last_attempt",
    (array_agg("run"."error" ORDER BY "run"."started_at" DESC))[1] AS "last_error"
  FROM "sync_runs" AS "run"
  WHERE "run"."error" IS NOT NULL
    AND "run"."started_at" > COALESCE((
      SELECT max("ok"."started_at") FROM "sync_runs" AS "ok"
      WHERE "ok"."source" = "run"."source" AND "ok"."error" IS NULL AND "ok"."finished_at" IS NOT NULL
    ), '-infinity')
  GROUP BY "run"."source"
) AS "failed"
WHERE "failed"."source" = "companies"."ats_type" || ':' || "companies"."ats_slug";
