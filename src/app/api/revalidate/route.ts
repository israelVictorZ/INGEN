import { revalidateTag } from "next/cache";

/**
 * Aviso de "tem dado novo": chamado pelo sync (scripts/sync-riot.ts) logo depois de gravar no banco.
 * Marca os dados do site (tag "site") como velhos; a próxima visita dispara a releitura em segundo plano.
 * Sem aviso, o site só relê o banco de hora em hora, o que deixa o Neon desligar quando nada muda.
 *
 * Protegido por REVALIDATE_SECRET (Vercel e segredo do GitHub Actions): `Authorization: Bearer <segredo>`.
 */
export async function POST(req: Request) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ ok: false }, { status: 401 });
  }
  revalidateTag("site", "max");
  return Response.json({ ok: true, now: Date.now() });
}
