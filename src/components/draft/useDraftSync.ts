"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { roomPhase, type DraftAction, type Role, type RoomView, type TeamIdx } from "@/lib/draft/engine";
import type { LiveInfo } from "@/lib/draft/server";

/** `neutral`: espectador sem lado (para transmissão); não conta como espectador de nenhum time. */
export type Me = { team: TeamIdx; role: Role; neutral?: boolean };
export type SyncStatus = "loading" | "ok" | "notfound" | "expired" | "offline";
export type SyncState = { status: SyncStatus; view: RoomView | null; version: number; live: LiveInfo; offset: number };

const CID_KEY = "ingen-draft-cid";

/** Id desta aba (sessionStorage: sobrevive ao recarregar, mas cada aba é uma pessoa diferente). */
function clientId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    let id = sessionStorage.getItem(CID_KEY);
    if (!id) {
      id = (crypto.randomUUID?.() ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`).replace(/[^a-zA-Z0-9]/g, "");
      sessionStorage.setItem(CID_KEY, id);
    }
    return id;
  } catch {
    return `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  }
}

/*
 * Como a sala fica em dia gastando o mínimo de Vercel e de banco (Neon):
 *
 * 1. Tempo real (Ably), quando o servidor tem a chave: cada mudança chega pelo canal `draft:<código>`, com a
 *    sala inteira. A tela não consulta nada de tempo em tempo; só envia as próprias ações. A presença
 *    (quem está conectado, quantos assistem) também vem do Ably. Se a conexão cair e voltar sem retomar o
 *    que perdeu, a tela lê a sala uma vez.
 * 2. Reserva (sem a chave, ou com o Ably fora do ar): o esquema anterior.
 *    - "ao vivo" (só durante um draft): consulta direta a cada 1 s (drafter) ou 2 s; sem novidade, o
 *      servidor lê do banco só a versão e o prazo.
 *    - "sinal" (lobby, depois do draft, partida, fim da série): pergunta "mudou algo?" a uma resposta
 *      guardada no cache da Vercel, que não chega ao banco.
 *    - pausa total sem nenhuma mudança nem toque por 2 h (15 min num draft sem relógio parado).
 */
const LIVE_MS = { drafter: 1000, other: 2000, hidden: 5000 };
const SIGNAL_MS = { ready: 2000, result: 4000, other: 6000, hidden: 20_000 };
/** com o Ably ligado o laço só confere, sem rede, se precisa voltar para a reserva */
const RT_IDLE_MS = 3000;
export const STOP_SIGNAL_MS = 2 * 60 * 60_000;
export const STOP_UNTIMED_MS = 15 * 60_000;

const isLive = (view: RoomView | null) => !view || roomPhase(view) === "drafting";

function intervalFor(view: RoomView | null, hidden: boolean, me: Me | null) {
  if (isLive(view)) return hidden ? LIVE_MS.hidden : me?.role === "drafter" ? LIVE_MS.drafter : LIVE_MS.other;
  const last = view!.games.at(-1)!;
  // drafter pronto esperando o adversário: o draft pode começar a qualquer momento (sinal, não banco)
  if (last.status === "lobby" && me?.role === "drafter" && last.drafters[me.team].mine && last.ready[me.team]) return SIGNAL_MS.ready;
  if (hidden) return SIGNAL_MS.hidden;
  return last.status === "done" && last.winner === null ? SIGNAL_MS.result : SIGNAL_MS.other;
}

function stopAfter(view: RoomView | null) {
  if (!view) return Infinity;
  if (roomPhase(view) === "drafting") return view.config.timer > 0 ? Infinity : STOP_UNTIMED_MS;
  return STOP_SIGNAL_MS;
}

const WAKE_EVENTS = ["pointerdown", "keydown", "focus"] as const;
const NO_LIVE: LiveInfo = { spectators: [0, 0], online: [false, false] };

/** Dados de presença de cada aba no Ably. */
type PresenceData = { t: TeamIdx | null; r: Role | "none"; g: number };

type Ref = {
  version: number;
  /** visão como veio (do servidor ou do canal); a exibida passa por `normalize` */
  view: RoomView | null;
  game: number;
  me: Me | null;
  activity: number;
  dead: boolean;
  kick: null | (() => void);
  /** resumo público desta aba (vaga e presença) */
  pid: string | null;
  /** o canal está conectado e assinado: não precisa consultar */
  rtLive: boolean;
  /** presença no canal: resumo da aba → dados */
  present: Map<string, PresenceData>;
  presenceUpdate: null | (() => void);
  live: LiveInfo;
};

/**
 * Mantém a sala em dia com o servidor e envia ações. `send` devolve a mensagem de erro (ou null se deu certo).
 */
export function useDraftSync(code: string, game: number, me: Me | null) {
  const [cid] = useState(clientId);
  const [state, setState] = useState<SyncState>({ status: "loading", view: null, version: 0, live: NO_LIVE, offset: 0 });
  const [paused, setPaused] = useState(false);
  /** o servidor publica no Ably (vem na primeira resposta) */
  const [rt, setRt] = useState(false);
  const ref = useRef<Ref>({
    version: 0,
    view: null,
    game,
    me,
    activity: 0,
    dead: false,
    kick: null,
    pid: null,
    rtLive: false,
    present: new Map(),
    presenceUpdate: null,
    live: NO_LIVE,
  });

  useEffect(() => {
    ref.current.game = game;
    ref.current.me = me;
    ref.current.presenceUpdate?.();
  }, [game, me]);

  /**
   * Publica a sala na tela. Com o Ably, "é minha" e "conectado" saem do resumo da aba e da presença
   * (a sala que chega pelo canal não traz esses dados de ninguém).
   */
  const commit = useCallback((patch?: { status?: SyncStatus; offset?: number; live?: LiveInfo }) => {
    const r = ref.current;
    let view = r.view;
    let live = patch?.live ?? r.live;
    if (view && r.pid) {
      const pid = r.pid;
      view = {
        ...view,
        games: view.games.map((g) => ({
          ...g,
          drafters: g.drafters.map((s) => {
            const mine = s.mine || (!!s.id && s.id === pid);
            return { ...s, mine, online: r.rtLive ? mine || (!!s.id && r.present.has(s.id)) : s.online };
          }) as typeof g.drafters,
        })),
      };
    }
    if (r.rtLive && view) {
      const g = view.games[r.game - 1];
      const spectators: [number, number] = [0, 0];
      for (const p of r.present.values()) if (p.r === "spectator" && p.t !== null && p.g === r.game) spectators[p.t]++;
      live = { spectators, online: g ? [g.drafters[0].online, g.drafters[1].online] : [false, false] };
    }
    r.live = live;
    setState((s) => {
      const status: SyncStatus = patch?.status ?? (r.view ? "ok" : "loading");
      const nextLive = JSON.stringify(s.live) === JSON.stringify(live) ? s.live : live;
      const off = patch?.offset !== undefined && Math.abs(s.offset - patch.offset) > 250 ? patch.offset : s.offset;
      const sameView = s.version === r.version && s.view !== null && JSON.stringify(s.view) === JSON.stringify(view);
      if (s.status === status && sameView && s.live === nextLive && s.offset === off) return s;
      return { status, view: sameView ? s.view : view, version: r.version, live: nextLive, offset: off };
    });
  }, []);

  /** Consulta direta (banco): traz o estado se mudou, grava a presença e leva a ação, se houver. */
  const call = useCallback(
    async (action?: DraftAction): Promise<string | null> => {
      if (!cid) return null;
      const r = ref.current;
      const t0 = Date.now();
      if (action) r.activity = t0;
      // fora do draft (ou com o Ably, que cuida da presença) a presença no banco não interessa
      const me = action || (isLive(r.view) && !r.rtLive) ? r.me : null;
      try {
        const res = await fetch(`/api/draft/${code}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({ cid, v: r.version, game: r.game, me, action }),
        });
        const json = await res.json();
        const t1 = Date.now();
        // sala inexistente ou vencida: para de consultar de vez
        if (res.status === 404) {
          r.dead = true;
          setState((s) => ({ ...s, status: "notfound" }));
          return json.error;
        }
        if (res.status === 410) {
          r.dead = true;
          setState((s) => ({ ...s, status: "expired" }));
          return json.error;
        }
        if (!res.ok) return json.error ?? "Algo deu errado. Tente de novo.";
        if (json.pid) r.pid = json.pid;
        if (json.rt) setRt(true);
        if (json.view && json.version >= r.version) {
          if (json.version > r.version) r.activity = t1; // alguém mexeu na sala
          r.version = json.version;
          r.view = json.view;
        }
        commit({ offset: json.now - (t0 + t1) / 2, live: r.rtLive ? undefined : json.live });
        return json.error ?? null;
      } catch {
        setState((s) => ({ ...s, status: s.view ? "offline" : s.status }));
        return "Sem conexão com o servidor.";
      }
    },
    [cid, code, commit],
  );

  /** Pergunta barata (cache da Vercel): só lê a sala no banco se a versão mudou. */
  const signal = useCallback(async () => {
    const r = ref.current;
    try {
      // sem `cache: "no-store"`: ele manda "no-cache" junto e poderia furar o cache da Vercel
      const res = await fetch(`/api/draft/${code}/v`);
      if (res.status === 404 || res.status === 410) return void (await call());
      if (!res.ok) return;
      const json = (await res.json()) as { v?: number };
      // versão menor que a que já temos = resposta em cache ainda não apagada: ignora
      if (typeof json.v === "number" && json.v > r.version) await call();
      else setState((s) => (s.status === "offline" ? { ...s, status: "ok" } : s));
    } catch {
      setState((s) => ({ ...s, status: s.view ? "offline" : s.status }));
    }
  }, [code, call]);

  // ------------------------------------------------------------------------------------------
  // Tempo real (Ably)
  // ------------------------------------------------------------------------------------------
  useEffect(() => {
    if (!cid || !rt) return;
    const r = ref.current;
    let closed = false;
    let client: import("@ably/pubsub-device").PubSubClient | null = null;
    let attachedOnce = false;

    const presenceData = (): PresenceData => {
      const m = r.me;
      return m ? { t: m.team, r: m.role, g: r.game } : { t: null, r: "none", g: r.game };
    };

    (async () => {
      // carregado só quando a sala usa o Ably (fora do pacote inicial da página)
      // SDK do lado do aparelho (@ably/pubsub-device); o token traz o clientId (resumo da aba), que contas
      // cobradas por usuário ativo exigem em toda conexão de navegador
      const { createClient, WebSocketTransport, FetchRequest, RealtimePresence } = await import("@ably/pubsub-device/modular");
      if (closed) return;
      client = createClient({
        authUrl: `/api/draft/${code}/ably`,
        authMethod: "POST",
        authParams: { cid },
        plugins: { WebSocketTransport, FetchRequest, RealtimePresence },
        closeOnUnload: true,
      });
      const channel = client.channels.get(`draft:${code}`);

      const setLive = (on: boolean) => {
        if (r.rtLive === on) return;
        r.rtLive = on;
        commit();
        // voltou para a reserva: o laço consulta já
        if (!on) r.kick?.();
      };
      const readPresence = async () => {
        try {
          const members = await channel.presence.get();
          r.present = new Map(members.filter((m) => m.clientId).map((m) => [m.clientId!, m.data as PresenceData]));
          commit();
        } catch {
          /* presença indisponível: fica a última */
        }
      };

      client.connection.on((change) => {
        if (change.current !== "connected") setLive(false);
        else if (channel.state === "attached") setLive(true);
      });
      channel.on((change) => {
        if (change.current === "attached") {
          // reconectou sem retomar o que perdeu (ou é a primeira vez): lê a sala uma vez
          if (attachedOnce && !change.resumed) call();
          attachedOnce = true;
          setLive(client?.connection.state === "connected");
          readPresence();
        } else if (change.current !== "attaching") setLive(false);
      });

      await channel.subscribe("state", (msg) => {
        const d = (typeof msg.data === "string" ? JSON.parse(msg.data) : msg.data) as { v: number; room?: RoomView };
        if (!d || typeof d.v !== "number" || d.v <= r.version) return;
        if (!d.room) return void call(); // sala grande demais para a mensagem: lê direto
        r.version = d.v;
        r.view = d.room;
        r.activity = Date.now();
        commit();
      });
      await channel.presence.subscribe(() => readPresence());
      await channel.presence.enter(presenceData());
      r.presenceUpdate = () => {
        channel.presence.update(presenceData()).catch(() => {});
      };
      readPresence();
    })().catch((e) => {
      console.warn("draft: tempo real indisponível, usando consultas", e);
      r.rtLive = false;
      r.kick?.();
    });

    return () => {
      closed = true;
      r.rtLive = false;
      r.presenceUpdate = null;
      try {
        client?.close();
      } catch {
        /* já fechado */
      }
    };
  }, [cid, code, rt, call, commit]);

  // ------------------------------------------------------------------------------------------
  // Laço de consultas (reserva) e pausa
  // ------------------------------------------------------------------------------------------
  useEffect(() => {
    if (!cid) return;
    const r = ref.current;
    let stop = false;
    let sleeping = false;
    let first = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    r.activity = Date.now();

    const sleep = () => {
      sleeping = true;
      setPaused(true);
      // drafter pronto esperando o adversário: sai do "pronto", senão o draft começaria com esta tela parada
      const g = r.view?.games.at(-1);
      if (g && g.status === "lobby" && g.n === r.game && r.me?.role === "drafter" && g.drafters[r.me.team].mine && g.ready[r.me.team]) {
        call({ type: "ready", value: false });
      }
    };
    const loop = async () => {
      clearTimeout(timer);
      // a primeira leitura (e a de quem muda de jogo ou papel) é sempre direta; com o Ably no ar, nada mais
      if (first) await call();
      else if (!r.rtLive) {
        if (isLive(r.view)) await call();
        else await signal();
      }
      first = false;
      if (stop || r.dead) return;
      // com o Ably a tela não custa nada parada: só a reserva pausa
      if (!r.rtLive && Date.now() - r.activity > stopAfter(r.view)) return sleep();
      timer = setTimeout(loop, r.rtLive ? RT_IDLE_MS : intervalFor(r.view, document.hidden, r.me));
    };
    loop();
    // depois de uma ação minha (ex.: o "Pronto" que começa o draft) a próxima consulta vem logo
    r.kick = () => {
      if (stop || sleeping) return;
      clearTimeout(timer);
      timer = setTimeout(loop, 250);
    };

    const wake = () => {
      if (stop || document.hidden) return;
      r.activity = Date.now();
      if (!sleeping) return;
      sleeping = false;
      setPaused(false);
      loop();
    };
    const onVisible = () => {
      if (document.hidden || stop) return;
      if (sleeping) wake();
      else if (!r.rtLive) loop();
    };
    document.addEventListener("visibilitychange", onVisible);
    for (const e of WAKE_EVENTS) window.addEventListener(e, wake, { passive: true, capture: true });
    return () => {
      stop = true;
      r.kick = null;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      for (const e of WAKE_EVENTS) window.removeEventListener(e, wake, { capture: true });
    };
    // muda de jogo ou de papel → sincroniza na hora
  }, [cid, call, signal, game, me?.team, me?.role]);

  const send = useCallback(
    async (action: DraftAction) => {
      const err = await call(action);
      if (!ref.current.rtLive) ref.current.kick?.();
      return err;
    },
    [call],
  );

  const refresh = useCallback(() => call(), [call]);
  return { ...state, paused, cid, send, refresh, realtime: rt };
}
