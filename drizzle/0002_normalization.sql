CREATE TYPE "public"."canonical_seniority" AS ENUM('intern', 'junior', 'mid', 'senior', 'staff_plus', 'manager', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."role_family" AS ENUM('backend', 'frontend', 'fullstack', 'mobile', 'data', 'ml', 'devops', 'qa', 'product', 'design', 'other');--> statement-breakpoint
CREATE TYPE "public"."work_mode" AS ENUM('onsite', 'hybrid', 'remote', 'unknown');--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "canonical_seniority" "canonical_seniority" DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "role_family" "role_family" DEFAULT 'other' NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "city" text;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "region" text;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "country" text;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "work_mode" "work_mode" DEFAULT 'unknown' NOT NULL;
