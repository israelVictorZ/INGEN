CREATE TABLE "draft_rooms" (
	"code" text PRIMARY KEY NOT NULL,
	"state" jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"deadline" bigint,
	"presence" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"logos" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX "draft_rooms_expires_idx" ON "draft_rooms" USING btree ("expires_at");