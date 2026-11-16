import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { RoomView } from "./engine";

/*
 * Avisos em tempo real pelo Ably (plano grátis): o servidor grava no Neon e publica a sala no canal
 * `draft:<código>`; as telas assinam o canal e não precisam ficar consultando a Vercel nem o banco.
 *
 * Sem `ABLY_API_KEY` (no computador, ou se a chave sair da Vercel) nada disso liga e a sala volta ao
 * esquema anterior: sinal no cache da Vercel e consulta direta durante o draft.
 *
 * Privacidade: o id de cada aba (cid) funciona como senha do drafter, então nunca vai para o canal. No lugar
 * dele vai `seatId(cid)`, um resumo que não volta ao cid; o navegador compara com o próprio resumo para
 * saber se a vaga é dele, e a presença do Ably usa o mesmo resumo para dizer quem está conectado.
 *
 * Usuário ativo (MAU): o plano grátis conta cada clientId diferente no mês (até 500). Por isso o clientId é do
 * APARELHO (`did`, guardado no localStorage e igual em todas as abas), não da aba: a mesma pessoa conta uma vez
 * no mês, mesmo abrindo o link numa aba nova a cada jogo. A vaga continua sendo da aba: a presença leva o
 * resumo da aba (`p`) e uma assinatura do servidor (`k`) que liga esse resumo ao clientId do aparelho, para
 * ninguém fingir estar na vaga de outro copiando o resumo (que é público na sala).
 */

const KEY = process.env.ABLY_API_KEY;
export const REALTIME_ON = !!KEY;

export const channelName = (code: string) => `draft:${code}`;

/** Resumo público do id da aba (vaga de drafter e presença). */
export const seatId = (cid: string) => createHash("sha256").update(`ingen-draft:${cid}`).digest("base64url").slice(0, 16);

/** clientId do Ably de um aparelho (resumo do id guardado no localStorage). */
export const deviceClientId = (did: string) => `d-${createHash("sha256").update(`ingen-draft-device:${did}`).digest("base64url").slice(0, 16)}`;

/** Assinatura que liga o resumo da aba (`pid`) ao clientId do aparelho; só o servidor sabe gerar. */
function proof(clientId: string, pid: string) {
  return createHmac("sha256", KEY ?? "").update(`${clientId}|${pid}`).digest("base64url").slice(0, 22);
}

/** Assinatura que a aba põe na presença (vai na resposta da sala, junto com o `pid`). */
export const presenceProof = (did: string | undefined, cid: string) => (KEY && did ? proof(deviceClientId(did), seatId(cid)) : undefined);

/** Mensagens acima disso vão só com a versão (o limite do plano grátis é 64 KiB; o Ably cobra a cada 5 KiB). */
const MAX_PAYLOAD = 48_000;
/** Token do navegador: renovado sozinho pelo SDK antes de vencer (cada renovação é 1 chamada à Vercel). */
const TOKEN_TTL_MS = 4 * 60 * 60_000;

// SDK do lado do servidor (@ably/pubsub-server): o tráfego dele não conta como usuário ativo no plano grátis.
// O pacote antigo `ably` (2.x) é recusado por contas cobradas por usuário ativo (erro 40168).
type Http = import("@ably/pubsub-server").PubSubHttpClient;
let http: Http | null = null;
async function client(): Promise<Http> {
  if (!KEY) throw new Error("ABLY_API_KEY não configurada");
  if (!http) {
    const { createHttpClient } = await import("@ably/pubsub-server");
    http = createHttpClient({ key: KEY });
  }
  return http;
}

/** Publica a sala (visão pública, sem ids de aba). Nunca derruba a gravação: erro só vai para o log. */
export async function publishRoom(code: string, version: number, room: RoomView): Promise<void> {
  try {
    const data = JSON.stringify({ v: version, room });
    const payload = data.length <= MAX_PAYLOAD ? data : JSON.stringify({ v: version });
    // `encoding: json` → o navegador recebe o objeto já convertido
    await (await client()).channels.get(channelName(code)).publish({ name: "state", data: payload, encoding: "json" });
  } catch (e) {
    console.error("draft: falha ao publicar no Ably", e);
  }
}

/**
 * Pedido de token assinado com a chave do servidor: o navegador só pode assinar o canal da sala e entrar na presença.
 * Com `did` o clientId é o do aparelho; sem ele (tela aberta antes desta versão) segue o resumo da aba.
 */
export async function tokenRequest(code: string, cid: string, did?: string) {
  const capability = JSON.stringify({ [channelName(code)]: ["subscribe", "presence"] });
  return (await client()).auth.createTokenRequest({ clientId: did ? deviceClientId(did) : seatId(cid), capability, ttl: TOKEN_TTL_MS });
}

/**
 * Resumo da aba de um membro da presença, só se a assinatura confere. No formato antigo (clientId = resumo da
 * aba, sem `p`) o próprio clientId é o resumo: só o servidor emite esse clientId, e só para quem tem o cid.
 */
export function memberSeat(clientId: string | undefined, data: unknown): string | null {
  if (!clientId) return null;
  let d = data;
  if (typeof d === "string") {
    try {
      d = JSON.parse(d);
    } catch {
      d = null;
    }
  }
  const { p, k } = (d ?? {}) as { p?: unknown; k?: unknown };
  if (typeof p !== "string" || typeof k !== "string") return clientId.startsWith("d-") ? null : clientId;
  const want = Buffer.from(proof(clientId, p));
  const got = Buffer.from(k);
  return want.length === got.length && timingSafeEqual(want, got) ? p : null;
}

/** Quem está na sala agora pela presença do Ably (resumos das abas). Usado só para decidir se uma vaga pode ser assumida. */
export async function presentSeats(code: string): Promise<Set<string>> {
  try {
    const page = await (await client()).channels.get(channelName(code)).presence.get();
    return new Set(page.items.map((m) => memberSeat(m.clientId, m.data)).filter((x): x is string => !!x));
  } catch (e) {
    console.error("draft: falha ao ler a presença no Ably", e);
    return new Set();
  }
}
