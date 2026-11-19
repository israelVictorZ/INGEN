CREATE TABLE "draft_tv" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
