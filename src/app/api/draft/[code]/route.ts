import { syncRoom } from "@/lib/draft/server";

/**
 * Sincronização da sala: cada navegador chama a cada 1 a 3 s (mais rápido durante o draft) com a versão
 * que já tem; a resposta só traz o estado quando ele mudou. Ações (pick, ban, pronto…) vêm no mesmo pedido.
 */
export async function POST(req: Request, ctx: RouteContext<"/api/draft/[code]">) {
  const { code } = await ctx.params;
  const body = await req.json().catch(() => null);
  const res = await syncRoom(code, body);
  return Response.json(res.body, { status: res.status, headers: { "Cache-Control": "no-store" } });
}
