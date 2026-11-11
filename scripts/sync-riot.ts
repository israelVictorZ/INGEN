/**
 * Sincroniza dados da Riot API para o banco (conta, elo, maestria, partidas).
 * Roda localmente com a chave do .env  ->  npm run sync
 *
 * A chave NUNCA vai para o site publicado: o site só lê do banco.
 * Rate limit (dev key): 20 req/s e 100 req/2min, por isso há espaçamento entre chamadas.
 */
import "dotenv/config";
import { eq, sql } from "drizzle-orm";
import { db, schema } from "../src/db";

const KEY = process.env.RIOT_API_KEY;
const PLATFORM = process.env.RIOT_PLATFORM ?? "br1";
const REGION = process.env.RIOT_REGION ?? "americas";
const MATCH_COUNT = Number(process.env.SYNC_MATCH_COUNT ?? 50);
const SOLO_QUEUE = 420; // só Solo/Duo para estatísticas (Flex é ignorada)
const GAP_MS = 1250; // ~96 req / 2min

if (!KEY) throw new Error("RIOT_API_KEY não configurada no .env");

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let calls = 0;

async function riot<T>(url: string): Promise<T | null> {
  for (let attempt = 0; attempt < 5; attempt++) {
    await sleep(GAP_MS);
    calls++;
    let res: Response;
    try {
      res = await fetch(url, { headers: { "X-Riot-Token": KEY! } });
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
    if (!res.ok) throw new Error(`${res.status} ${url}\n${await res.text()}`);
    return (await res.json()) as T;
  }
  throw new Error(`Falhou após retries: ${url}`);
}

type Account = { puuid: string; gameName: string; tagLine: string };
type Summoner = { profileIconId: number; summonerLevel: number };
type LeagueEntry = { queueType: string; tier: string; rank: string; leaguePoints: number; wins: number; losses: number };
type Mastery = { championId: number; championLevel: number; championPoints: number };
type MatchDto = {
  metadata: { matchId: string };
  info: {
    queueId: number;
    gameStartTimestamp: number;
    gameDuration: number;
    gameVersion: string;
    participants: Array<{
      puuid: string; teamId: number; championId: number; championName: string; teamPosition: string; win: boolean;
      kills: number; deaths: number; assists: number; totalMinionsKilled: number; neutralMinionsKilled: number;
      visionScore: number; totalDamageDealtToChampions: number; goldEarned: number;
    }>;
  };
};

const today = () => new Date().toISOString().slice(0, 10);

async function main() {
  const players = await db.select().from(schema.players);
  const matchCache = new Map<string, MatchDto | null>();
  const t0 = Date.now();

  for (const p of players) {
    console.log(`\n▶ ${p.gameName}#${p.tagLine}`);
    const acc = await riot<Account>(
      `https://${REGION}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(p.gameName)}/${encodeURIComponent(p.tagLine)}`,
    );
    if (!acc) {
      console.warn("  conta não encontrada, pulando");
      continue;
    }
    const summ = await riot<Summoner>(`https://${PLATFORM}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${acc.puuid}`);
    await db
      .update(schema.players)
      .set({
        puuid: acc.puuid,
        gameName: acc.gameName,
        tagLine: acc.tagLine,
        profileIconId: summ?.profileIconId ?? null,
        summonerLevel: summ?.summonerLevel ?? null,
        syncedAt: new Date(),
      })
      .where(eq(schema.players.id, p.id));

    // Elo: snapshot do dia (upsert)
    const entries = (await riot<LeagueEntry[]>(`https://${PLATFORM}.api.riotgames.com/lol/league/v4/entries/by-puuid/${acc.puuid}`)) ?? [];
    for (const e of entries.filter((e) => e.queueType === "RANKED_SOLO_5x5" || e.queueType === "RANKED_FLEX_SR")) {
      const v = { playerId: p.id, queue: e.queueType, tier: e.tier, division: e.rank, lp: e.leaguePoints, wins: e.wins, losses: e.losses, capturedOn: today(), updatedAt: new Date() };
      await db
        .insert(schema.rankSnapshots)
        .values(v)
        .onConflictDoUpdate({
          target: [schema.rankSnapshots.playerId, schema.rankSnapshots.queue, schema.rankSnapshots.capturedOn],
          set: { tier: v.tier, division: v.division, lp: v.lp, wins: v.wins, losses: v.losses, updatedAt: v.updatedAt },
        });
    }
    console.log(`  elo: ${entries.map((e) => `${e.queueType.replace("RANKED_", "")} ${e.tier} ${e.rank} ${e.leaguePoints}LP`).join(" | ") || "sem ranqueada"}`);

    // Maestria (top 10)
    const mastery = (await riot<Mastery[]>(`https://${PLATFORM}.api.riotgames.com/lol/champion-mastery/v4/champion-masteries/by-puuid/${acc.puuid}/top?count=10`)) ?? [];
    await db.delete(schema.championMastery).where(eq(schema.championMastery.playerId, p.id));
    if (mastery.length) {
      await db.insert(schema.championMastery).values(
        mastery.map((m) => ({ playerId: p.id, championId: m.championId, level: m.championLevel, points: m.championPoints })),
      );
    }

    // Partidas Solo/Duo recentes
    const ids = (await riot<string[]>(`https://${REGION}.api.riotgames.com/lol/match/v5/matches/by-puuid/${acc.puuid}/ids?queue=${SOLO_QUEUE}&count=${MATCH_COUNT}`)) ?? [];
    const known = new Set(
      (await db.select({ id: schema.matchParticipants.matchId }).from(schema.matchParticipants).where(eq(schema.matchParticipants.playerId, p.id))).map((r) => r.id),
    );
    let added = 0;
    for (const id of ids) {
      if (known.has(id)) continue;
      if (!matchCache.has(id)) matchCache.set(id, await riot<MatchDto>(`https://${REGION}.api.riotgames.com/lol/match/v5/matches/${id}`));
      const m = matchCache.get(id);
      if (!m) continue;
      const me = m.info.participants.find((x) => x.puuid === acc.puuid);
      if (!me) continue;
      const team = m.info.participants.filter((x) => x.teamId === me.teamId);
      const teamKills = team.reduce((s, x) => s + x.kills, 0);
      const teamDmg = team.reduce((s, x) => s + x.totalDamageDealtToChampions, 0);
      await db
        .insert(schema.matches)
        .values({ matchId: id, queueId: m.info.queueId, gameStart: m.info.gameStartTimestamp, durationSec: m.info.gameDuration, gameVersion: m.info.gameVersion })
        .onConflictDoNothing();
      await db
        .insert(schema.matchParticipants)
        .values({
          matchId: id,
          playerId: p.id,
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
        })
        .onConflictDoNothing();
      added++;
    }
    console.log(`  partidas: ${ids.length} encontradas, ${added} novas`);
  }

  // Versão do Data Dragon (ícones/splashes)
  const versions = (await (await fetch("https://ddragon.leagueoflegends.com/api/versions.json")).json()) as string[];
  await db
    .insert(schema.appMeta)
    .values({ key: "ddragon_version", value: versions[0] })
    .onConflictDoUpdate({ target: schema.appMeta.key, set: { value: versions[0] } });
  await db
    .insert(schema.appMeta)
    .values({ key: "last_sync", value: new Date().toISOString() })
    .onConflictDoUpdate({ target: schema.appMeta.key, set: { value: sql`excluded.value` } });

  console.log(`\n✔ Sync concluído: ${calls} chamadas à Riot em ${Math.round((Date.now() - t0) / 1000)}s`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
