CREATE TYPE "public"."job_status" AS ENUM('open', 'closed');--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "status" "job_status" DEFAULT 'open' NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "closed_at" timestamp with time zone;--> statement-breakpoint
UPDATE "jobs" SET "status" = 'closed', "closed_at" = "last_seen_at" WHERE "is_active" = false;
