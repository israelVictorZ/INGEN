import { cacheLife } from "next/cache";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";

export type LiveInfo = { channel: string; isLive: boolean; title: string | null; viewers: number | null; game: string | null };
export type LiveMap = Record<string, LiveInfo>; // chave: slug do jogador

const channelOf = (url: string) => url.replace(/\/+$/, "").split("/").pop()!.toLowerCase();

async function getTwitchToken(id: string, secret: string) {
  "use cache";
  cacheLife("days");
  const res = await fetch(`https://id.twitch.tv/oauth2/token?client_id=${id}&client_secret=${secret}&grant_type=client_credentials`, {
    method: "POST",
  });
  return ((await res.json()) as { access_token: string }).access_token;
}

/**
 * Status ao vivo de todos os jogadores com Twitch cadastrada.
 * Com TWITCH_CLIENT_ID/SECRET na Vercel consulta a Twitch (cache de 60s);
 * sem eles, usa o que o sync gravou no banco (atualizado a cada 30 min).
 */
export async function getLive(): Promise<LiveMap> {
  "use cache";
  cacheLife({ stale: 30, revalidate: 60, expire: 600 });

  const links = await db
    .select({ slug: schema.players.slug, playerId: schema.players.id, url: schema.socialLinks.url })
    .from(schema.socialLinks)
    .innerJoin(schema.players, eq(schema.players.id, schema.socialLinks.playerId))
    .where(eq(schema.socialLinks.platform, "twitch"));
  if (!links.length) return {};

  const out: LiveMap = {};
  for (const l of links) out[l.slug] = { channel: channelOf(l.url), isLive: false, title: null, viewers: null, game: null };

  const id = process.env.TWITCH_CLIENT_ID;
  const secret = process.env.TWITCH_CLIENT_SECRET;
  try {
    if (id && secret) {
      const token = await getTwitchToken(id, secret);
      const qs = links.map((l) => `user_login=${channelOf(l.url)}`).join("&");
      const res = await fetch(`https://api.twitch.tv/helix/streams?${qs}`, { headers: { "Client-Id": id, Authorization: `Bearer ${token}` } });
      const data = ((await res.json()) as { data?: { user_login: string; title: string; viewer_count: number; game_name: string }[] }).data ?? [];
      for (const l of links) {
        const s = data.find((d) => d.user_login.toLowerCase() === channelOf(l.url));
        if (s) out[l.slug] = { channel: channelOf(l.url), isLive: true, title: s.title, viewers: s.viewer_count, game: s.game_name };
      }
      return out;
    }
  } catch {
    /* cai para o banco */
  }
  const rows = await db.select().from(schema.liveStatus);
  for (const l of links) {
    const r = rows.find((x) => x.playerId === l.playerId);
    if (r) out[l.slug] = { channel: r.channel, isLive: r.isLive, title: r.title, viewers: r.viewers, game: r.game };
  }
  return out;
}
