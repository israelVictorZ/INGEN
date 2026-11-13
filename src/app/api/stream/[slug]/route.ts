import { getSiteData } from "@/lib/data";
import { rankLabel } from "@/lib/format";
import slugRedirects from "@/lib/slug-redirects.json";

/**
 * Dados de um jogador para os overlays de stream (public/stream): nick, time, lane, elo e canal.
 * Os overlays chamam GET /api/stream?jogador=<slug>; o next.config reescreve para cá, sem mudar o link.
 *
 * A resposta de cada jogador é gerada no build e fica guardada: depende só de getSiteData (tag "site"),
 * que o sync renova pelo /api/revalidate quando grava algo novo. Assim o overlay, que pergunta de
 * tempos em tempos durante a live, não acorda o banco. CORS aberto: ver headers() no next.config.
 */
export async function generateStaticParams() {
  const { players } = await getSiteData();
  return players.map((p) => ({ slug: p.slug }));
}

export async function GET(_req: Request, ctx: RouteContext<"/api/stream/[slug]">) {
  const raw = (await ctx.params).slug.trim().toLowerCase();
  const slug = (slugRedirects as Record<string, string>)[raw] ?? raw;
  const { players, lastSync } = await getSiteData();
  const p = players.find((x) => x.slug === slug);
  if (!p) return Response.json({ error: "jogador não encontrado" }, { status: 404 });

  const solo = p.solo;
  return Response.json({
    slug: p.slug,
    nome: p.displayName,
    time: p.team.accent === "silver" ? "silver" : "black",
    timeNome: p.team.name,
    lane: p.role,
    elo: solo ? `${rankLabel(solo.tier, solo.division)} · ${solo.lp} PDL` : null,
    tier: solo?.tier ?? null,
    canal: p.live?.channel ?? null,
    atualizado: lastSync,
  });
}
