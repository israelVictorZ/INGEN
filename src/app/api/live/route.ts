import { getLive } from "@/lib/live";

/** Status ao vivo da Twitch por jogador (cache de 60s). Consumido pelos selos "Ao vivo". */
export async function GET() {
  return Response.json(await getLive());
}
