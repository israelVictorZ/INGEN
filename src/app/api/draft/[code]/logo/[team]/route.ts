import { isCode } from "@/lib/draft/server";
import { draftStore } from "@/lib/draft/store";

/** Escudo enviado de um time visitante. O endereço leva `?v=` (muda a cada envio), então pode ficar em cache. */
export async function GET(_req: Request, ctx: RouteContext<"/api/draft/[code]/logo/[team]">) {
  const { code, team } = await ctx.params;
  if (!isCode(code) || (team !== "0" && team !== "1")) return new Response(null, { status: 404 });
  const data = await draftStore.logo(code, team);
  const m = data?.match(/^data:(image\/(?:webp|png|jpeg));base64,(.+)$/);
  if (!m) return new Response(null, { status: 404 });
  return new Response(Buffer.from(m[2], "base64"), {
    headers: {
      "Content-Type": m[1],
      "Cache-Control": "public, max-age=172800, immutable",
      // guarda também no cache da Vercel: o escudo sai do banco uma vez só
      "Vercel-CDN-Cache-Control": "public, max-age=172800",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
