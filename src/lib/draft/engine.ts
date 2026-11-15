/**
 * Draft de scrims: regras puras (sem banco, sem React). O servidor usa para validar e aplicar cada
 * ação; o navegador usa as mesmas funções para desenhar a tela (de quem é a vez, o que está bloqueado).
 *
 * Tudo é decidido pelo servidor: o relógio de cada ação é um `deadline` em milissegundos e, quando ele
 * passa, `tick()` fecha a ação (com o campeão selecionado, se houver, ou vazia) na próxima leitura.
 */

export const DRAFT_TTL_MS = 32 * 60 * 60 * 1000;
/** Folga para a latência: ações chegando até esse tempo depois do fim do relógio ainda valem. */
export const GRACE_MS = 1000;
/** Sem sinal de vida por esse tempo, a vaga de drafter pode ser assumida por outra pessoa. */
export const SEAT_TIMEOUT_MS = 25_000;
export const TIMER_OPTIONS = [30, 45, 60, 0] as const;

export type TeamIdx = 0 | 1;
export type Side = "blue" | "red";
export type TeamKind = "aces" | "jokers" | "guest";
export type Role = "drafter" | "spectator";

export type TeamConfig = {
  kind: TeamKind;
  name: string;
  /** cor principal do time visitante (#rrggbb); INGEN usa as cores da marca */
  color: string | null;
  /** escudo enviado: `v` muda a cada envio (cache), `tone` = brilho do desenho para escolher a placa */
  logo: { v: number; tone: "light" | "dark" } | null;
  /** nomes dos 5 jogadores (opcional; vazio = "Jogador N") */
  players: string[];
};

export type RoomConfig = {
  teams: [TeamConfig, TeamConfig];
  /** número de jogos da série (1 a 5) */
  games: number;
  mode: "fearless" | "normal";
  /** campeões desativados na série inteira (ids do Data Dragon, ex.: "MonkeyKing") */
  disabled: string[];
  /** time que começa no lado azul no jogo 1 (alterna a cada jogo) */
  firstBlue: TeamIdx;
  /** segundos por ação; 0 = sem limite */
  timer: number;
};

export type CorrectionRequest = { id: string; team: TeamIdx; step: number; champ: string | null; at: number };

export type GameState = {
  n: number;
  blueTeam: TeamIdx;
  status: "lobby" | "drafting" | "done";
  /** id do cliente (aba) em cada vaga de drafter, por time */
  drafters: [string | null, string | null];
  ready: [boolean, boolean];
  /** pedido de troca de lados feito por este time (o outro precisa aceitar) */
  sideSwapBy: TeamIdx | null;
  step: number;
  deadline: number | null;
  /** campeão de cada ação já feita (null = ação vazia / "sem ban") */
  actions: (string | null)[];
  /** campeão selecionado (ainda não confirmado) na ação atual */
  hover: string | null;
  requests: CorrectionRequest[];
  /** ordem de exibição dos 5 picks de cada time (o drafter pode reorganizar depois do draft) */
  order: [number[], number[]];
  winner: TeamIdx | null;
  startedAt: number | null;
  endedAt: number | null;
};

export type RoomState = {
  config: RoomConfig;
  games: GameState[];
  createdAt: number;
  expiresAt: number;
};

/** Presença: quem está na sala, com que papel e quando foi visto pela última vez. */
export type PresenceEntry = { t: TeamIdx; r: Role; g: number; s: number };
export type Presence = Record<string, PresenceEntry>;

// ---------------------------------------------------------------------------------------------
// Ordem do draft (formato de campeonato)
// ---------------------------------------------------------------------------------------------

export type Step = { side: Side; type: "ban" | "pick"; slot: number; phase: 1 | 2 };

const S = (side: Side, type: "ban" | "pick", slot: number, phase: 1 | 2): Step => ({ side, type, slot, phase });

/**
 * Bans 1: A V A V A V · Picks 1: A1, V1 V2, A2 A3, V3 · Bans 2: A V A V · Picks 2: V4, A4 A5, V5.
 * (Ordem definida pelo Israel em 15/11/2026. No cliente oficial a 2ª fase de bans começa pelo vermelho:
 * para usar essa ordem, troque os quatro bans da fase 2 abaixo.)
 */
export const STEPS: Step[] = [
  S("blue", "ban", 0, 1),
  S("red", "ban", 0, 1),
  S("blue", "ban", 1, 1),
  S("red", "ban", 1, 1),
  S("blue", "ban", 2, 1),
  S("red", "ban", 2, 1),
  S("blue", "pick", 0, 1),
  S("red", "pick", 0, 1),
  S("red", "pick", 1, 1),
  S("blue", "pick", 1, 1),
  S("blue", "pick", 2, 1),
  S("red", "pick", 2, 1),
  S("blue", "ban", 3, 2),
  S("red", "ban", 3, 2),
  S("blue", "ban", 4, 2),
  S("red", "ban", 4, 2),
  S("red", "pick", 3, 2),
  S("blue", "pick", 3, 2),
  S("blue", "pick", 4, 2),
  S("red", "pick", 4, 2),
];

export const TOTAL_STEPS = STEPS.length;

/** Índice da ação que preenche o slot (lado, tipo, posição). */
export function stepIndex(side: Side, type: "ban" | "pick", slot: number) {
  return STEPS.findIndex((s) => s.side === side && s.type === type && s.slot === slot);
}

// ---------------------------------------------------------------------------------------------
// Consultas
// ---------------------------------------------------------------------------------------------

export const other = (t: TeamIdx): TeamIdx => (t === 0 ? 1 : 0);
export const teamOnSide = (g: AnyGame, side: Side): TeamIdx => (side === "blue" ? g.blueTeam : other(g.blueTeam));
export const sideOf = (g: AnyGame, team: TeamIdx): Side => (g.blueTeam === team ? "blue" : "red");
/** Lado azul do jogo `n` (1, 2, …) se ninguém trocar: alterna a cada jogo. */
export const defaultBlue = (config: RoomConfig, n: number): TeamIdx => ((n - 1) % 2 === 0 ? config.firstBlue : other(config.firstBlue));

export function currentStep(g: AnyGame): Step | null {
  return g.status === "drafting" ? (STEPS[g.step] ?? null) : null;
}

/** Time que age agora (ou null fora do draft). */
export function actingTeam(g: AnyGame): TeamIdx | null {
  const s = currentStep(g);
  return s ? teamOnSide(g, s.side) : null;
}

/** Campeão de um slot (lado/tipo/posição): undefined = ainda não chegou a vez; null = vazio. */
export function slotChamp(g: AnyGame, side: Side, type: "ban" | "pick", slot: number): string | null | undefined {
  const i = stepIndex(side, type, slot);
  return i < g.actions.length ? g.actions[i] : undefined;
}

/** Picks de um jogo, por time (ids, sem vazios). */
export function picksOf(g: AnyGame, team: TeamIdx): string[] {
  const side = sideOf(g, team);
  const out: string[] = [];
  STEPS.forEach((s, i) => {
    const c = g.actions[i];
    if (s.side === side && s.type === "pick" && c) out.push(c);
  });
  return out;
}

/** Fearless: campeões escolhidos nos jogos anteriores ao jogo de índice `gameIdx`, com quem pegou. */
export function fearlessLocked(state: AnyRoom, gameIdx: number): { champ: string; team: TeamIdx; game: number }[] {
  if (state.config.mode !== "fearless") return [];
  const out: { champ: string; team: TeamIdx; game: number }[] = [];
  for (const g of state.games.slice(0, gameIdx)) {
    for (const t of [0, 1] as TeamIdx[]) for (const c of picksOf(g, t)) out.push({ champ: c, team: t, game: g.n });
  }
  return out;
}

/** Campeões que não podem ser escolhidos no jogo (desativados, já usados neste draft, fearless). `exceptStep` ignora um slot (correção). */
export function unavailable(state: AnyRoom, gameIdx: number, exceptStep?: number): Set<string> {
  const g = state.games[gameIdx];
  const set = new Set(state.config.disabled);
  g?.actions.forEach((c, i) => {
    if (c && i !== exceptStep) set.add(c);
  });
  for (const f of fearlessLocked(state, gameIdx)) set.add(f.champ);
  return set;
}

export function score(state: AnyRoom): [number, number] {
  const s: [number, number] = [0, 0];
  for (const g of state.games) if (g.winner !== null) s[g.winner]++;
  return s;
}

/** Fim da série: vencedor (quem passou da metade dos jogos), empate (todos jogados, placar igual) ou null. */
export function seriesResult(state: AnyRoom): { winner: TeamIdx | null; over: boolean; clinched: boolean } {
  const [a, b] = score(state);
  const need = Math.floor(state.config.games / 2) + 1;
  const played = state.games.filter((g) => g.winner !== null).length;
  const allPlayed = played >= state.config.games;
  if (a >= need || b >= need) return { winner: a > b ? 0 : 1, over: allPlayed, clinched: true };
  if (allPlayed) return { winner: a === b ? null : a > b ? 0 : 1, over: true, clinched: a !== b };
  return { winner: null, over: false, clinched: false };
}

/** `blueTeam`: quem fica no azul (padrão: alternância pela configuração; depois do jogo 1, o contrário do jogo anterior). */
export function newGame(config: RoomConfig, n: number, blueTeam: TeamIdx = defaultBlue(config, n)): GameState {
  return {
    n,
    blueTeam,
    status: "lobby",
    drafters: [null, null],
    ready: [false, false],
    sideSwapBy: null,
    step: 0,
    deadline: null,
    actions: [],
    hover: null,
    requests: [],
    order: [
      [0, 1, 2, 3, 4],
      [0, 1, 2, 3, 4],
    ],
    winner: null,
    startedAt: null,
    endedAt: null,
  };
}

export function newRoom(config: RoomConfig, now: number): RoomState {
  return { config, games: [newGame(config, 1)], createdAt: now, expiresAt: now + DRAFT_TTL_MS };
}

// ---------------------------------------------------------------------------------------------
// Relógio
// ---------------------------------------------------------------------------------------------

function closeStep(state: RoomState, gi: number, champ: string | null, nextDeadlineFrom: number) {
  const g = state.games[gi];
  g.actions[g.step] = champ;
  g.step++;
  g.hover = null;
  if (g.step >= TOTAL_STEPS) {
    g.status = "done";
    g.deadline = null;
    g.endedAt = nextDeadlineFrom;
  } else {
    g.deadline = state.config.timer > 0 ? nextDeadlineFrom + state.config.timer * 1000 : null;
  }
}

/**
 * Fecha as ações cujo relógio acabou: entra o campeão selecionado (se ainda for válido) ou fica vazio.
 * Muta `state`; devolve true se mudou algo.
 */
export function tick(state: RoomState, now: number): boolean {
  let changed = false;
  state.games.forEach((g, gi) => {
    while (g.status === "drafting" && g.deadline !== null && now > g.deadline + GRACE_MS) {
      const hover = g.hover && !unavailable(state, gi).has(g.hover) ? g.hover : null;
      closeStep(state, gi, hover, g.deadline);
      changed = true;
    }
  });
  return changed;
}

// ---------------------------------------------------------------------------------------------
// Ações
// ---------------------------------------------------------------------------------------------

export type DraftAction =
  | { type: "claim"; team: TeamIdx; role: Role }
  | { type: "ready"; value: boolean }
  | { type: "swapSides" }
  | { type: "cancelSwap" }
  | { type: "hover"; champ: string | null }
  | { type: "lock"; champ: string | null }
  | { type: "request"; step: number; champ: string | null }
  | { type: "respond"; id: string; accept: boolean }
  | { type: "cancelRequest"; id: string }
  | { type: "movePick"; from: number; to: number }
  | { type: "result"; winner: TeamIdx | null };

export type Ctx = {
  now: number;
  cid: string;
  /** a pessoa com esse id está conectada? (vaga de drafter abandonada pode ser assumida) */
  online: (cid: string) => boolean;
  /** campeões que existem (valida ids vindos do navegador) */
  isChampion: (id: string) => boolean;
  newId: () => string;
};

export class DraftError extends Error {}
const fail = (msg: string): never => {
  throw new DraftError(msg);
};

/** Time em que o cliente é drafter neste jogo (ou null). */
export function drafterTeam(g: GameState, cid: string): TeamIdx | null {
  if (g.drafters[0] === cid) return 0;
  if (g.drafters[1] === cid) return 1;
  return null;
}

function requireDrafter(g: GameState, cid: string): TeamIdx {
  const t = drafterTeam(g, cid);
  if (t === null) fail("Só o drafter do time pode fazer isso.");
  return t as TeamIdx;
}

/** Jogo que ainda pode receber mudanças (o seguinte não começou). */
function editable(state: RoomState, gi: number) {
  const next = state.games[gi + 1];
  return !next || next.status === "lobby";
}

/**
 * Aplica uma ação ao jogo de índice `gi`. Muta `state` (chame com uma cópia) e lança DraftError
 * com a mensagem para o usuário quando a ação não vale.
 */
export function apply(state: RoomState, gi: number, action: DraftAction, ctx: Ctx): void {
  const g = state.games[gi];
  if (!g) fail("Este jogo ainda não foi liberado.");
  const { now, cid } = ctx;

  switch (action.type) {
    case "claim": {
      const t = action.team;
      if (t !== 0 && t !== 1) fail("Time inválido.");
      if (action.role === "drafter") {
        const holder = g.drafters[t];
        if (holder && holder !== cid && ctx.online(holder)) fail("A vaga de drafter deste time já está ocupada.");
        if (g.drafters[other(t)] === cid) {
          g.drafters[other(t)] = null;
          if (g.status === "lobby") g.ready[other(t)] = false;
        }
        if (holder !== cid) {
          g.drafters[t] = cid;
          if (g.status === "lobby") g.ready[t] = false;
        }
      } else {
        for (const x of [0, 1] as TeamIdx[])
          if (g.drafters[x] === cid) {
            g.drafters[x] = null;
            if (g.status === "lobby") g.ready[x] = false;
          }
      }
      return;
    }

    case "ready": {
      const t = requireDrafter(g, cid);
      if (g.status !== "lobby") fail("O draft já começou.");
      g.ready[t] = !!action.value;
      if (g.ready[0] && g.ready[1] && g.drafters[0] && g.drafters[1]) {
        g.status = "drafting";
        g.step = 0;
        g.actions = [];
        g.hover = null;
        g.sideSwapBy = null;
        g.startedAt = now;
        g.deadline = state.config.timer > 0 ? now + state.config.timer * 1000 : null;
      }
      return;
    }

    case "swapSides": {
      const t = requireDrafter(g, cid);
      if (g.status !== "lobby") fail("Os lados só mudam antes do draft começar.");
      if (g.sideSwapBy === other(t)) {
        g.blueTeam = other(g.blueTeam);
        g.sideSwapBy = null;
        g.ready = [false, false];
      } else {
        g.sideSwapBy = t;
      }
      return;
    }

    case "cancelSwap": {
      requireDrafter(g, cid);
      g.sideSwapBy = null;
      return;
    }

    case "hover":
    case "lock": {
      const t = requireDrafter(g, cid);
      const s = currentStep(g);
      if (!s) fail("Não há ação em andamento.");
      if (teamOnSide(g, s!.side) !== t) fail("Não é a vez do seu time.");
      if (g.deadline !== null && now > g.deadline + GRACE_MS) fail("O tempo acabou.");
      const c = action.champ;
      if (c !== null) {
        if (!ctx.isChampion(c)) fail("Campeão desconhecido.");
        if (unavailable(state, gi).has(c)) fail("Esse campeão não está disponível.");
      }
      if (action.type === "hover") {
        g.hover = c;
        return;
      }
      if (c === null && s!.type === "pick") fail("Escolha um campeão.");
      closeStep(state, gi, c, now);
      return;
    }

    case "request": {
      const t = requireDrafter(g, cid);
      const s = STEPS[action.step];
      if (!s || action.step >= g.actions.length) fail("Essa ação ainda não aconteceu.");
      if (teamOnSide(g, s.side) !== t) fail("Você só pode pedir troca nos slots do seu time.");
      if (g.winner !== null || !editable(state, gi)) fail("O resultado deste jogo já foi registrado.");
      const c = action.champ;
      if (c !== null) {
        if (!ctx.isChampion(c)) fail("Campeão desconhecido.");
        if (unavailable(state, gi, action.step).has(c)) fail("Esse campeão não está disponível.");
      } else if (s.type === "pick") fail("Escolha um campeão para o pick.");
      if (g.actions[action.step] === c) fail("Esse já é o campeão do slot.");
      g.requests = g.requests.filter((r) => r.team !== t);
      g.requests.push({ id: ctx.newId(), team: t, step: action.step, champ: c, at: now });
      return;
    }

    case "respond": {
      const t = requireDrafter(g, cid);
      const r = g.requests.find((x) => x.id === action.id);
      if (!r) fail("O pedido não existe mais.");
      if (r!.team === t) fail("Quem responde é o drafter adversário.");
      g.requests = g.requests.filter((x) => x.id !== action.id);
      if (!action.accept) return;
      if (g.winner !== null || !editable(state, gi)) fail("O resultado deste jogo já foi registrado.");
      if (r!.champ !== null && unavailable(state, gi, r!.step).has(r!.champ)) fail("Esse campeão não está mais disponível.");
      g.actions[r!.step] = r!.champ;
      // se o draft ainda está rolando e o selecionado virou indisponível, limpa
      if (g.hover && unavailable(state, gi).has(g.hover)) g.hover = null;
      return;
    }

    case "cancelRequest": {
      const t = requireDrafter(g, cid);
      g.requests = g.requests.filter((x) => !(x.id === action.id && x.team === t));
      return;
    }

    case "movePick": {
      const t = requireDrafter(g, cid);
      if (g.status !== "done") fail("A ordem dos picks só muda depois do draft.");
      const { from, to } = action;
      if (![from, to].every((x) => Number.isInteger(x) && x >= 0 && x < 5)) fail("Posição inválida.");
      const o = [...g.order[t]];
      [o[from], o[to]] = [o[to], o[from]];
      g.order[t] = o;
      return;
    }

    case "result": {
      requireDrafter(g, cid);
      if (g.status !== "done") fail("O resultado só pode ser marcado depois do draft.");
      if (!editable(state, gi)) fail("O próximo jogo já começou; o resultado não muda mais.");
      const w = action.winner;
      if (w !== null && w !== 0 && w !== 1) fail("Time inválido.");
      g.winner = w;
      g.requests = [];
      // libera (ou recolhe) o próximo jogo
      if (w === null) {
        if (state.games[gi + 1]?.status === "lobby") state.games.splice(gi + 1);
      } else if (gi === state.games.length - 1 && g.n < state.config.games) {
        // alterna a partir do lado real deste jogo (se os drafters trocaram, a troca conta)
        state.games.push(newGame(state.config, g.n + 1, other(g.blueTeam)));
      }
      return;
    }
  }
}

// ---------------------------------------------------------------------------------------------
// Visão pública (o que vai para o navegador): sem os ids dos clientes
// ---------------------------------------------------------------------------------------------

export type SeatView = { taken: boolean; online: boolean; mine: boolean };
export type GameView = Omit<GameState, "drafters"> & { drafters: [SeatView, SeatView] };
export type RoomView = Omit<RoomState, "games"> & { games: GameView[] };

export function toView(state: RoomState, cid: string, online: (cid: string) => boolean): RoomView {
  return {
    ...state,
    games: state.games.map((g) => ({
      ...g,
      drafters: g.drafters.map((d) => ({ taken: !!d, online: !!d && online(d), mine: !!d && d === cid })) as [SeatView, SeatView],
    })),
  };
}

/** As funções de consulta aceitam tanto o estado quanto a visão. */
export type AnyGame = GameState | GameView;
export type AnyRoom = { config: RoomConfig; games: AnyGame[] };
