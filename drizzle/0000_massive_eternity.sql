CREATE TABLE "app_meta" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "champion_mastery" (
	"player_id" integer NOT NULL,
	"champion_id" integer NOT NULL,
	"level" integer NOT NULL,
	"points" integer NOT NULL,
	CONSTRAINT "champion_mastery_player_id_champion_id_pk" PRIMARY KEY("player_id","champion_id")
);
--> statement-breakpoint
CREATE TABLE "match_participants" (
	"id" serial PRIMARY KEY NOT NULL,
	"match_id" text NOT NULL,
	"player_id" integer NOT NULL,
	"champion_id" integer NOT NULL,
	"champion_name" text NOT NULL,
	"position" text,
	"win" boolean NOT NULL,
	"kills" integer NOT NULL,
	"deaths" integer NOT NULL,
	"assists" integer NOT NULL,
	"cs" integer NOT NULL,
	"vision_score" integer NOT NULL,
	"damage" integer NOT NULL,
	"gold" integer NOT NULL,
	"kill_participation" real,
	"damage_share" real
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"match_id" text PRIMARY KEY NOT NULL,
	"queue_id" integer NOT NULL,
	"game_start" bigint NOT NULL,
	"duration_sec" integer NOT NULL,
	"game_version" text
);
--> statement-breakpoint
CREATE TABLE "news" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"excerpt" text NOT NULL,
	"body" text NOT NULL,
	"category" text NOT NULL,
	"cover_url" text,
	"team_slug" text,
	"pinned" boolean DEFAULT false NOT NULL,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "news_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "open_slots" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"role" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"display_name" text NOT NULL,
	"game_name" text NOT NULL,
	"tag_line" text NOT NULL,
	"puuid" text,
	"profile_icon_id" integer,
	"summoner_level" integer,
	"bio" text,
	"photo_url" text,
	"synced_at" timestamp with time zone,
	CONSTRAINT "players_slug_unique" UNIQUE("slug"),
	CONSTRAINT "players_puuid_unique" UNIQUE("puuid")
);
--> statement-breakpoint
CREATE TABLE "rank_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer NOT NULL,
	"queue" text NOT NULL,
	"tier" text NOT NULL,
	"division" text NOT NULL,
	"lp" integer NOT NULL,
	"wins" integer NOT NULL,
	"losses" integer NOT NULL,
	"captured_on" date DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer NOT NULL,
	"platform" text NOT NULL,
	"url" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_memberships" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer NOT NULL,
	"team_id" integer NOT NULL,
	"role" text NOT NULL,
	"joined_at" date DEFAULT now() NOT NULL,
	"left_at" date
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"short_name" text NOT NULL,
	"sort_order" integer NOT NULL,
	"accent" text NOT NULL,
	"tagline" text,
	CONSTRAINT "teams_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "champion_mastery" ADD CONSTRAINT "champion_mastery_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_participants" ADD CONSTRAINT "match_participants_match_id_matches_match_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("match_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_participants" ADD CONSTRAINT "match_participants_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "open_slots" ADD CONSTRAINT "open_slots_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rank_snapshots" ADD CONSTRAINT "rank_snapshots_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_links" ADD CONSTRAINT "social_links_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_memberships" ADD CONSTRAINT "team_memberships_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_memberships" ADD CONSTRAINT "team_memberships_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "participant_uq" ON "match_participants" USING btree ("match_id","player_id");--> statement-breakpoint
CREATE INDEX "participant_player_idx" ON "match_participants" USING btree ("player_id");--> statement-breakpoint
CREATE UNIQUE INDEX "rank_snapshot_uq" ON "rank_snapshots" USING btree ("player_id","queue","captured_on");--> statement-breakpoint
CREATE INDEX "membership_team_idx" ON "team_memberships" USING btree ("team_id");