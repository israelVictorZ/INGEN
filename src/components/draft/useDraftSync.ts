"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { roomPhase, type DraftAction, type Role, type RoomView, type TeamIdx } from "@/lib/draft/engine";
import type { LiveInfo } from "@/lib/draft/server";

export type Me = { team: TeamIdx; role: Role };
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
 * Como a sala fica em dia gastando o mínimo do banco (Neon), que só dorme depois de 5 min sem consulta:
 *
 * - "ao vivo" (só enquanto um draft está acontecendo): consulta direta a cada 1 s (drafter) ou 1,5 s.
 *   Quando nada mudou, o servidor lê do banco só a versão e o prazo, sem o estado inteiro.
 * - "sinal" (todo o resto: lobby, depois do draft, durante a partida, fim da série): a tela só pergunta
 *   "mudou algo?" a uma resposta guardada no cache da Vercel, que não chega ao banco. Quem age (pronto,
 *   vencedor, correção…) grava no banco e apaga essa resposta; as outras telas percebem em poucos segundos
 *   e aí sim leem a sala. Assim o banco fica dormindo no lobby até os dois darem "Pronto" e durante a
 *   partida até alguém marcar o vencedor.
 * - pausa total: sem nenhuma mudança nem toque na tela por 2 h (ou 15 min num draft sem relógio parado),
 *   a tela para de perguntar; qualquer toque volta.
 */
// Cada consulta conta como requisição na Vercel (o Hobby inclui 1 milhão por mês para o site todo):
// com até 14 telas por série, o intervalo dos espectadores e o da espera pelo vencedor pesam mais.
const LIVE_MS = { drafter: 1000, other: 2000, hidden: 5000 };
const SIGNAL_MS = { ready: 2000, result: 4000, other: 6000, hidden: 20_000 };
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

/**
 * Mantém a sala em dia com o servidor e envia ações. `send` devolve a mensagem de erro (ou null se deu certo).
 */
export function useDraftSync(code: string, game: number, me: Me | null) {
  const [cid] = useState(clientId);
  const [state, setState] = useState<SyncState>({ status: "loading", view: null, version: 0, live: { spectators: [0, 0], online: [false, false] }, offset: 0 });
  const [paused, setPaused] = useState(false);
  const ref = useRef({ version: 0, view: null as RoomView | null, game, me, activity: 0, dead: false, kick: null as null | (() => void) });

  useEffect(() => {
    ref.current.game = game;
    ref.current.me = me;
  }, [game, me]);

  /** Consulta direta (banco): traz o estado se mudou, grava a presença e leva a ação, se houver. */
  const call = useCallback(
    async (action?: DraftAction): Promise<string | null> => {
      if (!cid) return null;
      const r = ref.current;
      const t0 = Date.now();
      if (action) r.activity = t0;
      // fora do draft a presença não interessa (e gravá-la acordaria o banco à toa)
      const me = action || isLive(r.view) ? r.me : null;
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
        if (json.view && json.version >= r.version) {
          if (json.version > r.version) r.activity = t1; // alguém mexeu na sala
          r.version = json.version;
          r.view = json.view;
        }
        const offset = json.now - (t0 + t1) / 2;
        setState({ status: r.view ? "ok" : "loading", view: r.view, version: r.version, live: json.live, offset });
        return json.error ?? null;
      } catch {
        setState((s) => ({ ...s, status: s.view ? "offline" : s.status }));
        return "Sem conexão com o servidor.";
      }
    },
    [cid, code],
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
      // a primeira leitura (e a de quem muda de jogo ou papel) é sempre direta
      if (first || isLive(r.view)) await call();
      else await signal();
      first = false;
      if (stop || r.dead) return;
      if (Date.now() - r.activity > stopAfter(r.view)) return sleep();
      timer = setTimeout(loop, intervalFor(r.view, document.hidden, r.me));
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
      else loop();
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
      ref.current.kick?.();
      return err;
    },
    [call],
  );

  return { ...state, paused, cid, send, refresh: () => call() };
}
