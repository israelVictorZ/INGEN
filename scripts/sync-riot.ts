/**
 * Sincroniza Riot API (+ Twitch, se configurada) para o banco.
 *
 *   npm run sync                  -> incremental: elo, maestria, partidas novas, status da Twitch
 *   SYNC_BACKFILL=1 npm run sync  -> também regrava partidas antigas no detalhamento atual
 *                                    (DETAIL_VERSION: placar dos 10, bans/objetivos, timeline, challenges)
 *   SYNC_STATE_FILE=.sync-state.json -> modo sonda: só acessa o banco se algo mudou
 *   SYNC_ONLY=slug1,slug2 npm run sync -> só esses jogadores (ex.: recém-cadastrado); não mexe
 *                                        em Twitch nem no "last_sync", que seguem sendo do sync completo
 *
 * Roda localmente ou no GitHub Actions (.github/workflows/sync.yml).
 * A chave da Riot NUNCA vai para a Vercel: o site só lê do banco.
 */
import "dotenv/config";
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { and, desc, eq, isNull, ne, sql } from "drizzle-orm";
import { db, schema } from "../src/db";

const KEY = process.env.RIOT_API_KEY;
const PLATFORM = process.env.RIOT_PLATFORM ?? "br1";
const REGION = process.env.RIOT_REGION ?? "americas";
const MATCH_COUNT = Number(process.env.SYNC_MATCH_COUNT ?? 20);
const BACKFILL = process.env.SYNC_BACKFILL === "1";
const ONLY = process.env.SYNC_ONLY?.split(",").map((s) => s.trim()).filter(Boolean) ?? [];
const SOLO_QUEUE = 420; // estatísticas só de Solo/Duo

if (!KEY) throw new Error("RIOT_API_KEY não configurada");

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Limitador de janela deslizante por roteamento (br1 / americas): 18 req/s e 95 req/2min. */
const windows = new Map<string, number[]>();
async function throttle(route: string) {
  for (;;) {
    const now = Date.now();
    const w = (windows.get(route) ?? []).filter((t) => now - t < 120_000);
    windows.set(route, w);
    const lastSecond = w.filter((t) => now - t < 1000).length;
    if (w.length < 95 && lastSecond < 18) {
      w.push(now);
      return;
    }
    const wait = w.length >= 95 ? 120_000 - (now - w[0]) + 50 : 1000 - (now - w[w.length - 18]) + 20;
    await sleep(Math.max(wait, 50));
  }
}

/**
 * O PUUID vem criptografado para o app dono da chave da Riot. Se a chave trocar de app
 * (outra conta/projeto), os PUUIDs gravados viram "Exception decrypting" (400).
 */
class PuuidMismatch extends Error {}

let calls = 0;
async function riot<T>(host: string, path: string): Promise<T | null> {
  for (let attempt = 0; attempt < 5; attempt++) {
    await throttle(host);
    calls++;
    let res: Response;
    try {
      res = await fetch(`https://${host}.api.riotgames.com${path}`, { headers: { "X-Riot-Token": KEY! } });
    } catch (e) {
      console.warn(`  rede falhou (${(e as Error).message}), tentando de novo`);
      await sleep(3000 * (attempt + 1));
      continue;
    }
    if (res.status === 429) {
      const wait = Number(res.headers.get("retry-after") ?? 10) * 1000;
      console.warn(`  429, aguardando ${wait / 1000}s`);
      await sleep(wait);
      continue;
    }
    if (res.status === 404) return null;
    if (res.status === 400) {
      const body = await res.text();
      if (body.includes("decrypting")) throw new PuuidMismatch(path);
      throw new Error(`400 ${path}
${body}`);
    }
    if (res.status === 401 || res.status === 403) throw new Error(`Chave da Riot recusada (${res.status}). Confira o segredo RIOT_API_KEY.`);
    if (!res.ok) throw new Error(`${res.status} ${path}\n${await res.text()}`);
    return (await res.json()) as T;
  }
  throw new Error(`Falhou após retries: ${path}`);
}

type Account = { puuid: string; gameName: string; tagLine: string };
type Summoner = { profileIconId: number; summonerLevel: number };
type LeagueEntry = { queueType: string; tier: string; rank: string; leaguePoints: number; wins: number; losses: number };
type Mastery = { championId: number; championLevel: number; championPoints: number };
type Participant = {
  participantId: number; riotIdGameName?: string; riotIdTagline?: string;
  puuid: string; teamId: number; championId: number; championName: string; teamPosition: string; win: boolean;
  kills: number; deaths: number; assists: number; totalMinionsKilled: number; neutralMinionsKilled: number;
  visionScore: number; totalDamageDealtToChampions: number; goldEarned: number; champLevel: number;
  item0: number; item1: number; item2: number; item3: number; item4: number; item5: number; item6: number;
  summoner1Id: number; summoner2Id: number; wardsPlaced: number; wardsKilled: number; visionWardsBoughtInGame: number;
  totalDamageTaken: number; firstBloodKill: boolean; firstBloodAssist: boolean; largestMultiKill: number;
  perks?: { styles: { style: number; selections: { perk: number }[] }[] };
  challenges?: Record<string, number | number[] | undefined>;
};
type TeamDto = {
  teamId: number; win: boolean;
  bans: { championId: number; pickTurn: number }[];
  objectives: Record<string, { first: boolean; kills: number }>;
};
type MatchDto = {
  metadata: { matchId: string };
  info: { queueId: number; gameStartTimestamp: number; gameDuration: number; gameVersion: string; participants: Participant[]; teams?: TeamDto[] };
};
type TimelineEvent = {
  type: string; timestamp: number;
  participantId?: number; itemId?: number; beforeId?: number; skillSlot?: number; levelUpType?: string;
  killerId?: number; victimId?: number; assistingParticipantIds?: number[]; position?: { x: number; y: number };
  killerTeamId?: number; teamId?: number; monsterType?: string; monsterSubType?: string;
  buildingType?: string; towerType?: string; laneType?: string;
};
type TimelineDto = {
  info: {
    frames: {
      timestamp: number;
      participantFrames: Record<string, { totalGold: number; xp: number; level: number; minionsKilled: number; jungleMinionsKilled: number }>;
      events: TimelineEvent[];
    }[];
  };
};

/** Versão do detalhamento gravado em match_participants.detail_version (ver schema). */
const DETAIL_VERSION = 3;
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

const today = () => new Date().toISOString().slice(0, 10);

function participantRow(m: MatchDto, me: Participant, playerId: number) {
  const team = m.info.participants.filter((x) => x.teamId === me.teamId);
  const teamKills = team.reduce((s, x) => s + x.kills, 0);
  const teamDmg = team.reduce((s, x) => s + x.totalDamageDealtToChampions, 0);
  const opp = me.teamPosition
    ? m.info.participants.find((x) => x.teamId !== me.teamId && x.teamPosition === me.teamPosition)
    : undefined;
  const ch = me.challenges ?? {};
  return {
    matchId: m.metadata.matchId,
    playerId,
    championId: me.championId,
    championName: me.championName,
    position: me.teamPosition || null,
    win: me.win,
    kills: me.kills,
    deaths: me.deaths,
    assists: me.assists,
    cs: me.totalMinionsKilled + me.neutralMinionsKilled,
    visionScore: me.visionScore,
    damage: me.totalDamageDealtToChampions,
    gold: me.goldEarned,
    killParticipation: teamKills ? (me.kills + me.assists) / teamKills : null,
    damageShare: teamDmg ? me.totalDamageDealtToChampions / teamDmg : null,
    teamId: me.teamId,
    champLevel: me.champLevel,
    items: JSON.stringify([me.item0, me.item1, me.item2, me.item3, me.item4, me.item5, me.item6]),
    spell1: me.summoner1Id,
    spell2: me.summoner2Id,
    keystone: me.perks?.styles?.[0]?.selections?.[0]?.perk ?? null,
    subStyle: me.perks?.styles?.[1]?.style ?? null,
    wardsPlaced: me.wardsPlaced,
    wardsKilled: me.wardsKilled,
    controlWards: me.visionWardsBoughtInGame,
    soloKills: num(ch.soloKills),
    csAt10: (num(ch.laneMinionsFirst10Minutes) ?? 0) + (num(ch.jungleCsBefore10Minutes) ?? 0) || null,
    damageTaken: me.totalDamageTaken,
    turretPlates: num(ch.turretPlatesTaken),
    firstBlood: me.firstBloodKill || me.firstBloodAssist,
    largestMultiKill: me.largestMultiKill,
    opponentChampionId: opp?.championId ?? null,
    detailed: true,
    laneGoldXpAdv: num(ch.laningPhaseGoldExpAdvantage),
    earlyLaneGoldXpAdv: num(ch.earlyLaningPhaseGoldExpAdvantage),
    maxCsAdv: num(ch.maxCsAdvantageOnLaneOpponent),
    maxLevelLead: num(ch.maxLevelLeadLaneOpponent),
    dragonTakedowns: num(ch.dragonTakedowns),
    baronTakedowns: num(ch.baronTakedowns),
    heraldTakedowns: num(ch.riftHeraldTakedowns),
    voidgrubTakedowns: num(ch.voidMonsterKill),
    turretTakedowns: num(ch.turretTakedowns),
    challenges: me.challenges ?? null,
    detailVersion: DETAIL_VERSION,
  };
}

/** Placar (os 10) + lados (bans e objetivos). Uma vez por partida. */
async function saveMatchBoard(m: MatchDto) {
  const matchId = m.metadata.matchId;
  const rows = m.info.participants.map((x) => ({
    matchId,
    participantId: x.participantId,
    puuid: x.puuid || null,
    riotName: x.riotIdGameName ? `${x.riotIdGameName}#${x.riotIdTagline ?? ""}` : null,
    teamId: x.teamId,
    championId: x.championId,
    championName: x.championName,
    position: x.teamPosition || null,
    win: x.win,
    kills: x.kills,
    deaths: x.deaths,
    assists: x.assists,
    cs: x.totalMinionsKilled + x.neutralMinionsKilled,
    gold: x.goldEarned,
    damage: x.totalDamageDealtToChampions,
    damageTaken: x.totalDamageTaken,
    visionScore: x.visionScore,
    champLevel: x.champLevel,
    items: JSON.stringify([x.item0, x.item1, x.item2, x.item3, x.item4, x.item5, x.item6]),
    spell1: x.summoner1Id,
    spell2: x.summoner2Id,
    keystone: x.perks?.styles?.[0]?.selections?.[0]?.perk ?? null,
    primaryStyle: x.perks?.styles?.[0]?.style ?? null,
    subStyle: x.perks?.styles?.[1]?.style ?? null,
  }));
  if (rows.length) await db.insert(schema.matchPlayers).values(rows).onConflictDoNothing();
  const teams = (m.info.teams ?? []).map((t) => ({
    matchId,
    teamId: t.teamId,
    win: t.win,
    bans: [...t.bans].sort((a, b) => a.pickTurn - b.pickTurn).map((b) => b.championId),
    objectives: t.objectives,
  }));
  if (teams.length) await db.insert(schema.matchTeams).values(teams).onConflictDoNothing();
}

/** Resume a timeline (ouro/XP/CS por minuto-chave, abates com posição, objetivos, ordem de itens e skills). */
function summarizeTimeline(tl: TimelineDto) {
  const frames: Record<string, Record<string, [number, number, number, number]>> = {};
  for (const minute of [5, 10, 15, 20]) {
    const f = tl.info.frames[minute];
    if (!f) continue;
    frames[minute] = Object.fromEntries(
      Object.entries(f.participantFrames).map(([pid, p]) => [pid, [p.totalGold, p.xp, p.minionsKilled + p.jungleMinionsKilled, p.level]]),
    );
  }
  const sec = (ms: number) => Math.round(ms / 1000);
  const kills: { t: number; killer: number; victim: number; assists: number[]; x?: number; y?: number }[] = [];
  const objectives: { t: number; team: number; killer?: number; type: string; sub?: string; lane?: string }[] = [];
  const builds: Record<string, { items: [number, number][]; skills: number[] }> = {};
  const build = (pid: number) => (builds[pid] ??= { items: [], skills: [] });
  for (const e of tl.info.frames.flatMap((f) => f.events)) {
    switch (e.type) {
      case "CHAMPION_KILL":
        kills.push({ t: sec(e.timestamp), killer: e.killerId ?? 0, victim: e.victimId ?? 0, assists: e.assistingParticipantIds ?? [], x: e.position?.x, y: e.position?.y });
        break;
      case "ELITE_MONSTER_KILL":
        objectives.push({ t: sec(e.timestamp), team: e.killerTeamId ?? 0, killer: e.killerId, type: e.monsterType ?? "?", sub: e.monsterSubType });
        break;
      case "BUILDING_KILL":
        // teamId da Riot = dono da estrutura destruída; aqui `team` = quem destruiu
        objectives.push({ t: sec(e.timestamp), team: e.teamId === 100 ? 200 : 100, killer: e.killerId, type: e.buildingType ?? "?", sub: e.towerType, lane: e.laneType });
        break;
      case "ITEM_PURCHASED":
        if (e.participantId && e.itemId) build(e.participantId).items.push([e.itemId, sec(e.timestamp)]);
        break;
      case "ITEM_UNDO": {
        const items = e.participantId ? build(e.participantId).items : [];
        const i = items.findLastIndex(([id]) => id === e.beforeId);
        if (i >= 0) items.splice(i, 1);
        break;
      }
      case "SKILL_LEVEL_UP":
        if (e.participantId && e.skillSlot && e.levelUpType === "NORMAL") build(e.participantId).skills.push(e.skillSlot);
        break;
    }
  }
  return { frames, kills, objectives, builds };
}

/** Mesmo critério do cadastro (scripts/manage.ts): última palavra do nick, ex.: "IGN Atlas" → "Atlas". */
const autoDisplayName = (gameName: string) => gameName.trim().split(" ").at(-1)!;

/**
 * Último recurso quando o PUUID é de outra chave E o Riot ID mudou (trocou de nick):
 * busca uma partida recente já gravada desse jogador com a chave atual e acha o participante
 * pelo campeão + lado do mapa (únicos na partida). O PUUID dele leva à conta com o nick novo.
 */
async function recoverFromMatches(playerId: number): Promise<Account | null> {
  const rows = await db
    .select({ matchId: schema.matchParticipants.matchId, championId: schema.matchParticipants.championId, teamId: schema.matchParticipants.teamId })
    .from(schema.matchParticipants)
    .innerJoin(schema.matches, eq(schema.matches.matchId, schema.matchParticipants.matchId))
    .where(eq(schema.matchParticipants.playerId, playerId))
    .orderBy(desc(schema.matches.gameStart))
    .limit(3);
  for (const r of rows) {
    if (r.teamId == null) continue;
    const m = await riot<MatchDto>(REGION, `/lol/match/v5/matches/${r.matchId}`);
    const me = m?.info.participants.find((x) => x.championId === r.championId && x.teamId === r.teamId);
    if (!me) continue;
    const acc = await riot<Account>(REGION, `/riot/account/v1/accounts/by-puuid/${me.puuid}`);
    if (acc) return acc;
  }
  return null;
}

async function syncRiot() {
  const players = (await db.select().from(schema.players)).filter((p) => !ONLY.length || ONLY.includes(p.slug));
  if (ONLY.length && players.length !== ONLY.length) throw new Error(`SYNC_ONLY: slug não encontrado (${ONLY.filter((s) => !players.some((p) => p.slug === s)).join(", ")})`);
  const matchCache = new Map<string, MatchDto | null>();
  // partidas que já têm placar/lados e timeline gravados (uma vez por partida, não por jogador)
  const boardDone = new Set((await db.select({ id: schema.matchTeams.matchId }).from(schema.matchTeams)).map((r) => r.id));
  const timelineDone = new Set((await db.select({ id: schema.matchTimelines.matchId }).from(schema.matchTimelines)).map((r) => r.id));

  for (const p of players) {
    console.log(`\n▶ ${p.gameName}#${p.tagLine}`);
    // Conta: por PUUID quando já conhecido (acompanha troca de nick), senão por Riot ID.
    // PUUID de outra chave da Riot (ou sumido): recupera pelo Riot ID e grava o PUUID desta chave.
    let acc: Account | null = null;
    if (p.puuid) {
      try {
        acc = await riot<Account>(REGION, `/riot/account/v1/accounts/by-puuid/${p.puuid}`);
      } catch (e) {
        if (!(e instanceof PuuidMismatch)) throw e;
        console.log("  PUUID gravado é de outra chave da Riot: recuperando pelo Riot ID");
      }
    }
    if (!acc) acc = await riot<Account>(REGION, `/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(p.gameName)}/${encodeURIComponent(p.tagLine)}`);
    if (!acc && p.puuid) {
      acc = await recoverFromMatches(p.id);
      if (acc) console.log(`  recuperado por uma partida gravada: agora é ${acc.gameName}#${acc.tagLine}`);
    }
    if (!acc) {
      console.warn("  conta não encontrada (nem por PUUID, Riot ID ou partidas gravadas), pulando");
      continue;
    }
    if (p.puuid && acc.puuid !== p.puuid) console.log("  PUUID atualizado para a chave atual");
    const summ = await riot<Summoner>(PLATFORM, `/lol/summoner/v4/summoners/by-puuid/${acc.puuid}`);
    // Trocou de nick: o nome de exibição acompanha, a menos que tenha sido definido à mão (--name)
    const renamed = acc.gameName !== p.gameName;
    const displayName = renamed && p.displayName === autoDisplayName(p.gameName) ? autoDisplayName(acc.gameName) : p.displayName;
    if (renamed || acc.tagLine !== p.tagLine)
      console.log(`  Riot ID mudou: ${p.gameName}#${p.tagLine} → ${acc.gameName}#${acc.tagLine} (exibição: ${displayName}; endereço segue /jogador/${p.slug}, troque com player:rename se quiser)`);
    await db
      .update(schema.players)
      .set({ puuid: acc.puuid, gameName: acc.gameName, tagLine: acc.tagLine, displayName, profileIconId: summ?.profileIconId ?? null, summonerLevel: summ?.summonerLevel ?? null, syncedAt: new Date() })
      .where(eq(schema.players.id, p.id));

    // Elo: snapshot do dia + histórico quando muda
    const entries = ((await riot<LeagueEntry[]>(PLATFORM, `/lol/league/v4/entries/by-puuid/${acc.puuid}`)) ?? []).filter(
      (e) => e.queueType === "RANKED_SOLO_5x5" || e.queueType === "RANKED_FLEX_SR",
    );
    for (const e of entries) {
      const v = { tier: e.tier, division: e.rank, lp: e.leaguePoints, wins: e.wins, losses: e.losses };
      await db
        .insert(schema.rankSnapshots)
        .values({ playerId: p.id, queue: e.queueType, capturedOn: today(), updatedAt: new Date(), ...v })
        .onConflictDoUpdate({
          target: [schema.rankSnapshots.playerId, schema.rankSnapshots.queue, schema.rankSnapshots.capturedOn],
          set: { ...v, updatedAt: new Date() },
        });
      const [last] = await db
        .select()
        .from(schema.rankHistory)
        .where(and(eq(schema.rankHistory.playerId, p.id), eq(schema.rankHistory.queue, e.queueType)))
        .orderBy(desc(schema.rankHistory.capturedAt))
        .limit(1);
      if (!last || last.wins !== v.wins || last.losses !== v.losses || last.lp !== v.lp || last.tier !== v.tier || last.division !== v.division) {
        await db.insert(schema.rankHistory).values({ playerId: p.id, queue: e.queueType, ...v });
      }
    }
    console.log(`  elo: ${entries.map((e) => `${e.queueType.replace("RANKED_", "")} ${e.tier} ${e.rank} ${e.leaguePoints}LP`).join(" | ") || "sem ranqueada"}`);

    // Maestria (top 10)
    const mastery = (await riot<Mastery[]>(PLATFORM, `/lol/champion-mastery/v4/champion-masteries/by-puuid/${acc.puuid}/top?count=10`)) ?? [];
    if (mastery.length) {
      await db.delete(schema.championMastery).where(eq(schema.championMastery.playerId, p.id));
      await db.insert(schema.championMastery).values(mastery.map((m) => ({ playerId: p.id, championId: m.championId, level: m.championLevel, points: m.championPoints })));
    }

    // Partidas Solo/Duo: novas + (no backfill) antigas gravadas numa versão anterior do detalhamento
    const ids = (await riot<string[]>(REGION, `/lol/match/v5/matches/by-puuid/${acc.puuid}/ids?queue=${SOLO_QUEUE}&count=${MATCH_COUNT}`)) ?? [];
    const stored = await db
      .select({ id: schema.matchParticipants.matchId, v: schema.matchParticipants.detailVersion })
      .from(schema.matchParticipants)
      .where(eq(schema.matchParticipants.playerId, p.id));
    const known = new Set(stored.map((r) => r.id));
    const done = new Set(stored.filter((r) => r.v >= DETAIL_VERSION).map((r) => r.id));
    // sem backfill, só as partidas novas: as antigas são atualizadas com SYNC_BACKFILL=1
    const todo = new Set(ids.filter((id) => !known.has(id)));
    if (BACKFILL) stored.filter((r) => !done.has(r.id)).forEach((r) => todo.add(r.id));

    let added = 0;
    for (const id of todo) {
      if (!matchCache.has(id)) matchCache.set(id, await riot<MatchDto>(REGION, `/lol/match/v5/matches/${id}`));
      const m = matchCache.get(id);
      const me = m?.info.participants.find((x) => x.puuid === acc.puuid);
      if (!m || !me) continue;
      await db
        .insert(schema.matches)
        .values({ matchId: id, queueId: m.info.queueId, gameStart: m.info.gameStartTimestamp, durationSec: m.info.gameDuration, gameVersion: m.info.gameVersion })
        .onConflictDoNothing();
      if (!boardDone.has(id)) {
        await saveMatchBoard(m);
        boardDone.add(id);
      }
      if (!timelineDone.has(id)) {
        timelineDone.add(id); // uma tentativa por rodada, mesmo se a Riot não tiver a timeline
        const tl = await riot<TimelineDto>(REGION, `/lol/match/v5/matches/${id}/timeline`);
        if (tl) await db.insert(schema.matchTimelines).values({ matchId: id, ...summarizeTimeline(tl) }).onConflictDoNothing();
      }
      const row = participantRow(m, me, p.id);
      const update: Partial<typeof row> = { ...row };
      delete update.matchId;
      delete update.playerId;
      await db
        .insert(schema.matchParticipants)
        .values(row)
        .onConflictDoUpdate({ target: [schema.matchParticipants.matchId, schema.matchParticipants.playerId], set: update });
      added++;
    }
    console.log(`  partidas: ${ids.length} recentes, ${added} gravadas/atualizadas`);
  }
}

/** Twitch: status ao vivo dos canais cadastrados em social_links (platform = "twitch"). */
async function syncTwitch() {
  const id = process.env.TWITCH_CLIENT_ID;
  const secret = process.env.TWITCH_CLIENT_SECRET;
  const links = await db.select().from(schema.socialLinks).where(eq(schema.socialLinks.platform, "twitch"));
  if (!id || !secret || links.length === 0) {
    console.log("\nTwitch: não configurada, pulando");
    return;
  }
  const token = (await (
    await fetch(`https://id.twitch.tv/oauth2/token?client_id=${id}&client_secret=${secret}&grant_type=client_credentials`, { method: "POST" })
  ).json()) as { access_token: string };
  const login = (url: string) => url.replace(/\/+$/, "").split("/").pop()!.toLowerCase();
  const logins = links.map((l) => login(l.url));
  const res = await fetch(`https://api.twitch.tv/helix/streams?${logins.map((l) => `user_login=${l}`).join("&")}`, {
    headers: { "Client-Id": id, Authorization: `Bearer ${token.access_token}` },
  });
  const live = ((await res.json()) as { data: { user_login: string; title: string; game_name: string; viewer_count: number; started_at: string }[] }).data ?? [];
  for (const l of links) {
    const s = live.find((x) => x.user_login.toLowerCase() === login(l.url));
    const v = { channel: login(l.url), isLive: !!s, title: s?.title ?? null, game: s?.game_name ?? null, viewers: s?.viewer_count ?? null, startedAt: s ? new Date(s.started_at) : null, updatedAt: new Date() };
    await db.insert(schema.liveStatus).values({ playerId: l.playerId, ...v }).onConflictDoUpdate({ target: schema.liveStatus.playerId, set: v });
    // Histórico de lives. O pico de espectadores é o maior visto nas rodadas em que o sync gravou.
    if (s) {
      const sess = { channel: v.channel, title: v.title, game: v.game, peakViewers: s.viewer_count };
      await db
        .insert(schema.liveSessions)
        .values({ playerId: l.playerId, startedAt: new Date(s.started_at), ...sess })
        .onConflictDoUpdate({
          target: [schema.liveSessions.playerId, schema.liveSessions.startedAt],
          set: { title: sess.title, game: sess.game, endedAt: null, peakViewers: sql`greatest(${schema.liveSessions.peakViewers}, ${s.viewer_count})` },
        });
    }
    // encerra a sessão aberta (de outra transmissão, se voltou ao vivo, ou porque saiu do ar)
    await db
      .update(schema.liveSessions)
      .set({ endedAt: new Date() })
      .where(
        and(
          eq(schema.liveSessions.playerId, l.playerId),
          isNull(schema.liveSessions.endedAt),
          s ? ne(schema.liveSessions.startedAt, new Date(s.started_at)) : undefined,
        ),
      );
  }
  console.log(`\nTwitch: ${live.length}/${links.length} ao vivo`);
}

/* ------------------------------------------------------------------ */
/* Modo "sonda": checa Riot e Twitch SEM tocar no banco.              */
/* Se nada mudou desde a última sincronização, encerra sem acordar o  */
/* Neon (que desliga sozinho após 5 min parado e tem cota de horas).  */
/* ------------------------------------------------------------------ */
const STATE_FILE = process.env.SYNC_STATE_FILE; // ex.: .sync-state.json (cacheado no GitHub Actions)
const FULL_EVERY_MS = 6 * 3600_000; // sincronização completa forçada a cada 6h (maestria, nível etc.)

type SyncState = { players: { id: number; puuid: string }[]; channels: string[]; fingerprint: string; lastFull: number };

async function twitchLive(channels: string[]): Promise<string[]> {
  const id = process.env.TWITCH_CLIENT_ID;
  const secret = process.env.TWITCH_CLIENT_SECRET;
  if (!id || !secret || !channels.length) return [];
  const token = (await (
    await fetch(`https://id.twitch.tv/oauth2/token?client_id=${id}&client_secret=${secret}&grant_type=client_credentials`, { method: "POST" })
  ).json()) as { access_token: string };
  const res = await fetch(`https://api.twitch.tv/helix/streams?${channels.map((c) => `user_login=${c}`).join("&")}`, {
    headers: { "Client-Id": id, Authorization: `Bearer ${token.access_token}` },
  });
  const data = ((await res.json()) as { data?: { user_login: string }[] }).data ?? [];
  return data.map((d) => d.user_login.toLowerCase()).sort();
}

/** Impressão digital do estado: Riot ID + elo + última partida de cada jogador + quem está ao vivo. */
async function fingerprint(state: Pick<SyncState, "players" | "channels">) {
  const parts: string[] = [];
  for (const p of state.players) {
    // troca de nick não muda elo nem partidas: sem isto a sonda só perceberia na sincronização completa (6h)
    const acc = await riot<Account>(REGION, `/riot/account/v1/accounts/by-puuid/${p.puuid}`).catch((e) => {
      if (e instanceof PuuidMismatch) return undefined; // PUUID de outra chave: marca e segue
      throw e;
    });
    if (acc === undefined) {
      parts.push(`${p.id}|puuid-invalido`);
      continue;
    }
    const entries = (await riot<LeagueEntry[]>(PLATFORM, `/lol/league/v4/entries/by-puuid/${p.puuid}`)) ?? [];
    const elo = entries
      .filter((e) => e.queueType === "RANKED_SOLO_5x5" || e.queueType === "RANKED_FLEX_SR")
      .map((e) => `${e.queueType}:${e.tier}${e.rank}${e.leaguePoints}/${e.wins}-${e.losses}`)
      .sort()
      .join(",");
    const [last] = (await riot<string[]>(REGION, `/lol/match/v5/matches/by-puuid/${p.puuid}/ids?queue=${SOLO_QUEUE}&count=1`)) ?? [];
    parts.push(`${p.id}|${acc ? `${acc.gameName}#${acc.tagLine}` : ""}|${elo}|${last ?? ""}`);
  }
  const live = await twitchLive(state.channels).catch(() => []);
  return `${parts.join(";")}#live:${live.join(",")}`;
}

/**
 * Avisa o site (POST /api/revalidate) que há dado novo no banco, para ele reler na próxima visita.
 * Sem o aviso o site só relê de hora em hora (rede de segurança), então uma falha aqui só atrasa.
 * Precisa de SITE_URL e REVALIDATE_SECRET (o mesmo valor configurado na Vercel).
 */
async function notifySite() {
  const site = process.env.SITE_URL?.replace(/\/+$/, "");
  const secret = process.env.REVALIDATE_SECRET;
  if (!site || !secret) {
    console.log("Site não avisado (SITE_URL/REVALIDATE_SECRET ausentes): ele relê o banco em até 1 h.");
    return;
  }
  try {
    const res = await fetch(`${site}/api/revalidate`, { method: "POST", headers: { Authorization: `Bearer ${secret}` } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    // visita a home para a releitura começar já, e não só quando chegar o próximo visitante
    await fetch(site).catch(() => {});
    console.log("Site avisado: vai reler o banco.");
  } catch (e) {
    console.warn(`::warning::Aviso ao site falhou (${(e as Error).message}); ele relê o banco em até 1 h.`);
  }
}

function setOutput(key: string, value: string) {
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${value}\n`);
}

async function main() {
  const t0 = Date.now();

  if (STATE_FILE && existsSync(STATE_FILE)) {
    const state = JSON.parse(readFileSync(STATE_FILE, "utf-8")) as SyncState;
    if (state.players.length && Date.now() - state.lastFull < FULL_EVERY_MS) {
      // PUUID do estado salvo inválido para a chave atual: segue para o sync completo, que o recupera
      const fp = await fingerprint(state).catch((e) => {
        if (!(e instanceof PuuidMismatch)) throw e;
        console.log("Sonda: PUUID de outra chave da Riot no estado salvo, sincronizando tudo.");
        return null;
      });
      if (fp !== null && fp === state.fingerprint) {
        console.log(`Sem mudanças (sonda: ${calls} chamadas em ${Math.round((Date.now() - t0) / 1000)}s). Banco não foi acessado.`);
        setOutput("full", "false");
        return;
      }
      console.log("Mudança detectada: sincronizando.");
    }
  }

  await syncRiot();
  if (ONLY.length) {
    await notifySite();
    console.log(`
✔ Sync parcial (${ONLY.join(", ")}): ${calls} chamadas à Riot em ${Math.round((Date.now() - t0) / 1000)}s`);
    return;
  }
  await syncTwitch().catch((e) => console.warn("Twitch falhou:", e.message));

  const versions = (await (await fetch("https://ddragon.leagueoflegends.com/api/versions.json")).json()) as string[];
  for (const [key, value] of [["ddragon_version", versions[0]], ["last_sync", new Date().toISOString()]]) {
    await db.insert(schema.appMeta).values({ key, value }).onConflictDoUpdate({ target: schema.appMeta.key, set: { value } });
  }
  await notifySite();

  if (STATE_FILE) {
    const players = (await db.select({ id: schema.players.id, puuid: schema.players.puuid }).from(schema.players)).filter(
      (p): p is { id: number; puuid: string } => !!p.puuid,
    );
    const links = await db.select({ url: schema.socialLinks.url }).from(schema.socialLinks).where(eq(schema.socialLinks.platform, "twitch"));
    const channels = links.map((l) => l.url.replace(/\/+$/, "").split("/").pop()!.toLowerCase());
    const state: SyncState = { players, channels, fingerprint: "", lastFull: Date.now() };
    state.fingerprint = await fingerprint(state);
    writeFileSync(STATE_FILE, JSON.stringify(state));
    setOutput("full", "true");
  }

  console.log(`\n✔ Sync concluído: ${calls} chamadas à Riot em ${Math.round((Date.now() - t0) / 1000)}s`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

