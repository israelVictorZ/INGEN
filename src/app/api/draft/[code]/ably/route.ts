import { isCode } from "@/lib/draft/server";
import { REALTIME_ON, tokenRequest } from "@/lib/draft/realtime";

/**
 * Token do Ably para o navegador da sala (o SDK chama aqui ao conectar e para renovar, a cada ~4 h).
 * Só permite assinar o canal desta sala e entrar na presença; publicar continua sendo só do servidor.
 * Vem por POST (form) para o id da aba não aparecer em endereço nem em log.
 * Não consulta o banco: o código só é conferido pelo formato.
 */
export async function POST(req: Request, ctx: RouteContext<"/api/draft/[code]/ably">) {
  const { code } = await ctx.params;
  const headers = { "Cache-Control": "no-store" };
  if (!REALTIME_ON) return Response.json({ error: "Tempo real desligado." }, { status: 503, headers });
  const form = await req.formData().catch(() => null);
  const cid = String(form?.get("cid") ?? "");
  // id do aparelho (vira o clientId: um usuário ativo por aparelho no mês); telas antigas não mandam
  const did = String(form?.get("did") ?? "");
  const idOk = (s: string) => /^[a-zA-Z0-9_-]{8,64}$/.test(s);
  if (!isCode(code) || !idOk(cid) || (did && !idOk(did))) return Response.json({ error: "Pedido inválido." }, { status: 400, headers });
  try {
    return Response.json(await tokenRequest(code, cid, did || undefined), { headers });
  } catch (e) {
    console.error("draft: falha ao gerar token do Ably", e);
    return Response.json({ error: "Tempo real indisponível." }, { status: 503, headers });
  }
}
