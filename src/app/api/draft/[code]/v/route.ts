import { roomSignal, signalTag } from "@/lib/draft/server";

/**
 * Sinal da sala: só a versão atual. As telas fora do draft perguntam aqui a cada poucos segundos, e a
 * resposta fica guardada no cache da Vercel (não acorda o banco) até alguém mudar a sala: cada gravação
 * apaga o cache pela etiqueta (`bumpSignal`), e a próxima pergunta traz a versão nova.
 * O navegador sempre pergunta de novo (`max-age=0`); quem guarda é o cache da Vercel (`Vercel-CDN-Cache-Control`).
 */
export async function GET(_req: Request, ctx: RouteContext<"/api/draft/[code]/v">) {
  const { code } = await ctx.params;
  const res = await roomSignal(code);
  const headers: Record<string, string> = { "Cache-Control": "public, max-age=0, must-revalidate" };
  if (res.status === 200) {
    headers["Vercel-CDN-Cache-Control"] = "public, max-age=86400";
    headers["Vercel-Cache-Tag"] = signalTag(code);
  }
  return Response.json(res.body, { status: res.status, headers });
}
