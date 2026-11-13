/**
 * GET /api/stream?jogador=<slug> é o link usado pelos overlays (public/stream, StreamElements).
 * Com `jogador`, o next.config reescreve para /api/stream/<slug>, que responde com dados guardados.
 * Este arquivo só atende o link sem `jogador`, sem consultar o banco.
 */
export function GET() {
  return Response.json({ error: "informe ?jogador=<slug>" }, { status: 400 });
}
