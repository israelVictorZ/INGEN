CREATE TABLE "live_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer NOT NULL,
	"channel" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	"title" text,
	"game" text,
	"peak_viewers" integer
);
--> statement-breakpoint
CREATE TABLE "match_players" (
	"match_id" text NOT NULL,
	"participant_id" integer NOT NULL,
	"puuid" text,
	"riot_name" text,
	"team_id" integer NOT NULL,
	"champion_id" integer NOT NULL,
	"champion_name" text NOT NULL,
	"position" text,
	"win" boolean NOT NULL,
	"kills" integer NOT NULL,
	"deaths" integer NOT NULL,
	"assists" integer NOT NULL,
	"cs" integer NOT NULL,
	"gold" integer NOT NULL,
	"damage" integer NOT NULL,
	"damage_taken" integer,
	"vision_score" integer,
	"champ_level" integer,
	"items" text,
	"spell1" integer,
	"spell2" integer,
	"keystone" integer,
	"primary_style" integer,
	"sub_style" integer,
	CONSTRAINT "match_players_match_id_participant_id_pk" PRIMARY KEY("match_id","participant_id")
);
--> statement-breakpoint
CREATE TABLE "match_teams" (
	"match_id" text NOT NULL,
	"team_id" integer NOT NULL,
	"win" boolean NOT NULL,
	"bans" jsonb,
	"objectives" jsonb,
	CONSTRAINT "match_teams_match_id_team_id_pk" PRIMARY KEY("match_id","team_id")
);
--> statement-breakpoint
CREATE TABLE "match_timelines" (
	"match_id" text PRIMARY KEY NOT NULL,
	"frames" jsonb NOT NULL,
	"kills" jsonb NOT NULL,
	"objectives" jsonb NOT NULL,
	"builds" jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "match_participants" ADD COLUMN "lane_gold_xp_adv" real;--> statement-breakpoint
ALTER TABLE "match_participants" ADD COLUMN "early_lane_gold_xp_adv" real;--> statement-breakpoint
ALTER TABLE "match_participants" ADD COLUMN "max_cs_adv" real;--> statement-breakpoint
ALTER TABLE "match_participants" ADD COLUMN "max_level_lead" real;--> statement-breakpoint
ALTER TABLE "match_participants" ADD COLUMN "dragon_takedowns" integer;--> statement-breakpoint
ALTER TABLE "match_participants" ADD COLUMN "baron_takedowns" integer;--> statement-breakpoint
ALTER TABLE "match_participants" ADD COLUMN "herald_takedowns" integer;--> statement-breakpoint
ALTER TABLE "match_participants" ADD COLUMN "voidgrub_takedowns" integer;--> statement-breakpoint
ALTER TABLE "match_participants" ADD COLUMN "turret_takedowns" integer;--> statement-breakpoint
ALTER TABLE "match_participants" ADD COLUMN "challenges" jsonb;--> statement-breakpoint
ALTER TABLE "match_participants" ADD COLUMN "detail_version" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "live_sessions" ADD CONSTRAINT "live_sessions_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_players" ADD CONSTRAINT "match_players_match_id_matches_match_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("match_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_teams" ADD CONSTRAINT "match_teams_match_id_matches_match_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("match_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_timelines" ADD CONSTRAINT "match_timelines_match_id_matches_match_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("match_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "live_session_uq" ON "live_sessions" USING btree ("player_id","started_at");--> statement-breakpoint
CREATE INDEX "match_players_champ_idx" ON "match_players" USING btree ("champion_id");