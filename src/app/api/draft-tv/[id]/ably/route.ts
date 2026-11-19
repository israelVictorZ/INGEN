import { isTvId } from "@/lib/draft/tv";
import { REALTIME_ON, tvTokenRequest } from "@/lib/draft/realtime";

/** Token do Ably para a tela do OBS: só assina o canal do link de transmissão. Não consulta o banco. */
export async function POST(req: Request, ctx: RouteContext<"/api/draft-tv/[id]/ably">) {
  const { id } = await ctx.params;
  const headers = { "Cache-Control": "no-store" };
  if (!REALTIME_ON) return Response.json({ error: "Tempo real desligado." }, { status: 503, headers });
  const form = await req.formData().catch(() => null);
  const did = String(form?.get("did") ?? "");
  if (!isTvId(id) || (did && !/^[a-zA-Z0-9_-]{8,64}$/.test(did))) return Response.json({ error: "Pedido inválido." }, { status: 400, headers });
  try {
    return Response.json(await tvTokenRequest(id, did || undefined), { headers });
  } catch (e) {
    console.error("draft: falha ao gerar token do Ably (transmissão)", e);
    return Response.json({ error: "Tempo real indisponível." }, { status: 503, headers });
  }
}
