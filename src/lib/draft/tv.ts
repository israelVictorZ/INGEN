import { createHash } from "node:crypto";
import { waitUntil, dangerouslyDeleteByTag } from "@vercel/functions";
import { publishTv } from "./realtime";

/*
 * Link fixo de transmissão do draft (`/draft/tv/<id>`), cadastrado uma vez só no OBS.
 *
 * Quem cria um draft marcando "Mostrar na transmissão" informa a chave da transmissão; o servidor guarda qual
 * sala está no ar para aquela chave e avisa a tela do OBS (Ably, canal `draft:tv-<id>`), que troca de sala sozinha.
 *
 * O `id` do link é um resumo da chave: quem vê o link (ou a live) não consegue mandar outra sala para o OBS,
 * porque para isso precisa da chave. A mesma conta é feita no navegador (`tvIdFromKey` em DraftCreator) só para
 * mostrar o link do OBS a quem digitou a chave.
 */

export { TV_KEY_MAX, TV_KEY_MIN } from "./tv-limits";
export const isTvId = (s: string) => /^[A-Za-z0-9_-]{16}$/.test(s);
export const tvId = (key: string) => createHash("sha256").update(`ingen-draft-tv:${key}`).digest("base64url").slice(0, 16);
export const tvTag = (id: string) => `draft-tv-${id}`;

type TvRow = { code: string; expiresAt: number };

interface TvStore {
  get(id: string): Promise<TvRow | null>;
  set(id: string, code: string, expiresAt: number): Promise<void>;
}

// Teste no computador sem tocar no banco (`DRAFT_STORE=memory`), como as salas.
const mem = ((globalThis as { __ingenDraftTv?: Map<string, TvRow> }).__ingenDraftTv ??= new Map());
const memoryStore: TvStore = {
  async get(id) {
    return mem.get(id) ?? null;
  },
  async set(id, code, expiresAt) {
    mem.set(id, { code, expiresAt });
  },
};

async function pg() {
  const [{ db, schema }, orm] = await Promise.all([import("@/db"), import("drizzle-orm")]);
  return { db, t: schema.draftTv, ...orm };
}
const postgresStore: TvStore = {
  async get(id) {
    const { db, t, eq } = await pg();
    const rows = await db.select({ code: t.code, expiresAt: t.expiresAt }).from(t).where(eq(t.id, id)).limit(1);
    const r = rows[0];
    return r ? { code: r.code, expiresAt: r.expiresAt.getTime() } : null;
  },
  async set(id, code, expiresAt) {
    const { db, t, sql, lt } = await pg();
    const at = new Date(expiresAt);
    await db
      .insert(t)
      .values({ id, code, expiresAt: at })
      .onConflictDoUpdate({ target: t.id, set: { code, expiresAt: at, updatedAt: sql`now()` } });
    // faxina: chaves sem sala no ar há mais de 7 dias
    await db.delete(t).where(lt(t.expiresAt, new Date(Date.now() - 7 * 24 * 60 * 60_000)));
  },
};

const store: TvStore = process.env.DRAFT_STORE === "memory" || !process.env.DATABASE_URL ? memoryStore : postgresStore;

/** Sala no ar para este link (null: nenhuma, ou a última já venceu). */
export async function tvRoom(id: string): Promise<string | null> {
  const r = await store.get(id);
  return r && r.expiresAt > Date.now() ? r.code : null;
}

/**
 * Põe a sala no ar no link da chave. Não derruba a criação do draft: erro só vai para o log e volta `null`.
 * Devolve o `id` do link do OBS.
 */
export async function putOnTv(key: string, code: string, expiresAt: number): Promise<string | null> {
  const id = tvId(key);
  try {
    await store.set(id, code, expiresAt);
  } catch (e) {
    console.error("draft: falha ao gravar a sala da transmissão", e);
    return null;
  }
  await publishTv(id, code);
  // apaga a resposta em cache do link (a reserva sem Ably lê a sala nova); de novo depois, como no sinal da sala
  const purge = () => dangerouslyDeleteByTag(tvTag(id)).catch((e) => console.error("draft: falha ao limpar o link da transmissão", e));
  waitUntil(purge().then(() => new Promise((r) => setTimeout(r, 2500))).then(purge));
  return id;
}
