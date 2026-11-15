import { randomBytes } from "node:crypto";
import { z } from "zod";
import { waitUntil, dangerouslyDeleteByTag } from "@vercel/functions";
import { DraftError, GRACE_MS, SEAT_TIMEOUT_MS, TIMER_OPTIONS, apply, newRoom, roomPhase, tick, toView, type DraftAction, type Presence, type PresenceEntry, type RoomConfig, type RoomView, type TeamIdx } from "./engine";
import { getDraftChampions } from "./champions";
import { draftStore, type Logos } from "./store";
import { REALTIME_ON, presentSeats, publishRoom, seatId } from "./realtime";

const CODE_ALPHABET = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
/** Código da sala: 10 caracteres aleatórios (~58 bits), sem letras que se confundem (l, I, O, 0, 1). */
export function newCode(len = 10): string {
  const bytes = randomBytes(len * 2);
  let out = "";
  for (let i = 0; out.length < len && i < bytes.length; i++) {
    const b = bytes[i];
    if (b < 228) out += CODE_ALPHABET[b % CODE_ALPHABET.length]; // 228 = 4 × 57: sem viés
  }
  return out.length === len ? out : newCode(len);
}

export const isCode = (s: string) => /^[a-zA-Z0-9]{6,16}$/.test(s);

// ---------------------------------------------------------------------------------------------
// Criação
// ---------------------------------------------------------------------------------------------

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);
/** Escudo já reduzido no navegador (256 px): data URL de imagem até ~300 KB. */
const logoData = z
  .string()
  .max(400_000)
  .regex(/^data:image\/(webp|png|jpeg);base64,[A-Za-z0-9+/=]+$/);

const teamInput = z.object({
  kind: z.enum(["aces", "jokers", "guest"]),
  name: z.string().trim().max(32),
  color: hex.nullable(),
  logo: logoData.nullable(),
  logoTone: z.enum(["light", "dark"]).default("dark"),
  players: z.array(z.string().trim().max(24)).max(5),
});

export const createInput = z.object({
  teams: z.tuple([teamInput, teamInput]),
  games: z.number().int().min(1).max(5),
  mode: z.enum(["fearless", "normal"]),
  disabled: z.array(z.string().max(40)).max(80),
  firstBlue: z.union([z.literal(0), z.literal(1)]),
  timer: z.number().int().refine((n) => (TIMER_OPTIONS as readonly number[]).includes(n)),
});
export type CreateInput = z.input<typeof createInput>;

const INGEN_NAMES = { aces: "INGEN Aces", jokers: "INGEN Jokers" } as const;

export async function createRoom(raw: unknown): Promise<{ code: string } | { error: string }> {
  const parsed = createInput.safeParse(raw);
  if (!parsed.success) return { error: "Configuração inválida." };
  const input = parsed.data;
  if (input.teams[0].kind !== "guest" && input.teams[0].kind === input.teams[1].kind) return { error: "Escolha dois times diferentes." };

  const { champions } = await getDraftChampions();
  const ids = new Set(champions.map((c) => c.id));
  const now = Date.now();
  const logos: Logos = {};

  const teams = input.teams.map((t, i) => {
    const guest = t.kind === "guest";
    if (guest && t.logo) logos[String(i) as "0" | "1"] = t.logo;
    const players = Array.from({ length: 5 }, (_, k) => t.players[k] ?? "");
    return {
      kind: t.kind,
      name: guest ? t.name || `Time ${i + 1}` : INGEN_NAMES[t.kind as "aces" | "jokers"],
      color: guest ? t.color : null,
      logo: guest && t.logo ? { v: now, tone: t.logoTone } : null,
      players,
    };
  }) as RoomConfig["teams"];

  const config: RoomConfig = {
    teams,
    games: input.games,
    mode: input.mode,
    disabled: [...new Set(input.disabled.filter((d) => ids.has(d)))],
    firstBlue: input.firstBlue,
    timer: input.timer,
  };

  const code = newCode();
  await draftStore.create(code, newRoom(config, now), logos);
  // faxina das salas vencidas (barata: usa o índice de expires_at)
  draftStore.purgeExpired().catch(() => {});
  return { code };
}

// ---------------------------------------------------------------------------------------------
// Sincronização (leitura com presença + ação opcional)
// ---------------------------------------------------------------------------------------------

const actionInput = z.discriminatedUnion("type", [
  z.object({ type: z.literal("claim"), team: z.union([z.literal(0), z.literal(1)]), role: z.enum(["drafter", "spectator"]) }),
  z.object({ type: z.literal("ready"), value: z.boolean() }),
  z.object({ type: z.literal("swapSides") }),
  z.object({ type: z.literal("cancelSwap") }),
  z.object({ type: z.literal("hover"), champ: z.string().max(40).nullable(), step: z.number().int().min(0).max(19).optional() }),
  z.object({ type: z.literal("lock"), champ: z.string().max(40).nullable(), step: z.number().int().min(0).max(19).optional() }),
  z.object({ type: z.literal("request"), step: z.number().int().min(0).max(19), champ: z.string().max(40).nullable() }),
  z.object({ type: z.literal("respond"), id: z.string().max(40), accept: z.boolean() }),
  z.object({ type: z.literal("cancelRequest"), id: z.string().max(40) }),
  z.object({ type: z.literal("movePick"), from: z.number().int().min(0).max(4), to: z.number().int().min(0).max(4) }),
  z.object({ type: z.literal("result"), winner: z.union([z.literal(0), z.literal(1)]).nullable() }),
  z.object({ type: z.literal("players"), names: z.array(z.string().trim().max(24)).length(5) }),
]);

export const syncInput = z.object({
  cid: z.string().regex(/^[a-zA-Z0-9_-]{8,64}$/),
  /** versão que o navegador já tem (0 = nenhuma): se não mudou, a resposta vem sem o estado */
  v: z.number().int().min(0),
  /** número do jogo (1..5) que a pessoa está vendo */
  game: z.number().int().min(1).max(5),
  /** papel escolhido neste jogo (presença) */
  me: z.object({ team: z.union([z.literal(0), z.literal(1)]), role: z.enum(["drafter", "spectator"]) }).nullable(),
  action: actionInput.optional(),
});

/** Resumo de quem está na sala (vai em toda resposta; muda sem mexer na versão). */
export type LiveInfo = {
  spectators: [number, number];
  /** drafters do jogo pedido estão conectados? (vaga de quem caiu pode ser assumida) */
  online: [boolean, boolean];
};

export type SyncResult =
  | {
      status: 200;
      /** `pid`: resumo público desta aba; `rt`: a sala está publicando no Ably (o navegador pode parar de consultar) */
      body: { now: number; version: number; view?: RoomView; live: LiveInfo; error?: string; pid: string; rt: boolean };
    }
  | { status: 400 | 404 | 410 | 409; body: { error: string; now: number } };

/** Presença só é regravada se a anterior tiver mais que isso (ou se o papel mudou). */
const TOUCH_EVERY_MS = 8_000;

// ---------------------------------------------------------------------------------------------
// Sinal barato: as telas fora do draft só perguntam "mudou algo?" a uma resposta guardada no cache
// da Vercel (não chega ao banco). Cada gravação apaga essa resposta, e a próxima pergunta lê a versão nova.
// ---------------------------------------------------------------------------------------------

export const signalTag = (code: string) => `draft-${code}`;

/** Versão atual da sala, para a resposta em cache (`GET /api/draft/<código>/v`). */
export async function roomSignal(code: string): Promise<{ status: 200 | 400 | 404 | 410; body: { v?: number; error?: string } }> {
  if (!isCode(code)) return { status: 400, body: { error: "Pedido inválido." } };
  const h = await draftStore.head(code);
  if (!h) return { status: 404, body: { error: "Sala não encontrada." } };
  if (h.expiresAt < Date.now()) return { status: 410, body: { error: "Este link expirou." } };
  return { status: 200, body: { v: h.version } };
}

/** Apaga a resposta em cache do sinal (fora da Vercel não faz nada). Roda depois da resposta, sem atrasar quem agiu. */
function bumpSignal(code: string) {
  const purge = () => dangerouslyDeleteByTag(signalTag(code)).catch((e) => console.error("draft: falha ao limpar o sinal", e));
  // a segunda limpeza cobre uma leitura lenta (banco acordando) que tenha guardado a versão anterior
  // depois da primeira
  waitUntil(purge().then(() => new Promise((r) => setTimeout(r, 2500))).then(purge));
}

export async function syncRoom(code: string, raw: unknown): Promise<SyncResult> {
  const now = Date.now();
  const parsed = syncInput.safeParse(raw);
  if (!parsed.success || !isCode(code)) return { status: 400, body: { error: "Pedido inválido.", now } };
  const { cid, v, game, me, action } = parsed.data;

  // Consulta sem ação e sem novidade (o caso de quase todas durante o draft): lê só a versão, o prazo e a
  // presença, sem trazer o estado inteiro do banco.
  if (!action && v > 0) {
    const h = await draftStore.head(code);
    if (!h) return { status: 404, body: { error: "Sala não encontrada.", now } };
    if (h.expiresAt < now) return { status: 410, body: { error: "Este link expirou.", now } };
    if (h.version === v && (h.deadline === null || now <= h.deadline + GRACE_MS)) {
      const presence = await touchPresence(code, cid, game, me, h.presence, now);
      return { status: 200, body: { now, version: v, live: liveFromPresence(presence, game, now), pid: seatId(cid), rt: REALTIME_ON } };
    }
  }

  let actionError: string | undefined;
  let ids: Set<string> | null = null;

  for (let attempt = 0; attempt < 5; attempt++) {
    const row = await draftStore.get(code);
    if (!row) return { status: 404, body: { error: "Sala não encontrada.", now } };
    const { state, presence } = row;
    if (state.expiresAt < now) return { status: 410, body: { error: "Este link expirou.", now } };

    // com o Ably as telas não gravam mais presença no banco: para decidir se uma vaga pode ser assumida,
    // vale também quem está na presença do canal (consultada só quando alguém tenta pegar uma vaga ocupada)
    const ablySeats =
      REALTIME_ON && action?.type === "claim" && action.role === "drafter" && state.games[game - 1]?.drafters[action.team] && state.games[game - 1]?.drafters[action.team] !== cid
        ? await presentSeats(code)
        : null;
    const online = (id: string) => id === cid || (presence[id]?.s ?? 0) > now - SEAT_TIMEOUT_MS || !!ablySeats?.has(seatId(id));
    const phaseBefore = roomPhase(state);
    let changed = tick(state, now);

    if (action) {
      if (!ids && (action.type === "hover" || action.type === "lock" || action.type === "request")) {
        ids = new Set((await getDraftChampions()).champions.map((c) => c.id));
      }
      const snap = JSON.stringify(state);
      try {
        apply(state, game - 1, action as DraftAction, {
          now,
          cid,
          online,
          isChampion: (id) => (ids ? ids.has(id) : true),
          newId: () => newCode(8),
        });
        if (JSON.stringify(state) !== snap) changed = true;
      } catch (e) {
        if (!(e instanceof DraftError)) throw e;
        actionError = e.message;
      }
    }

    let version = row.version;
    if (changed) {
      const saved = await draftStore.save(code, row.version, state);
      if (saved === null) {
        actionError = undefined;
        continue; // alguém gravou no meio: relê e tenta de novo
      }
      version = saved;
      // durante o draft todas as telas consultam direto; o sinal só precisa mudar quando a fase muda
      // ou quando a mudança acontece fora do draft (pronto, vencedor, correção…)
      if (phaseBefore !== "drafting" || roomPhase(state) !== "drafting") bumpSignal(code);
      // todas as telas recebem a sala nova pelo Ably (sem os ids das abas), depois da resposta
      if (REALTIME_ON) waitUntil(publishRoom(code, version, toView(state, "", () => false, seatId)));
    }

    await touchPresence(code, cid, game, me, presence, now);

    const g = state.games[game - 1];
    const seats: [boolean, boolean] = g ? [!!g.drafters[0] && online(g.drafters[0]), !!g.drafters[1] && online(g.drafters[1])] : [false, false];
    const live = liveInfo(presence, now, seats);
    return {
      status: 200,
      body: {
        now,
        version,
        live,
        pid: seatId(cid),
        rt: REALTIME_ON,
        ...(actionError ? { error: actionError } : {}),
        ...(version !== v ? { view: toView(state, cid, online, seatId) } : {}),
      },
    };
  }
  return { status: 409, body: { error: "Muita gente mexendo ao mesmo tempo. Tente de novo.", now } };
}

/** Grava a presença de quem consulta (só se mudou de papel ou se a última tem mais de 8 s). Muta `presence`. */
async function touchPresence(code: string, cid: string, game: number, me: { team: number; role: "drafter" | "spectator" } | null, presence: Presence, now: number) {
  if (!me) return presence;
  const prev = presence[cid];
  const entry: PresenceEntry = { t: me.team as TeamIdx, r: me.role, g: game, s: now };
  if (!prev || prev.t !== entry.t || prev.r !== entry.r || prev.g !== entry.g || now - prev.s > TOUCH_EVERY_MS) {
    await draftStore.touch(code, cid, entry);
    presence[cid] = entry;
  }
  return presence;
}

/** Sem o estado (consulta leve): drafter conectado = alguém visto há pouco como drafter daquele time neste jogo. */
function liveFromPresence(presence: Presence, game: number, now: number): LiveInfo {
  const seats: [boolean, boolean] = [false, false];
  for (const p of Object.values(presence)) if (p.r === "drafter" && p.g === game && p.s > now - SEAT_TIMEOUT_MS) seats[p.t] = true;
  return liveInfo(presence, now, seats);
}

function liveInfo(presence: Presence, now: number, online: [boolean, boolean]): LiveInfo {
  const spectators: [number, number] = [0, 0];
  for (const p of Object.values(presence)) if (p.r === "spectator" && p.s > now - SEAT_TIMEOUT_MS) spectators[p.t]++;
  return { spectators, online };
}
