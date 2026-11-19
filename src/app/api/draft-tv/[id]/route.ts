import { isTvId, tvRoom, tvTag } from "@/lib/draft/tv";
import { REALTIME_ON } from "@/lib/draft/realtime";

/**
 * Qual sala está no ar no link fixo de transmissão (`/draft/tv/<id>`). A tela do OBS pergunta uma vez ao abrir
 * (e de novo só se o Ably cair). A resposta fica no cache da Vercel e não acorda o banco; quem põe outra sala no
 * ar apaga o cache pela etiqueta (`putOnTv`). `rt`: o servidor avisa pelo Ably, a tela não precisa ficar perguntando.
 */
export async function GET(_req: Request, ctx: RouteContext<"/api/draft-tv/[id]">) {
  const { id } = await ctx.params;
  if (!isTvId(id)) return Response.json({ error: "Link inválido." }, { status: 400 });
  const code = await tvRoom(id);
  return Response.json(
    { code, rt: REALTIME_ON },
    {
      headers: {
        "Cache-Control": "public, max-age=0, must-revalidate",
        "Vercel-CDN-Cache-Control": "public, max-age=3600",
        "Vercel-Cache-Tag": tvTag(id),
      },
    },
  );
}
