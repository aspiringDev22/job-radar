CREATE TYPE "public"."suggestion_status" AS ENUM('new', 'added', 'rejected');--> statement-breakpoint
CREATE TABLE "company_suggestions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"url" text NOT NULL,
	"host" text NOT NULL,
	"note" text,
	"status" "suggestion_status" DEFAULT 'new' NOT NULL,
	"times_suggested" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_suggested_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "company_suggestions_host_unique" UNIQUE("host")
);
