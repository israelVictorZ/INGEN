CREATE TABLE "live_status" (
	"player_id" integer PRIMARY KEY NOT NULL,
	"channel" text NOT NULL,
	"is_live" boolean DEFAULT false NOT NULL,
	"title" text,
	"game" text,
	"viewers" integer,
	"started_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rank_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer NOT NULL,
	"queue" text NOT NULL,
	"tier" text NOT NULL,
	"division" text NOT NULL,
	"lp" integer NOT NULL,
	"wins" integer NOT NULL,
	"losses" integer NOT NULL,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "match_participants" ADD COLUMN "team_id" integer;--> statement-breakpoint
ALTER TABLE "match_participants" ADD COLUMN "champ_level" integer;--> statement-breakpoint
ALTER TABLE "match_participants" ADD COLUMN "items" text;--> statement-breakpoint
ALTER TABLE "match_participants" ADD COLUMN "spell1" integer;--> statement-breakpoint
ALTER TABLE "match_participants" ADD COLUMN "spell2" integer;--> statement-breakpoint
ALTER TABLE "match_participants" ADD COLUMN "keystone" integer;--> statement-breakpoint
ALTER TABLE "match_participants" ADD COLUMN "sub_style" integer;--> statement-breakpoint
ALTER TABLE "match_participants" ADD COLUMN "wards_placed" integer;--> statement-breakpoint
ALTER TABLE "match_participants" ADD COLUMN "wards_killed" integer;--> statement-breakpoint
ALTER TABLE "match_participants" ADD COLUMN "control_wards" integer;--> statement-breakpoint
ALTER TABLE "match_participants" ADD COLUMN "solo_kills" integer;--> statement-breakpoint
ALTER TABLE "match_participants" ADD COLUMN "cs_at_10" real;--> statement-breakpoint
ALTER TABLE "match_participants" ADD COLUMN "damage_taken" integer;--> statement-breakpoint
ALTER TABLE "match_participants" ADD COLUMN "turret_plates" integer;--> statement-breakpoint
ALTER TABLE "match_participants" ADD COLUMN "first_blood" boolean;--> statement-breakpoint
ALTER TABLE "match_participants" ADD COLUMN "largest_multi_kill" integer;--> statement-breakpoint
ALTER TABLE "match_participants" ADD COLUMN "opponent_champion_id" integer;--> statement-breakpoint
ALTER TABLE "match_participants" ADD COLUMN "detailed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "live_status" ADD CONSTRAINT "live_status_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rank_history" ADD CONSTRAINT "rank_history_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "rank_history_player_idx" ON "rank_history" USING btree ("player_id","queue","captured_at");