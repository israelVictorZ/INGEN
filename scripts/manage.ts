/**
 * Gerenciamento do elenco e redes pela linha de comando (usado pelas skills do Claude).
 *
 *   npx tsx scripts/manage.ts list
 *   npx tsx scripts/manage.ts player:add --riot "Nome#TAG" --team black|silver [--role TOP|JUNGLE|MID|ADC|SUPPORT] [--name "Exibição"] [--slug slug] [--replace]
 *   npx tsx scripts/manage.ts player:remove --slug slug [--no-open-slot]
 *   npx tsx scripts/manage.ts twitch:set --slug slug --url https://www.twitch.tv/canal
 *   npx tsx scripts/manage.ts twitch:remove --slug slug
 *
 * Remover NÃO apaga o jogador: fecha a participação (left_at) e, por padrão, abre a vaga da lane.
 */
import "dotenv/config";
import { and, eq, isNull } from "drizzle-orm";
import { db, schema } from "../src/db";
import { ROLES, type Role } from "../src/db/schema";

const [cmd, ...rest] = process.argv.slice(2);
const args: Record<string, string | true> = {};
for (let i = 0; i < rest.length; i++) {
  if (!rest[i].startsWith("--")) continue;
  const k = rest[i].slice(2);
  const v = rest[i + 1];
  if (v && !v.startsWith("--")) {
    args[k] = v;
    i++;
  } else args[k] = true;
}
const str = (k: string) => (typeof args[k] === "string" ? (args[k] as string) : undefined);
const fail = (msg: string): never => {
  console.error(`✖ ${msg}`);
  process.exit(1);
};
const today = () => new Date().toISOString().slice(0, 10);
const POS: Record<string, Role> = { TOP: "TOP", JUNGLE: "JUNGLE", MIDDLE: "MID", BOTTOM: "ADC", UTILITY: "SUPPORT" };

async function riot<T>(host: string, path: string): Promise<T | null> {
  const key = process.env.RIOT_API_KEY ?? fail("RIOT_API_KEY ausente no .env");
  const res = await fetch(`https://${host}.api.riotgames.com${path}`, { headers: { "X-Riot-Token": key } });
  if (res.status === 404) return null;
  if (res.status === 401 || res.status === 403) fail("Chave da Riot recusada (a Development Key expira a cada 24h).");
  if (!res.ok) fail(`Riot ${res.status}: ${await res.text()}`);
  return (await res.json()) as T;
}

const slugify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

async function teamBySlug(slug: string) {
  const [t] = await db.select().from(schema.teams).where(eq(schema.teams.slug, slug));
  return t ?? fail(`Time "${slug}" não existe (use black ou silver).`);
}

async function playerBySlug(slug: string) {
  const [p] = await db.select().from(schema.players).where(eq(schema.players.slug, slug));
  return p ?? fail(`Jogador "${slug}" não encontrado. Rode "list" para ver os slugs.`);
}

async function list() {
  const teams = await db.select().from(schema.teams);
  const players = await db.select().from(schema.players);
  const ms = await db.select().from(schema.teamMemberships).where(isNull(schema.teamMemberships.leftAt));
  const slots = await db.select().from(schema.openSlots).where(eq(schema.openSlots.active, true));
  const socials = await db.select().from(schema.socialLinks);
  for (const t of teams.sort((a, b) => a.sortOrder - b.sortOrder)) {
    console.log(`\n${t.name} (${t.slug})`);
    for (const r of ROLES) {
      const m = ms.find((x) => x.teamId === t.id && x.role === r);
      const p = m && players.find((x) => x.id === m.playerId);
      const tw = p && socials.find((s) => s.playerId === p.id && s.platform === "twitch");
      const open = slots.some((s) => s.teamId === t.id && s.role === r);
      console.log(`  ${r.padEnd(7)} ${p ? `${p.displayName} [${p.slug}] ${p.gameName}#${p.tagLine}${tw ? `  twitch: ${tw.url}` : ""}` : open ? "— vaga aberta —" : "— vazio —"}`);
    }
  }
  const out = players.filter((p) => !ms.some((m) => m.playerId === p.id));
  if (out.length) console.log(`\nEx-jogadores: ${out.map((p) => `${p.displayName} [${p.slug}]`).join(", ")}`);
}

async function playerAdd() {
  const riotId = str("riot") ?? fail('Informe --riot "Nome#TAG"');
  const [gameName, tagLine] = riotId.split("#");
  if (!gameName || !tagLine) fail('Riot ID inválido. Formato: "Nome#TAG"');
  const team = await teamBySlug(str("team") ?? fail("Informe --team black|silver"));

  const acc = await riot<{ puuid: string; gameName: string; tagLine: string }>(
    process.env.RIOT_REGION ?? "americas",
    `/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`,
  );
  if (!acc) fail(`Conta "${riotId}" não encontrada na Riot (confira nome e tag).`);
  console.log(`✔ Conta encontrada: ${acc!.gameName}#${acc!.tagLine}`);

  // Lane: informada ou inferida das últimas 20 Solo/Duo
  let role = str("role")?.toUpperCase() as Role | undefined;
  if (role && !ROLES.includes(role)) fail(`Lane inválida: ${role}. Use ${ROLES.join(", ")}`);
  if (!role) {
    const ids = (await riot<string[]>(process.env.RIOT_REGION ?? "americas", `/lol/match/v5/matches/by-puuid/${acc!.puuid}/ids?queue=420&count=10`)) ?? [];
    const count: Record<string, number> = {};
    for (const id of ids) {
      const m = await riot<{ info: { participants: { puuid: string; teamPosition: string }[] } }>(process.env.RIOT_REGION ?? "americas", `/lol/match/v5/matches/${id}`);
      const pos = m?.info.participants.find((x) => x.puuid === acc!.puuid)?.teamPosition;
      if (pos && POS[pos]) count[POS[pos]] = (count[POS[pos]] ?? 0) + 1;
    }
    const best = Object.entries(count).sort((a, b) => b[1] - a[1])[0];
    if (!best) fail("Não deu para inferir a lane (sem Solo/Duo recentes). Informe --role.");
    role = best![0] as Role;
    console.log(`ℹ Lane inferida das últimas ${ids.length} Solo/Duo: ${role} (${best![1]} jogos)`);
  }

  // Quem já ocupa a vaga?
  const occupant = (await db.select().from(schema.teamMemberships).where(and(eq(schema.teamMemberships.teamId, team.id), eq(schema.teamMemberships.role, role!), isNull(schema.teamMemberships.leftAt))))[0];
  if (occupant && !args.replace) {
    const [op] = await db.select().from(schema.players).where(eq(schema.players.id, occupant.playerId));
    fail(`A lane ${role} da ${team.name} já tem ${op.displayName} [${op.slug}]. Use --replace para substituir.`);
  }

  const displayName = str("name") ?? acc!.gameName.split(" ").at(-1)!;
  const slug = str("slug") ?? slugify(displayName);
  const [byPuuid] = await db.select().from(schema.players).where(eq(schema.players.puuid, acc!.puuid));
  const [bySlug] = await db.select().from(schema.players).where(eq(schema.players.slug, slug));
  if (bySlug && bySlug.puuid && bySlug.puuid !== acc!.puuid) fail(`O slug "${slug}" já é de outro jogador. Use --slug.`);

  const values = { slug, displayName, gameName: acc!.gameName, tagLine: acc!.tagLine, puuid: acc!.puuid };
  const existing = byPuuid ?? bySlug;
  const player = existing
    ? (await db.update(schema.players).set(values).where(eq(schema.players.id, existing.id)).returning())[0]
    : (await db.insert(schema.players).values(values).returning())[0];

  if (occupant) {
    await db.update(schema.teamMemberships).set({ leftAt: today() }).where(eq(schema.teamMemberships.id, occupant.id));
    console.log("↺ Ocupante anterior saiu da lane (continua no banco como ex-jogador).");
  }
  // se o jogador já estava em outro time/lane, fecha a participação anterior
  await db.update(schema.teamMemberships).set({ leftAt: today() }).where(and(eq(schema.teamMemberships.playerId, player.id), isNull(schema.teamMemberships.leftAt)));
  await db.insert(schema.teamMemberships).values({ playerId: player.id, teamId: team.id, role: role! });
  await db.update(schema.openSlots).set({ active: false }).where(and(eq(schema.openSlots.teamId, team.id), eq(schema.openSlots.role, role!)));

  console.log(`✔ ${displayName} [${slug}] entrou na ${team.name} como ${role}.`);
  console.log(`  Próximo passo: SYNC_MATCH_COUNT=50 npm run sync (puxa elo, maestria e partidas).`);
}

async function playerRemove() {
  const p = await playerBySlug(str("slug") ?? fail("Informe --slug"));
  const active = await db.select().from(schema.teamMemberships).where(and(eq(schema.teamMemberships.playerId, p.id), isNull(schema.teamMemberships.leftAt)));
  if (!active.length) fail(`${p.displayName} já não está em nenhum time.`);
  for (const m of active) {
    await db.update(schema.teamMemberships).set({ leftAt: today() }).where(eq(schema.teamMemberships.id, m.id));
    if (!args["no-open-slot"]) {
      const [slot] = await db.select().from(schema.openSlots).where(and(eq(schema.openSlots.teamId, m.teamId), eq(schema.openSlots.role, m.role)));
      if (slot) await db.update(schema.openSlots).set({ active: true }).where(eq(schema.openSlots.id, slot.id));
      else await db.insert(schema.openSlots).values({ teamId: m.teamId, role: m.role });
    }
    console.log(`✔ ${p.displayName} saiu da lane ${m.role}${args["no-open-slot"] ? "" : " (vaga aberta)"}.`);
  }
  await db.delete(schema.liveStatus).where(eq(schema.liveStatus.playerId, p.id));
}

const channelOf = (url: string) => url.replace(/\/+$/, "").split("/").pop()!.toLowerCase();

async function twitchSet() {
  const p = await playerBySlug(str("slug") ?? fail("Informe --slug"));
  const url = str("url") ?? fail("Informe --url https://www.twitch.tv/canal");
  const channel = channelOf(url);
  if (!/^[a-z0-9_]{3,25}$/.test(channel)) fail(`Canal inválido: "${channel}"`);
  const id = process.env.TWITCH_CLIENT_ID;
  const secret = process.env.TWITCH_CLIENT_SECRET;
  if (id && secret) {
    const tok = (await (await fetch(`https://id.twitch.tv/oauth2/token?client_id=${id}&client_secret=${secret}&grant_type=client_credentials`, { method: "POST" })).json()) as { access_token: string };
    const users = ((await (await fetch(`https://api.twitch.tv/helix/users?login=${channel}`, { headers: { "Client-Id": id, Authorization: `Bearer ${tok.access_token}` } })).json()) as { data?: { display_name: string }[] }).data ?? [];
    if (!users.length) fail(`O canal "${channel}" não existe na Twitch.`);
    console.log(`✔ Canal encontrado: ${users[0].display_name}`);
  }
  await db.delete(schema.socialLinks).where(and(eq(schema.socialLinks.playerId, p.id), eq(schema.socialLinks.platform, "twitch")));
  await db.insert(schema.socialLinks).values({ playerId: p.id, platform: "twitch", url: `https://www.twitch.tv/${channel}` });
  await db.delete(schema.liveStatus).where(eq(schema.liveStatus.playerId, p.id));
  console.log(`✔ Twitch de ${p.displayName}: https://www.twitch.tv/${channel}`);
}

async function twitchRemove() {
  const p = await playerBySlug(str("slug") ?? fail("Informe --slug"));
  await db.delete(schema.socialLinks).where(and(eq(schema.socialLinks.playerId, p.id), eq(schema.socialLinks.platform, "twitch")));
  await db.delete(schema.liveStatus).where(eq(schema.liveStatus.playerId, p.id));
  console.log(`✔ Twitch removida de ${p.displayName}.`);
}

const commands: Record<string, () => Promise<void>> = {
  list,
  "player:add": playerAdd,
  "player:remove": playerRemove,
  "twitch:set": twitchSet,
  "twitch:remove": twitchRemove,
};

(commands[cmd] ?? (async () => fail(`Comando desconhecido: ${cmd ?? "(nenhum)"}. Use: ${Object.keys(commands).join(", ")}`)))()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
