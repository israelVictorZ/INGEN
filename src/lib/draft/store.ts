import { nextDeadline, type Presence, type PresenceEntry, type RoomState } from "./engine";

export type RoomRow = { state: RoomState; version: number; presence: Presence };
/** O mínimo para responder "nada mudou": poucos bytes, sem o estado da sala. */
export type RoomHead = { version: number; deadline: number | null; expiresAt: number; presence: Presence };
export type Logos = Partial<Record<"0" | "1", string>>;

/**
 * Onde as salas ficam. Em produção, no Neon (tabela `draft_rooms`). Para testar no computador sem
 * tocar no banco, `DRAFT_STORE=memory` no `.env` guarda tudo na memória do `next dev` (some ao reiniciar).
 */
export interface DraftStore {
  create(code: string, state: RoomState, logos: Logos): Promise<void>;
  get(code: string): Promise<RoomRow | null>;
  head(code: string): Promise<RoomHead | null>;
  /** grava só se ninguém gravou antes (`version` igual); devolve a versão nova ou null */
  save(code: string, version: number, state: RoomState): Promise<number | null>;
  touch(code: string, cid: string, entry: PresenceEntry): Promise<void>;
  logo(code: string, team: "0" | "1"): Promise<string | null>;
  purgeExpired(): Promise<void>;
}

// ---------------------------------------------------------------------------------------------

type MemRoom = RoomRow & { logos: Logos };
const mem = ((globalThis as { __ingenDraftRooms?: Map<string, MemRoom> }).__ingenDraftRooms ??= new Map());

const memoryStore: DraftStore = {
  async create(code, state, logos) {
    mem.set(code, { state: structuredClone(state), version: 1, presence: {}, logos });
  },
  async get(code) {
    const r = mem.get(code);
    return r ? { state: structuredClone(r.state), version: r.version, presence: { ...r.presence } } : null;
  },
  async head(code) {
    const r = mem.get(code);
    return r ? { version: r.version, deadline: nextDeadline(r.state), expiresAt: r.state.expiresAt, presence: { ...r.presence } } : null;
  },
  async save(code, version, state) {
    const r = mem.get(code);
    if (!r || r.version !== version) return null;
    r.state = structuredClone(state);
    r.version++;
    return r.version;
  },
  async touch(code, cid, entry) {
    const r = mem.get(code);
    if (r) r.presence[cid] = entry;
  },
  async logo(code, team) {
    return mem.get(code)?.logos[team] ?? null;
  },
  async purgeExpired() {
    const now = Date.now();
    for (const [k, r] of mem) if (r.state.expiresAt < now) mem.delete(k);
  },
};

// ---------------------------------------------------------------------------------------------

async function pg() {
  const [{ db, schema }, orm] = await Promise.all([import("@/db"), import("drizzle-orm")]);
  return { db, t: schema.draftRooms, ...orm };
}

const postgresStore: DraftStore = {
  async create(code, state, logos) {
    const { db, t } = await pg();
    await db.insert(t).values({ code, state, logos, deadline: nextDeadline(state), expiresAt: new Date(state.expiresAt) });
  },
  async get(code) {
    const { db, t, eq } = await pg();
    const rows = await db.select({ state: t.state, version: t.version, presence: t.presence }).from(t).where(eq(t.code, code)).limit(1);
    const r = rows[0];
    return r ? { state: r.state as RoomState, version: r.version, presence: (r.presence ?? {}) as Presence } : null;
  },
  async head(code) {
    const { db, t, eq } = await pg();
    const rows = await db
      .select({ version: t.version, deadline: t.deadline, expiresAt: t.expiresAt, presence: t.presence })
      .from(t)
      .where(eq(t.code, code))
      .limit(1);
    const r = rows[0];
    return r ? { version: r.version, deadline: r.deadline ?? null, expiresAt: r.expiresAt.getTime(), presence: (r.presence ?? {}) as Presence } : null;
  },
  async save(code, version, state) {
    const { db, t, eq, and, sql } = await pg();
    const rows = await db
      .update(t)
      .set({ state, deadline: nextDeadline(state), version: sql`${t.version} + 1` })
      .where(and(eq(t.code, code), eq(t.version, version)))
      .returning({ version: t.version });
    return rows[0]?.version ?? null;
  },
  async touch(code, cid, entry) {
    const { db, t, eq, sql } = await pg();
    // junta a chave no jsonb sem reescrever o resto (duas pessoas batendo ao mesmo tempo não se apagam)
    await db
      .update(t)
      .set({ presence: sql`${t.presence} || ${JSON.stringify({ [cid]: entry })}::jsonb` })
      .where(eq(t.code, code));
  },
  async logo(code, team) {
    const { db, t, eq, sql } = await pg();
    const rows = await db
      .select({ logo: sql<string | null>`${t.logos} ->> ${team}` })
      .from(t)
      .where(eq(t.code, code))
      .limit(1);
    return rows[0]?.logo ?? null;
  },
  async purgeExpired() {
    const { db, t, lt } = await pg();
    await db.delete(t).where(lt(t.expiresAt, new Date()));
  },
};

export const draftStore: DraftStore = process.env.DRAFT_STORE === "memory" || !process.env.DATABASE_URL ? memoryStore : postgresStore;
