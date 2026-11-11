import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  date,
  real,
  bigint,
  uniqueIndex,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";

export const ROLES = ["TOP", "JUNGLE", "MID", "ADC", "SUPPORT"] as const;
export type Role = (typeof ROLES)[number];

/** Times (INGEN Black, INGEN Silver). `sortOrder` define a ordem de exibição: Black = 1. */
export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  shortName: text("short_name").notNull(),
  sortOrder: integer("sort_order").notNull(),
  accent: text("accent").notNull(), // "green" | "silver"
  tagline: text("tagline"),
});

export const players = pgTable("players", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  displayName: text("display_name").notNull(),
  gameName: text("game_name").notNull(),
  tagLine: text("tag_line").notNull(),
  puuid: text("puuid").unique(),
  profileIconId: integer("profile_icon_id"),
  summonerLevel: integer("summoner_level"),
  bio: text("bio"),
  photoUrl: text("photo_url"),
  syncedAt: timestamp("synced_at", { withTimezone: true }),
});

export const teamMemberships = pgTable(
  "team_memberships",
  {
    id: serial("id").primaryKey(),
    playerId: integer("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    teamId: integer("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    role: text("role").$type<Role>().notNull(),
    joinedAt: date("joined_at").notNull().defaultNow(),
    leftAt: date("left_at"),
  },
  (t) => [index("membership_team_idx").on(t.teamId)],
);

/** Vagas abertas ("Recrutando") por time e lane. */
export const openSlots = pgTable("open_slots", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  role: text("role").$type<Role>().notNull(),
  active: boolean("active").notNull().default(true),
});

export const socialLinks = pgTable("social_links", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id")
    .notNull()
    .references(() => players.id, { onDelete: "cascade" }),
  platform: text("platform").notNull(), // twitch | youtube | instagram | x | tiktok | outro
  url: text("url").notNull(),
});

/** Foto do elo. Uma linha por jogador × fila × dia (histórico para gráfico). */
export const rankSnapshots = pgTable(
  "rank_snapshots",
  {
    id: serial("id").primaryKey(),
    playerId: integer("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    queue: text("queue").notNull(), // RANKED_SOLO_5x5 | RANKED_FLEX_SR
    tier: text("tier").notNull(),
    division: text("division").notNull(),
    lp: integer("lp").notNull(),
    wins: integer("wins").notNull(),
    losses: integer("losses").notNull(),
    capturedOn: date("captured_on").notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("rank_snapshot_uq").on(t.playerId, t.queue, t.capturedOn)],
);

/** Histórico de elo: uma linha a cada mudança detectada pelo sync (alimenta o gráfico e o "PDL hoje"). */
export const rankHistory = pgTable(
  "rank_history",
  {
    id: serial("id").primaryKey(),
    playerId: integer("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    queue: text("queue").notNull(),
    tier: text("tier").notNull(),
    division: text("division").notNull(),
    lp: integer("lp").notNull(),
    wins: integer("wins").notNull(),
    losses: integer("losses").notNull(),
    capturedAt: timestamp("captured_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("rank_history_player_idx").on(t.playerId, t.queue, t.capturedAt)],
);

/** Status da Twitch por jogador (atualizado pelo sync e pela rota /api/live). */
export const liveStatus = pgTable("live_status", {
  playerId: integer("player_id")
    .primaryKey()
    .references(() => players.id, { onDelete: "cascade" }),
  channel: text("channel").notNull(),
  isLive: boolean("is_live").notNull().default(false),
  title: text("title"),
  game: text("game"),
  viewers: integer("viewers"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const championMastery = pgTable(
  "champion_mastery",
  {
    playerId: integer("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    championId: integer("champion_id").notNull(),
    level: integer("level").notNull(),
    points: integer("points").notNull(),
  },
  (t) => [primaryKey({ columns: [t.playerId, t.championId] })],
);

export const matches = pgTable("matches", {
  matchId: text("match_id").primaryKey(),
  queueId: integer("queue_id").notNull(),
  gameStart: bigint("game_start", { mode: "number" }).notNull(),
  durationSec: integer("duration_sec").notNull(),
  gameVersion: text("game_version"),
});

export const matchParticipants = pgTable(
  "match_participants",
  {
    id: serial("id").primaryKey(),
    matchId: text("match_id")
      .notNull()
      .references(() => matches.matchId, { onDelete: "cascade" }),
    playerId: integer("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    championId: integer("champion_id").notNull(),
    championName: text("champion_name").notNull(),
    position: text("position"), // TOP | JUNGLE | MIDDLE | BOTTOM | UTILITY
    win: boolean("win").notNull(),
    kills: integer("kills").notNull(),
    deaths: integer("deaths").notNull(),
    assists: integer("assists").notNull(),
    cs: integer("cs").notNull(),
    visionScore: integer("vision_score").notNull(),
    damage: integer("damage").notNull(),
    gold: integer("gold").notNull(),
    killParticipation: real("kill_participation"),
    damageShare: real("damage_share"),
    // detalhes extras (v2)
    teamId: integer("team_id"),
    champLevel: integer("champ_level"),
    items: text("items"), // JSON: [item0..item6]
    spell1: integer("spell1"),
    spell2: integer("spell2"),
    keystone: integer("keystone"),
    subStyle: integer("sub_style"),
    wardsPlaced: integer("wards_placed"),
    wardsKilled: integer("wards_killed"),
    controlWards: integer("control_wards"),
    soloKills: integer("solo_kills"),
    csAt10: real("cs_at_10"),
    damageTaken: integer("damage_taken"),
    turretPlates: integer("turret_plates"),
    firstBlood: boolean("first_blood"),
    largestMultiKill: integer("largest_multi_kill"),
    opponentChampionId: integer("opponent_champion_id"),
    detailed: boolean("detailed").notNull().default(false),
  },
  (t) => [
    uniqueIndex("participant_uq").on(t.matchId, t.playerId),
    index("participant_player_idx").on(t.playerId),
  ],
);

export const NEWS_CATEGORIES = [
  "elenco",
  "campeonato",
  "recrutamento",
  "comunicado",
  "resultado",
] as const;
export type NewsCategory = (typeof NEWS_CATEGORIES)[number];

export const news = pgTable("news", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  excerpt: text("excerpt").notNull(),
  body: text("body").notNull(), // markdown
  category: text("category").$type<NewsCategory>().notNull(),
  coverUrl: text("cover_url"),
  teamSlug: text("team_slug"),
  pinned: boolean("pinned").notNull().default(false),
  publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
});

export const appMeta = pgTable("app_meta", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});
