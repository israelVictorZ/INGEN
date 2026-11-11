import { cacheLife, cacheTag } from "next/cache";
import { desc, isNull } from "drizzle-orm";
import { db, schema } from "@/db";
import type { Role, NewsCategory } from "@/db/schema";
import { getChampionMap, getRuneMap, getRuneNames, getSpellMap, type ChampionInfo } from "./ddragon";
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
  // detalhes (podem faltar em partidas antigas)
  items: number[];
  spell1: number | null;
  spell2: number | null;
  keystone: number | null;
  subStyle: number | null;
  champLevel: number | null;
  kp: number | null;
  damage: number;
  gold: number;
  visionScore: number;
  largestMultiKill: number | null;
  opponent: { key: string; name: string } | null;
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
  // métricas extras (média por partida, só partidas com detalhes)
  damagePerMin: number;
  damageTaken: number | null;
  csAt10: number | null;
  soloKills: number | null;
  wardsPlaced: number | null;
  wardsKilled: number | null;
  controlWards: number | null;
  turretPlates: number | null;
  firstBloodRate: number | null;
};

export type WinSplit = { games: number; wins: number };
/** Fotografia de desempenho de um conjunto de partidas (para comparar recortes). */
export type PerfSnap = {
  games: number;
  winrate: number;
  kda: number;
  kills: number;
  deaths: number;
  assists: number;
  csPerMin: number;
  damagePerMin: number;
  goldPerMin: number;
  visionPerMin: number;
  kp: number;
};
export type Insights = {
  avgDurationSec: number;
  /** lado do mapa: azul (100) e vermelho (200) */
  sides: { blue: WinSplit; red: WinSplit };
  /** winrate por duração: até 25 min, 25 a 35, mais de 35 */
  duration: { short: WinSplit; mid: WinSplit; long: WinSplit };
  /** médias nas vitórias × nas derrotas */
  winLoss: { win: PerfSnap | null; loss: PerfSnap | null };
  /** últimas 10 × as anteriores (dentro da janela) */
  trend: { recent: PerfSnap; previous: PerfSnap } | null;
  /** partidas por dia da semana (0 = domingo) e período (madrugada, manhã, tarde, noite), horário de Brasília */
  schedule: number[][];
  gamesLast7d: number;
  keystones: { id: number; games: number; wins: number }[];
  /** campeões diferentes jogados e quantos têm 3+ partidas */
  uniqueChamps: number;
  comfortChamps: number;
  /** % das partidas com o campeão mais jogado */
  oneTrickShare: number;
  /** % das partidas na lane principal */
  mainRoleShare: number;
  firstBloodWinrate: number | null;
};

export type RankPoint = { t: number; score: number; tier: string; division: string; lp: number };

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
  /** histórico de elo Solo/Duo (cada mudança registrada pelo sync) */
  rankHistory: RankPoint[];
  /** variação de PDL (em pontos de score) nas últimas 24h; null sem histórico suficiente */
  lpToday: number | null;
  /** últimas 10 partidas, mais recente primeiro */
  form: boolean[];
  /** sequência atual: +3 = 3 vitórias seguidas, -2 = 2 derrotas */
  streak: number;
  duos: { slug: string; name: string; games: number; wins: number }[];
  matchups: { key: string; name: string; games: number; wins: number }[];
  records: {
    mostKills: RecentMatch | null;
    bestKda: RecentMatch | null;
    mostDamage: RecentMatch | null;
    mostCs: RecentMatch | null;
    multiKills: Record<number, number>;
  };
  insights: Insights | null;
  live: { channel: string; isLive: boolean; title: string | null; viewers: number | null } | null;
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
  spells: Record<number, string>;
  runes: Record<number, string>;
  runeNames: Record<number, string>;
  lastSync: string | null;
  teams: Team[];
  players: Player[];
  news: NewsItem[];
};

const SOLO_QUEUE = 420;
/** Estatísticas usam as últimas N partidas Solo/Duo de cada jogador. */
export const STATS_WINDOW = 50;
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

const kdaOf = (r: { kills: number; deaths: number; assists: number }) => (r.deaths === 0 ? r.kills + r.assists : (r.kills + r.assists) / r.deaths);

type DetailRow = {
  match: { durationSec: number };
  damageTaken: number | null; csAt10: number | null; soloKills: number | null; wardsPlaced: number | null;
  wardsKilled: number | null; controlWards: number | null; turretPlates: number | null; firstBlood: boolean | null;
};
/** Médias das métricas que só existem em partidas com detalhes. */
function detailStats(rows: DetailRow[]) {
  const a = (f: (r: DetailRow) => number | null) => {
    const xs = rows.map(f).filter((v): v is number => v != null);
    return xs.length ? avg(xs) : null;
  };
  return {
    damageTaken: a((r) => r.damageTaken),
    csAt10: a((r) => r.csAt10),
    soloKills: a((r) => r.soloKills),
    wardsPlaced: a((r) => r.wardsPlaced),
    wardsKilled: a((r) => r.wardsKilled),
    controlWards: a((r) => r.controlWards),
    turretPlates: a((r) => r.turretPlates),
    firstBloodRate: rows.length ? rows.filter((r) => r.firstBlood).length / rows.length : null,
  };
}

type SnapRow = {
  win: boolean; kills: number; deaths: number; assists: number; cs: number; damage: number; gold: number;
  visionScore: number; killParticipation: number | null; match: { durationSec: number };
};
function snap(rows: SnapRow[]): PerfSnap | null {
  if (!rows.length) return null;
  const mins = (x: SnapRow) => x.match.durationSec / 60;
  const k = avg(rows.map((x) => x.kills));
  const d = avg(rows.map((x) => x.deaths));
  const a = avg(rows.map((x) => x.assists));
  return {
    games: rows.length,
    winrate: rows.filter((x) => x.win).length / rows.length,
    kda: d === 0 ? k + a : (k + a) / d,
    kills: k,
    deaths: d,
    assists: a,
    csPerMin: avg(rows.map((x) => x.cs / mins(x))),
    damagePerMin: avg(rows.map((x) => x.damage / mins(x))),
    goldPerMin: avg(rows.map((x) => x.gold / mins(x))),
    visionPerMin: avg(rows.map((x) => x.visionScore / mins(x))),
    kp: avg(rows.map((x) => x.killParticipation ?? 0)),
  };
}
const split = <T extends { win: boolean }>(rows: T[]): WinSplit => ({ games: rows.length, wins: rows.filter((x) => x.win).length });
const BRT_OFFSET = 3 * 3_600_000;

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
  // revalida a cada 5 min (o sync roda a cada 30 min no GitHub Actions)
  cacheLife({ stale: 60, revalidate: 300, expire: 86_400 });
  cacheTag("site");

  const [teams, players, memberships, slots, socials, ranks, mastery, matches, parts, news, meta, history, lives] = await Promise.all([
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
    db.select().from(schema.rankHistory).orderBy(schema.rankHistory.capturedAt),
    db.select().from(schema.liveStatus),
  ]);

  const version = meta.find((m) => m.key === "ddragon_version")?.value ?? "16.22.1";
  const lastSync = meta.find((m) => m.key === "last_sync")?.value ?? null;
  const [champs, spells, runes, runeNames] = await Promise.all([getChampionMap(version), getSpellMap(version), getRuneMap(version), getRuneNames(version)]);
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
      // ignora remakes (partidas encerradas antes de 5 min não contam para nada)
      .filter((x) => x.playerId === p.id && matchById.get(x.matchId)?.queueId === SOLO_QUEUE && matchById.get(x.matchId)!.durationSec >= 300)
      .map((x) => ({ ...x, match: matchById.get(x.matchId)! }))
      .sort((a, b) => b.match.gameStart - a.match.gameStart)
      .slice(0, STATS_WINDOW);

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
        damagePerMin: avg(myParts.map((x) => x.damage / mins(x))),
        ...detailStats(myParts.filter((x) => x.detailed)),
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

    const toRecent = (x: (typeof myParts)[number]): RecentMatch => ({
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
      items: x.items ? (JSON.parse(x.items) as number[]) : [],
      spell1: x.spell1,
      spell2: x.spell2,
      keystone: x.keystone,
      subStyle: x.subStyle,
      champLevel: x.champLevel,
      kp: x.killParticipation,
      damage: x.damage,
      gold: x.gold,
      visionScore: x.visionScore,
      largestMultiKill: x.largestMultiKill,
      opponent: x.opponentChampionId ? { key: champ(x.opponentChampionId).id, name: champ(x.opponentChampionId).name } : null,
    });
    const recent = myParts.map(toRecent);

    // Sequência atual
    let streak = 0;
    for (const r of recent) {
      if (streak === 0) streak = r.win ? 1 : -1;
      else if (r.win === streak > 0) streak += streak > 0 ? 1 : -1;
      else break;
    }

    // Histórico de elo Solo/Duo + variação nas últimas 24h
    const rankHistory: RankPoint[] = history
      .filter((h) => h.playerId === p.id && h.queue === "RANKED_SOLO_5x5")
      .map((h) => ({ t: h.capturedAt.getTime(), score: rankScore(h.tier, h.division, h.lp), tier: h.tier, division: h.division, lp: h.lp }))
      // um ponto só quando o ELO muda (partida sem variação de PDL não cria ponto)
      .filter((h, i, arr) => i === 0 || h.score !== arr[i - 1].score);
    const lastPoint = rankHistory.at(-1);
    const dayAgo = (lastPoint?.t ?? 0) - 86_400_000;
    const before = [...rankHistory].reverse().find((h) => h.t <= dayAgo) ?? (rankHistory.length > 1 ? rankHistory[0] : undefined);
    const lpToday = before && lastPoint && before !== lastPoint ? lastPoint.score - before.score : null;

    // Duo: partidas no mesmo time com outro jogador da INGEN
    const duoMap = new Map<number, { games: number; wins: number }>();
    for (const x of myParts) {
      for (const o of parts) {
        if (o.matchId !== x.matchId || o.playerId === p.id || o.teamId == null || o.teamId !== x.teamId) continue;
        const d = duoMap.get(o.playerId) ?? { games: 0, wins: 0 };
        d.games++;
        if (x.win) d.wins++;
        duoMap.set(o.playerId, d);
      }
    }
    const duos = [...duoMap.entries()]
      .map(([pid, d]) => {
        const op = players.find((pp) => pp.id === pid)!;
        return { slug: op.slug, name: op.displayName, ...d };
      })
      .sort((a, b) => b.games - a.games);

    // Confrontos de lane (adversário direto)
    const mu = new Map<number, { games: number; wins: number }>();
    for (const x of myParts) {
      if (!x.opponentChampionId || !x.position || POSITION_TO_ROLE[x.position] !== m.role) continue;
      const v = mu.get(x.opponentChampionId) ?? { games: 0, wins: 0 };
      v.games++;
      if (x.win) v.wins++;
      mu.set(x.opponentChampionId, v);
    }
    const matchups = [...mu.entries()]
      .map(([cid, v]) => ({ key: champ(cid).id, name: champ(cid).name, ...v }))
      .sort((a, b) => b.games - a.games || b.wins - a.wins);

    const multiKills: Record<number, number> = {};
    for (const x of myParts) {
      const mk = x.largestMultiKill ?? 0;
      if (mk >= 2) multiKills[mk] = (multiKills[mk] ?? 0) + 1;
    }

    // Insights: recortes que ajudam a ler o jogador (lado, duração, horário, tendência)
    let insights: Insights | null = null;
    if (myParts.length) {
      const refNow = lastSync ? new Date(lastSync).getTime() : myParts[0].match.gameStart;
      const schedule = Array.from({ length: 7 }, () => [0, 0, 0, 0]);
      for (const x of myParts) {
        const d = new Date(x.match.gameStart - BRT_OFFSET);
        schedule[d.getUTCDay()][Math.floor(d.getUTCHours() / 6)]++;
      }
      const ks = new Map<number, WinSplit>();
      for (const x of myParts.filter((y) => y.keystone)) {
        const v = ks.get(x.keystone!) ?? { games: 0, wins: 0 };
        v.games++;
        if (x.win) v.wins++;
        ks.set(x.keystone!, v);
      }
      const mins = (x: (typeof myParts)[number]) => x.match.durationSec / 60;
      const fb = myParts.filter((x) => x.detailed && x.firstBlood);
      const recent10 = snap(myParts.slice(0, 10));
      const previous = snap(myParts.slice(10));
      insights = {
        avgDurationSec: avg(myParts.map((x) => x.match.durationSec)),
        sides: { blue: split(myParts.filter((x) => x.teamId === 100)), red: split(myParts.filter((x) => x.teamId === 200)) },
        duration: {
          short: split(myParts.filter((x) => mins(x) < 25)),
          mid: split(myParts.filter((x) => mins(x) >= 25 && mins(x) <= 35)),
          long: split(myParts.filter((x) => mins(x) > 35)),
        },
        winLoss: { win: snap(myParts.filter((x) => x.win)), loss: snap(myParts.filter((x) => !x.win)) },
        trend: recent10 && previous && previous.games >= 5 ? { recent: recent10, previous } : null,
        schedule,
        gamesLast7d: myParts.filter((x) => x.match.gameStart >= refNow - 7 * 86_400_000).length,
        keystones: [...ks.entries()].map(([id, v]) => ({ id, ...v })).sort((a, b) => b.games - a.games).slice(0, 4),
        uniqueChamps: champions.filter((c) => c.games > 0).length,
        comfortChamps: champions.filter((c) => c.games >= 3).length,
        oneTrickShare: (champions[0]?.games ?? 0) / myParts.length,
        mainRoleShare: (roleDist[m.role] ?? 0) / myParts.length,
        firstBloodWinrate: fb.length ? fb.filter((x) => x.win).length / fb.length : null,
      };
    }

    const lv = lives.find((l) => l.playerId === p.id);
    const twitchLink = socials.find((so) => so.playerId === p.id && so.platform === "twitch");
    const live = lv ?? (twitchLink ? { channel: twitchLink.url.replace(/\/+$/, "").split("/").pop()!, isLive: false, title: null, viewers: null } : null);

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
      recent: recent.slice(0, 20),
      socials: socials.filter((s) => s.playerId === p.id).map(({ platform, url }) => ({ platform, url })),
      splashKeys: (laneChampions.length ? laneChampions : champions).slice(0, 3).map((c) => c.key),
      syncedAt: p.syncedAt,
      rankHistory,
      lpToday,
      form: recent.slice(0, 10).map((r) => r.win),
      streak,
      duos,
      matchups,
      records: {
        mostKills: [...recent].sort((a, b) => b.kills - a.kills)[0] ?? null,
        bestKda: [...recent].sort((a, b) => kdaOf(b) - kdaOf(a))[0] ?? null,
        mostDamage: [...recent].sort((a, b) => b.damage - a.damage)[0] ?? null,
        mostCs: [...recent].sort((a, b) => b.cs / b.durationSec - a.cs / a.durationSec)[0] ?? null,
        multiKills,
      },
      insights,
      live: live ? { channel: live.channel, isLive: live.isLive, title: live.title, viewers: live.viewers } : null,
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
    spells,
    runes,
    runeNames,
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
