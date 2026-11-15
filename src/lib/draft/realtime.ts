import { createHash } from "node:crypto";
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
 */

const KEY = process.env.ABLY_API_KEY;
export const REALTIME_ON = !!KEY;

export const channelName = (code: string) => `draft:${code}`;

/** Resumo público do id da aba (vaga de drafter e presença). */
export const seatId = (cid: string) => createHash("sha256").update(`ingen-draft:${cid}`).digest("base64url").slice(0, 16);

/** Mensagens acima disso vão só com a versão (o limite do plano grátis é 64 KiB; o Ably cobra a cada 5 KiB). */
const MAX_PAYLOAD = 48_000;
/** Token do navegador: renovado sozinho pelo SDK antes de vencer (cada renovação é 1 chamada à Vercel). */
const TOKEN_TTL_MS = 4 * 60 * 60_000;

type Rest = import("ably").Rest;
let rest: Rest | null = null;
async function client(): Promise<Rest> {
  if (!KEY) throw new Error("ABLY_API_KEY não configurada");
  if (!rest) {
    const Ably = await import("ably");
    rest = new Ably.Rest({ key: KEY });
  }
  return rest;
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

/** Pedido de token assinado com a chave do servidor: o navegador só pode assinar o canal da sala e entrar na presença. */
export async function tokenRequest(code: string, cid: string) {
  const capability = JSON.stringify({ [channelName(code)]: ["subscribe", "presence"] });
  return (await client()).auth.createTokenRequest({ clientId: seatId(cid), capability, ttl: TOKEN_TTL_MS });
}

/** Quem está na sala agora pela presença do Ably (resumos das abas). Usado só para decidir se uma vaga pode ser assumida. */
export async function presentSeats(code: string): Promise<Set<string>> {
  try {
    const page = await (await client()).channels.get(channelName(code)).presence.get();
    return new Set(page.items.map((m) => m.clientId).filter((x): x is string => !!x));
  } catch (e) {
    console.error("draft: falha ao ler a presença no Ably", e);
    return new Set();
  }
}
