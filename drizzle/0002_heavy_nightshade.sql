CREATE TABLE "team_reserves" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer NOT NULL,
	"team_id" integer NOT NULL,
	"role" text,
	"joined_at" date DEFAULT now() NOT NULL,
	"left_at" date
);
--> statement-breakpoint
ALTER TABLE "team_reserves" ADD CONSTRAINT "team_reserves_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_reserves" ADD CONSTRAINT "team_reserves_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "reserve_team_idx" ON "team_reserves" USING btree ("team_id");