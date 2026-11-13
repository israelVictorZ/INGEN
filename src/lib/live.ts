import { cacheLife } from "next/cache";
import { db, schema } from "@/db";
import { TEAM_TWITCH_CHANNEL } from "./features";
// Canais vigiados: gravado por `npm run manage -- twitch:set|twitch:remove` e publicado no deploy.
// Assim o selo "Ao vivo" (consultado a cada minuto) não acorda o banco.
import twitchChannels from "./twitch-channels.json";

export type LiveInfo = {
  channel: string;
  isLive: boolean;
  title: string | null;
  viewers: number | null;
  game: string | null;
  /** miniatura da transmissão (só quando ao vivo e com a API da Twitch) */
  thumbnail: string | null;
  startedAt: string | null;
};
export type LiveMap = Record<string, LiveInfo>; // chave: slug do jogador
/** Resposta de /api/live: canal oficial do time + canais dos jogadores. */
export type LivePayload = { team: LiveInfo; players: LiveMap };

const offline = (channel: string): LiveInfo => ({ channel, isLive: false, title: null, viewers: null, game: null, thumbnail: null, startedAt: null });

type HelixStream = { user_login: string; title: string; viewer_count: number; game_name: string; thumbnail_url: string; started_at: string };
const fromHelix = (channel: string, s: HelixStream): LiveInfo => ({
  channel,
  isLive: true,
  title: s.title,
  viewers: s.viewer_count,
  game: s.game_name,
  thumbnail: s.thumbnail_url.replace("{width}", "640").replace("{height}", "360"),
  startedAt: s.started_at,
});

async function getTwitchToken(id: string, secret: string) {
  "use cache";
  cacheLife("days");
  const res = await fetch(`https://id.twitch.tv/oauth2/token?client_id=${id}&client_secret=${secret}&grant_type=client_credentials`, {
    method: "POST",
  });
  return ((await res.json()) as { access_token: string }).access_token;
}

/**
 * Status ao vivo do canal oficial (twitch.tv/ingen_team) e de todos os jogadores com Twitch cadastrada.
 * Com TWITCH_CLIENT_ID/SECRET na Vercel consulta a Twitch (cache de 60s);
 * sem eles, usa o que o sync gravou no banco (só jogadores, atualizado a cada 30 min).
 */
export async function getLive(): Promise<LivePayload> {
  "use cache";
  cacheLife({ stale: 30, revalidate: 60, expire: 600 });

  const links = twitchChannels;

  const out: LivePayload = { team: offline(TEAM_TWITCH_CHANNEL), players: {} };
  for (const l of links) out.players[l.slug] = offline(l.channel);

  const id = process.env.TWITCH_CLIENT_ID;
  const secret = process.env.TWITCH_CLIENT_SECRET;
  try {
    if (id && secret) {
      const token = await getTwitchToken(id, secret);
      const logins = [TEAM_TWITCH_CHANNEL, ...links.map((l) => l.channel)];
      const qs = [...new Set(logins)].map((c) => `user_login=${c}`).join("&");
      const res = await fetch(`https://api.twitch.tv/helix/streams?${qs}`, { headers: { "Client-Id": id, Authorization: `Bearer ${token}` } });
      const data = ((await res.json()) as { data?: HelixStream[] }).data ?? [];
      const find = (c: string) => data.find((d) => d.user_login.toLowerCase() === c);
      const team = find(TEAM_TWITCH_CHANNEL);
      if (team) out.team = fromHelix(TEAM_TWITCH_CHANNEL, team);
      for (const l of links) {
        const s = find(l.channel);
        if (s) out.players[l.slug] = fromHelix(l.channel, s);
      }
      return out;
    }
  } catch {
    /* cai para o banco */
  }
  if (!links.length) return out;
  const rows = await db.select().from(schema.liveStatus);
  for (const l of links) {
    const r = rows.find((x) => x.playerId === l.playerId);
    if (r)
      out.players[l.slug] = {
        ...offline(r.channel),
        isLive: r.isLive,
        title: r.title,
        viewers: r.viewers,
        game: r.game,
        startedAt: r.startedAt?.toISOString() ?? null,
      };
  }
  return out;
}
