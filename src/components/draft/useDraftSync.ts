"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DraftAction, Role, RoomView, TeamIdx } from "@/lib/draft/engine";
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

/** Intervalo entre sincronizações: rápido durante o draft, devagar parado ou com a aba escondida. */
function intervalFor(view: RoomView | null, hidden: boolean) {
  const drafting = view?.games.some((g) => g.status === "drafting");
  const lobby = view?.games.some((g) => g.status === "lobby");
  if (hidden) return drafting ? 4000 : 8000;
  if (drafting) return 1000;
  if (lobby) return 1500;
  return 3000;
}

/**
 * Pausa para o banco (Neon) poder dormir: cada consulta o mantém acordado, e ele só dorme depois de
 * 5 minutos sem nenhuma. Sem atividade na sala (clique, tecla, alguém mudando algo) por este tempo, a
 * tela para de consultar; qualquer toque na tela volta a atualizar.
 * - draft concluído / série encerrada: 3 min (dá tempo de reorganizar e pedir correção);
 * - esperando o próximo jogo (lobby) ou draft sem relógio parado: 15 min;
 * - draft com relógio correndo: nunca (o tempo de cada ação precisa chegar a todos).
 */
export const IDLE_DONE_MS = 3 * 60_000;
export const IDLE_WAIT_MS = 15 * 60_000;

function pauseAfter(view: RoomView | null): number {
  const g = view?.games.at(-1);
  if (!g) return Infinity;
  if (g.status === "drafting") return view!.config.timer > 0 ? Infinity : IDLE_WAIT_MS;
  if (g.status === "lobby") return IDLE_WAIT_MS;
  return IDLE_DONE_MS;
}

const WAKE_EVENTS = ["pointerdown", "keydown", "focus"] as const;

/**
 * Mantém a sala em dia com o servidor (consulta periódica com a versão que já temos) e envia ações.
 * `send` devolve a mensagem de erro (ou null se deu certo).
 */
export function useDraftSync(code: string, game: number, me: Me | null) {
  const [cid] = useState(clientId);
  const [state, setState] = useState<SyncState>({ status: "loading", view: null, version: 0, live: { spectators: [0, 0], online: [false, false] }, offset: 0 });
  const [paused, setPaused] = useState(false);
  const ref = useRef({ version: 0, view: null as RoomView | null, game, me, activity: 0 });

  useEffect(() => {
    ref.current.game = game;
    ref.current.me = me;
  }, [game, me]);

  const call = useCallback(
    async (action?: DraftAction): Promise<string | null> => {
      if (!cid) return null;
      const r = ref.current;
      const t0 = Date.now();
      if (action) r.activity = t0;
      try {
        const res = await fetch(`/api/draft/${code}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({ cid, v: r.version, game: r.game, me: r.me, action }),
        });
        const json = await res.json();
        const t1 = Date.now();
        if (res.status === 404) {
          setState((s) => ({ ...s, status: "notfound" }));
          return json.error;
        }
        if (res.status === 410) {
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

  useEffect(() => {
    if (!cid) return;
    const r = ref.current;
    let stop = false;
    let sleeping = false;
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
      await call();
      if (stop) return;
      if (Date.now() - r.activity > pauseAfter(r.view)) return sleep();
      timer = setTimeout(loop, intervalFor(r.view, document.hidden));
    };
    loop();

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
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      for (const e of WAKE_EVENTS) window.removeEventListener(e, wake, { capture: true });
    };
    // muda de jogo ou de papel → sincroniza na hora (presença nova)
  }, [cid, call, game, me?.team, me?.role]);

  return { ...state, paused, cid, send: call, refresh: () => call() };
}
