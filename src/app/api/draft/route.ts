import { createRoom } from "@/lib/draft/server";

/** Cria a sala do draft e devolve o código (o link é /draft/<código>). */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const res = await createRoom(body);
  return Response.json(res, { status: "error" in res ? 400 : 201, headers: { "Cache-Control": "no-store" } });
}
