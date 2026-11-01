CREATE TYPE "public"."sync_trigger" AS ENUM('manual', 'scheduled');--> statement-breakpoint
ALTER TABLE "sync_runs" RENAME TO "company_syncs";--> statement-breakpoint
ALTER TABLE "company_syncs" RENAME CONSTRAINT "sync_runs_pkey" TO "company_syncs_pkey";--> statement-breakpoint
CREATE TABLE "sync_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trigger" "sync_trigger" DEFAULT 'manual' NOT NULL,
	"forced" boolean DEFAULT false NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"companies_ok" integer DEFAULT 0 NOT NULL,
	"companies_failed" integer DEFAULT 0 NOT NULL,
	"companies_skipped" integer DEFAULT 0 NOT NULL,
	"roles_added" integer DEFAULT 0 NOT NULL,
	"roles_reopened" integer DEFAULT 0 NOT NULL,
	"roles_closed" integer DEFAULT 0 NOT NULL,
	"error" text
);--> statement-breakpoint
ALTER TABLE "company_syncs" ADD COLUMN "run_id" uuid;--> statement-breakpoint
ALTER TABLE "company_syncs" ADD COLUMN "company_id" uuid;--> statement-breakpoint
ALTER TABLE "company_syncs" ADD COLUMN "jobs_reopened" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "company_syncs" ADD CONSTRAINT "company_syncs_run_id_sync_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."sync_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_syncs" ADD CONSTRAINT "company_syncs_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "company_syncs_run_id_idx" ON "company_syncs" USING btree ("run_id");--> statement-breakpoint
UPDATE "company_syncs" SET "company_id" = "companies"."id"
FROM "companies"
WHERE "company_syncs"."source" = "companies"."ats_type" || ':' || "companies"."ats_slug";
