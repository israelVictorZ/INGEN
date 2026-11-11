import { cacheLife, cacheTag } from "next/cache";
import { desc, isNull } from "drizzle-orm";
import { db, schema } from "@/db";
import type { Role, NewsCategory } from "@/db/schema";
import { getChampionMap, type ChampionInfo } from "./ddragon";
import { POSITION_TO_ROLE, ROLE_META, rankScore } from "./format";

export type Rank = {
  tier: string;
  division: string;
  lp: number;
  wins: number;
  losses: number;
  winrate: number;
  score: number;
};

export type ChampStat = {
  championId: number;
  key: string;
  name: string;
  games: number;
  wins: number;
  kda: number;
  kills: number;
  deaths: number;
  assists: number;
  csPerMin: number;
  masteryPoints: number;
};

export type RecentMatch = {
  matchId: string;
  championId: number;
  key: string;
  name: string;
  win: boolean;
  kills: number;
  deaths: number;
  assists: number;
  cs: number;
  durationSec: number;
  gameStart: number;
  queueId: number;
  role: Role | null;
};

export type Stats = {
  games: number;
  wins: number;
  winrate: number;
  kda: number;
  kills: number;
  deaths: number;
  assists: number;
  csPerMin: number;
  visionPerMin: number;
  goldPerMin: number;
  kp: number;
  damageShare: number;
};

export type TeamRef = { slug: string; name: string; shortName: string; accent: string; sortOrder: number };

export type Player = {
  id: number;
  slug: string;
  displayName: string;
  gameName: string;
  tagLine: string;
  profileIconId: number | null;
  level: number | null;
  team: TeamRef;
  role: Role;
  solo: Rank | null;
  flex: Rank | null;
  stats: Stats | null;
  roleDist: Partial<Record<Role, number>>;
  /** todos os campeões (Solo/Duo + maestria) */
  champions: ChampStat[];
  /** só campeões jogados NA LANE do jogador, melhores winrates primeiro */
  laneChampions: ChampStat[];
  recent: RecentMatch[];
  socials: { platform: string; url: string }[];
  splashKeys: string[];
  syncedAt: Date | null;
};

export type Team = TeamRef & {
  tagline: string | null;
  slots: ({ kind: "player"; role: Role; player: Player } | { kind: "open"; role: Role })[];
  players: Player[];
  avgScore: number | null;
  stats: { games: number; winrate: number } | null;
};

export type NewsItem = {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  category: NewsCategory;
  coverUrl: string | null;
  teamSlug: string | null;
  pinned: boolean;
  publishedAt: Date;
};

export type SiteData = {
  version: string;
  lastSync: string | null;
  teams: Team[];
  players: Player[];
  news: NewsItem[];
};

const SOLO_QUEUE = 420;
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

function toRank(r: { tier: string; division: string; lp: number; wins: number; losses: number } | undefined): Rank | null {
  if (!r) return null;
  const games = r.wins + r.losses;
  return { ...r, winrate: games ? r.wins / games : 0, score: rankScore(r.tier, r.division, r.lp) };
}

/**
 * Carrega TODO o conteúdo do site em uma consulta cacheada.
 * O volume é pequeno (dezenas de jogadores/centenas de partidas), então
 * agregamos em memória e todas as páginas derivam daqui.
 */
export async function getSiteData(): Promise<SiteData> {
  "use cache";
  cacheLife("default"); // revalida a cada 15 min
  cacheTag("site");

  const [teams, players, memberships, slots, socials, ranks, mastery, matches, parts, news, meta] = await Promise.all([
    db.select().from(schema.teams),
    db.select().from(schema.players),
    db.select().from(schema.teamMemberships).where(isNull(schema.teamMemberships.leftAt)),
    db.select().from(schema.openSlots),
    db.select().from(schema.socialLinks),
    db.select().from(schema.rankSnapshots).orderBy(desc(schema.rankSnapshots.capturedOn)),
    db.select().from(schema.championMastery),
    db.select().from(schema.matches),
    db.select().from(schema.matchParticipants),
    db.select().from(schema.news).orderBy(desc(schema.news.pinned), desc(schema.news.publishedAt)),
    db.select().from(schema.appMeta),
  ]);

  const version = meta.find((m) => m.key === "ddragon_version")?.value ?? "16.22.1";
  const lastSync = meta.find((m) => m.key === "last_sync")?.value ?? null;
  const champs = await getChampionMap(version);
  const champ = (id: number): ChampionInfo => champs[id] ?? { id: "Aatrox", name: `#${id}` };
  const matchById = new Map(matches.map((m) => [m.matchId, m]));

  const teamRef = (id: number): TeamRef => {
    const t = teams.find((x) => x.id === id)!;
    return { slug: t.slug, name: t.name, shortName: t.shortName, accent: t.accent, sortOrder: t.sortOrder };
  };

  const builtPlayers: Player[] = [];
  for (const m of memberships) {
    const p = players.find((x) => x.id === m.playerId);
    if (!p) continue;
    const latest = (queue: string) => ranks.find((r) => r.playerId === p.id && r.queue === queue);

    const myParts = parts
      // Estatísticas só de Solo/Duo (fila 420); Flex é ignorada
      .filter((x) => x.playerId === p.id && matchById.get(x.matchId)?.queueId === SOLO_QUEUE)
      .map((x) => ({ ...x, match: matchById.get(x.matchId)! }))
      .sort((a, b) => b.match.gameStart - a.match.gameStart);

    let stats: Stats | null = null;
    if (myParts.length) {
      const wins = myParts.filter((x) => x.win).length;
      const k = avg(myParts.map((x) => x.kills));
      const d = avg(myParts.map((x) => x.deaths));
      const a = avg(myParts.map((x) => x.assists));
      const mins = (x: (typeof myParts)[number]) => x.match.durationSec / 60;
      stats = {
        games: myParts.length,
        wins,
        winrate: wins / myParts.length,
        kills: k,
        deaths: d,
        assists: a,
        kda: d === 0 ? k + a : (k + a) / d,
        csPerMin: avg(myParts.map((x) => x.cs / mins(x))),
        visionPerMin: avg(myParts.map((x) => x.visionScore / mins(x))),
        goldPerMin: avg(myParts.map((x) => x.gold / mins(x))),
        kp: avg(myParts.map((x) => x.killParticipation ?? 0)),
        damageShare: avg(myParts.map((x) => x.damageShare ?? 0)),
      };
    }

    const roleDist: Partial<Record<Role, number>> = {};
    for (const x of myParts) {
      const r = x.position ? POSITION_TO_ROLE[x.position] : undefined;
      if (r) roleDist[r] = (roleDist[r] ?? 0) + 1;
    }

    // Pool de campeões: agrega partidas (todas ou só da lane) + maestria
    const aggregate = (list: typeof myParts) => {
      const pool = new Map<number, ChampStat & { _cs: number }>();
      for (const x of list) {
        const c = pool.get(x.championId) ?? {
          championId: x.championId, key: champ(x.championId).id, name: champ(x.championId).name,
          games: 0, wins: 0, kda: 0, kills: 0, deaths: 0, assists: 0, csPerMin: 0, masteryPoints: 0, _cs: 0,
        };
        c.games++;
        if (x.win) c.wins++;
        c.kills += x.kills; c.deaths += x.deaths; c.assists += x.assists;
        c._cs += x.cs / (x.match.durationSec / 60);
        pool.set(x.championId, c);
      }
      for (const mm of mastery.filter((m) => m.playerId === p.id)) {
        const c = pool.get(mm.championId);
        if (c) c.masteryPoints = mm.points;
      }
      return [...pool.values()].map(({ _cs, ...c }) => ({
        ...c,
        kda: c.deaths === 0 ? c.kills + c.assists : (c.kills + c.assists) / c.deaths,
        kills: c.kills / c.games,
        deaths: c.deaths / c.games,
        assists: c.assists / c.games,
        csPerMin: _cs / c.games,
      }));
    };

    const champions: ChampStat[] = aggregate(myParts).sort((a, b) => b.games - a.games || b.wins - a.wins);
    // completa com campeões só de maestria (fora das partidas recentes)
    for (const mm of mastery.filter((m) => m.playerId === p.id).sort((a, b) => b.points - a.points)) {
      if (!champions.some((c) => c.championId === mm.championId))
        champions.push({ championId: mm.championId, key: champ(mm.championId).id, name: champ(mm.championId).name, games: 0, wins: 0, kda: 0, kills: 0, deaths: 0, assists: 0, csPerMin: 0, masteryPoints: mm.points });
    }

    // Campeões da lane: melhor winrate primeiro (com 2+ jogos), depois os de 1 jogo
    const wr = (c: ChampStat) => c.wins / c.games;
    const inLane = aggregate(myParts.filter((x) => x.position && POSITION_TO_ROLE[x.position] === m.role));
    const laneChampions = [
      ...inLane.filter((c) => c.games >= 2).sort((a, b) => wr(b) - wr(a) || b.games - a.games),
      ...inLane.filter((c) => c.games < 2).sort((a, b) => wr(b) - wr(a) || b.kda - a.kda),
    ];

    builtPlayers.push({
      id: p.id,
      slug: p.slug,
      displayName: p.displayName,
      gameName: p.gameName,
      tagLine: p.tagLine,
      profileIconId: p.profileIconId,
      level: p.summonerLevel,
      team: teamRef(m.teamId),
      role: m.role,
      solo: toRank(latest("RANKED_SOLO_5x5")),
      flex: toRank(latest("RANKED_FLEX_SR")),
      stats,
      roleDist,
      champions,
      laneChampions,
      recent: myParts.slice(0, 20).map((x) => ({
        matchId: x.matchId,
        championId: x.championId,
        key: champ(x.championId).id,
        name: champ(x.championId).name,
        win: x.win,
        kills: x.kills,
        deaths: x.deaths,
        assists: x.assists,
        cs: x.cs,
        durationSec: x.match.durationSec,
        gameStart: x.match.gameStart,
        queueId: x.match.queueId,
        role: x.position ? POSITION_TO_ROLE[x.position] ?? null : null,
      })),
      socials: socials.filter((s) => s.playerId === p.id).map(({ platform, url }) => ({ platform, url })),
      splashKeys: (laneChampions.length ? laneChampions : champions).slice(0, 3).map((c) => c.key),
      syncedAt: p.syncedAt,
    });
  }

  const builtTeams: Team[] = teams
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((t) => {
      const tp = builtPlayers.filter((p) => p.team.slug === t.slug);
      const open = slots.filter((s) => s.teamId === t.id && s.active);
      const slotList: Team["slots"] = [
        ...tp.map((p) => ({ kind: "player" as const, role: p.role, player: p })),
        ...open.map((o) => ({ kind: "open" as const, role: o.role })),
      ].sort((a, b) => ROLE_META[a.role].order - ROLE_META[b.role].order);
      const scores = tp.map((p) => p.solo?.score).filter((s): s is number => s != null);
      const games = tp.reduce((s, p) => s + (p.stats?.games ?? 0), 0);
      const wins = tp.reduce((s, p) => s + (p.stats?.wins ?? 0), 0);
      return {
        ...teamRef(t.id),
        tagline: t.tagline,
        slots: slotList,
        players: slotList.flatMap((s) => (s.kind === "player" ? [s.player] : [])),
        avgScore: scores.length ? avg(scores) : null,
        stats: games ? { games, winrate: wins / games } : null,
      };
    });

  // Ordem padrão de jogadores: Black primeiro, depois por lane
  builtPlayers.sort((a, b) => a.team.sortOrder - b.team.sortOrder || ROLE_META[a.role].order - ROLE_META[b.role].order);

  return {
    version,
    lastSync,
    teams: builtTeams,
    players: builtPlayers,
    news: news.map((n) => ({ ...n, category: n.category as NewsCategory })),
  };
}

export async function getPlayer(slug: string) {
  const data = await getSiteData();
  return { data, player: data.players.find((p) => p.slug === slug) ?? null };
}
