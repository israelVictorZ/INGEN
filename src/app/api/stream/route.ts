import { getSiteData } from "@/lib/data";
import { rankLabel } from "@/lib/format";
import slugRedirects from "@/lib/slug-redirects.json";

/**
 * Dados de um jogador para os overlays de stream (public/stream): nick, time, lane, elo e canal.
 * GET /api/stream?jogador=<slug>. Aberto (CORS *) porque os overlays também rodam no StreamElements e em arquivo local.
 */
const CORS = { "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=60, s-maxage=60" };

export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("jogador")?.trim().toLowerCase() ?? "";
  const slug = (slugRedirects as Record<string, string>)[raw] ?? raw;
  const { players, lastSync } = await getSiteData();
  const p = players.find((x) => x.slug === slug);
  if (!p) return Response.json({ error: "jogador não encontrado" }, { status: 404, headers: CORS });

  const solo = p.solo;
  return Response.json(
    {
      slug: p.slug,
      nome: p.displayName,
      time: p.team.accent === "silver" ? "silver" : "black",
      timeNome: p.team.name,
      lane: p.role,
      elo: solo ? `${rankLabel(solo.tier, solo.division)} · ${solo.lp} PDL` : null,
      tier: solo?.tier ?? null,
      canal: p.live?.channel ?? null,
      atualizado: lastSync,
    },
    { headers: CORS },
  );
}
