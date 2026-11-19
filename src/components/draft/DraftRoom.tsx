"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { championIcon, championSplash } from "@/lib/ddragon-urls";
import type { DraftChampion, DraftChampionData } from "@/lib/draft/lanes";
import {
  GRACE_MS,
  STEPS,
  actingTeam,
  currentStep,
  fearlessLocked,
  other,
  seriesResult,
  score,
  sideOf,
  slotChamp,
  stepIndex,
  teamOnSide,
  unavailable,
  type DraftAction,
  type GameView,
  type RoomView,
  type Side,
  type TeamIdx,
} from "@/lib/draft/engine";
import { SIDE_COLOR, teamColor, teamLogo, teamLogoTone, themeFor, themeVars } from "@/lib/draft/theme";
import { LaneIcon } from "@/components/brand/LaneIcon";
import { DRAFT_LANES } from "@/lib/draft/lanes";
import { BAN_SLASH, ChampionPicker, LANE_LABEL, LogoPlate, type ChampStatus } from "./shared";
import { useDraftSync, type Me } from "./useDraftSync";

// ---------------------------------------------------------------------------------------------
// Papéis por jogo (sessionStorage da aba): a cada jogo todo mundo escolhe de novo
// ---------------------------------------------------------------------------------------------

const rolesKey = (code: string) => `ingen-draft:${code}:roles`;
function loadRoles(code: string): Record<number, Me> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(sessionStorage.getItem(rolesKey(code)) ?? "{}");
  } catch {
    return {};
  }
}
function saveRoles(code: string, roles: Record<number, Me>) {
  try {
    sessionStorage.setItem(rolesKey(code), JSON.stringify(roles));
  } catch {
    /* sem storage: vale só enquanto a aba estiver aberta */
  }
}
function readGameParam(): number | null {
  if (typeof window === "undefined") return null;
  const n = Number(new URLSearchParams(window.location.search).get("jogo"));
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;
}

const slotLabel = (step: number) => {
  const s = STEPS[step];
  return `${s.type === "ban" ? "Ban" : "Pick"} ${s.slot + 1}`;
};

/** Relógio local acertado com o do servidor; só fica batendo enquanto `active`. */
function useServerNow(offset: number, active: boolean) {
  const [now, setNow] = useState(() => Date.now() + offset);
  useEffect(() => {
    if (!active) return;
    const tick = () => setNow(Date.now() + offset);
    const id = setInterval(tick, 200);
    const first = setTimeout(tick, 0);
    return () => {
      clearInterval(id);
      clearTimeout(first);
    };
  }, [offset, active]);
  return now;
}

// ---------------------------------------------------------------------------------------------

export function DraftRoom({ code, data }: { code: string; data: DraftChampionData }) {
  const [gameParam, setGameParam] = useState<number | null>(readGameParam);
  const [roles, setRoles] = useState<Record<number, Me>>(() => loadRoles(code));
  const [latest, setLatest] = useState(1);

  // jogo exibido: o da URL ou, na primeira carga, o mais recente (depois só muda pelas abas/botões)
  const n = Math.min(gameParam ?? latest, latest);
  const me = roles[n] ?? null;
  const sync = useDraftSync(code, n, me?.neutral ? null : me);
  const view = sync.view;
  const seen = view?.games.length ?? 1;
  if (view && seen !== latest) setLatest(seen);
  if (view && gameParam === null) setGameParam(seen);
  if (view && gameParam !== null && gameParam > seen) setGameParam(seen);

  if (sync.status === "notfound") return <FullMessage title="Sala não encontrada" text="Confira o link. Ele pode ter sido digitado errado." />;
  if (sync.status === "expired") return <FullMessage title="Link expirado" text="As salas de draft ficam abertas por 32 horas. Crie uma nova para a próxima série." />;
  if (!view) return <FullMessage title="Carregando o draft…" text="" loading />;

  return (
    <Room
      key={n}
      code={code}
      data={data}
      view={view}
      n={n}
      me={me}
      sync={sync}
      setGame={(k) => {
        setGameParam(k);
        window.history.replaceState(null, "", `?jogo=${k}`);
      }}
      setMe={(m) => {
        const next = { ...roles };
        if (m) next[n] = m;
        else delete next[n];
        setRoles(next);
        saveRoles(code, next);
      }}
      lastTeam={lastTeamOf(roles)}
    />
  );
}

function lastTeamOf(roles: Record<number, Me>): TeamIdx | null {
  const keys = Object.keys(roles).map(Number).sort((a, b) => b - a);
  return keys.length ? roles[keys[0]].team : null;
}

function FullMessage({ title, text, loading }: { title: string; text: string; loading?: boolean }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-bg-0 px-6 text-center">
      {loading ? <span className="size-8 animate-spin rounded-full border-2 border-white/15 border-t-green" /> : null}
      <h1 className="font-display text-4xl font-black uppercase text-white">{title}</h1>
      {text && <p className="max-w-md text-gray">{text}</p>}
      {!loading && (
        <Link href="/draft" className="clip-step-sm mt-2 bg-bg-3 px-5 py-3 font-mono text-[0.72rem] uppercase tracking-[0.16em] text-white hover:bg-white hover:text-bg-0">
          Criar uma sala →
        </Link>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------

type SyncApi = ReturnType<typeof useDraftSync>;

function Room({
  code,
  data,
  view,
  n,
  me,
  sync,
  setGame,
  setMe,
  lastTeam,
}: {
  code: string;
  data: DraftChampionData;
  view: RoomView;
  n: number;
  me: Me | null;
  sync: SyncApi;
  setGame: (n: number) => void;
  setMe: (m: Me | null) => void;
  lastTeam: TeamIdx | null;
}) {
  const cfg = view.config;
  const gi = n - 1;
  const g = view.games[gi];
  const isLatest = gi === view.games.length - 1;
  const byId = useMemo(() => new Map(data.champions.map((c) => [c.id, c])), [data.champions]);

  const amDrafter = !!me && me.role === "drafter" && g.drafters[me.team].mine;
  const myT: TeamIdx | null = amDrafter ? me!.team : null;
  const lostSeat = !!me && me.role === "drafter" && !g.drafters[me.team].mine && isLatest;
  const step = currentStep(g);
  const acting = actingTeam(g);
  const myTurn = myT !== null && acting === myT;

  const neutral = !!me?.neutral;
  const themeTeam = neutral ? null : (me?.team ?? lastTeam);
  const theme = themeFor(code, themeTeam !== null ? cfg.teams[themeTeam] : null, themeTeam ?? 0);

  // seleção local (antes de confirmar) e modo de correção
  const [sel, setSel] = useState<string | null>(null);
  const [correcting, setCorrecting] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [selStep, setSelStep] = useState(g.step);
  if (selStep !== g.step) {
    setSelStep(g.step);
    if (correcting === null) setSel(null);
  } else if (!myTurn && sel !== null && correcting === null) setSel(null);
  // chegou a minha vez no meio de uma correção: a vez tem prioridade (o pedido pode ser feito depois)
  if (myTurn && correcting !== null) {
    setCorrecting(null);
    setSel(null);
    setToast("Sua vez! O pedido de troca ficou para depois.");
  }

  const { send: syncSend, refresh } = sync;
  const send = useCallback(
    async (a: DraftAction) => {
      const err = await syncSend(a);
      if (err) setToast(err);
      return err;
    },
    [syncSend],
  );
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(id);
  }, [toast]);

  // disponibilidade
  const disabledSet = useMemo(() => new Set(cfg.disabled), [cfg.disabled]);
  const fearless = useMemo(() => fearlessLocked(view, gi), [view, gi]);
  const fearlessSet = useMemo(() => new Set(fearless.map((f) => f.champ)), [fearless]);
  const usedSet = useMemo(() => unavailable(view, gi, correcting ?? undefined), [view, gi, correcting]);
  const statusOf = useCallback(
    (id: string): ChampStatus => (disabledSet.has(id) ? "disabled" : fearlessSet.has(id) ? "fearless" : usedSet.has(id) ? "used" : "ok"),
    [disabledSet, fearlessSet, usedSet],
  );

  const canPickNow = myTurn || correcting !== null;
  const gStep = g.step;
  const onPick = useCallback(
    (id: string | null) => {
      if (correcting !== null) {
        setSel(id ?? "");
        return;
      }
      if (!myTurn) return;
      setSel(id ?? "");
      send({ type: "hover", champ: id, step: gStep });
    },
    [correcting, myTurn, send, gStep],
  );
  const isSelected = useCallback((id: string) => sel === id, [sel]);
  const lock = async () => {
    if (sel === null || !step) return;
    await send({ type: "lock", champ: sel || null, step: g.step });
    setSel(null);
  };
  const sendCorrection = async () => {
    if (correcting === null || sel === null) return;
    const err = await send({ type: "request", step: correcting, champ: sel || null });
    if (!err) {
      setCorrecting(null);
      setSel(null);
    }
  };

  // preview do slot ativo: a minha seleção local ou o que o drafter da vez selecionou
  const preview = myTurn && correcting === null ? sel || null : g.hover;
  const result = seriesResult(view);
  const [a, b] = score(view);
  const showJoin = isLatest && g.winner === null && (!me || lostSeat);
  const [flashing, setFlashing] = useState(false);
  const [sawOpen, setSawOpen] = useState(g.winner === null);
  if (g.winner === null && !sawOpen) setSawOpen(true);
  // o vencedor acabou de chegar: segura a tela de campeão já neste render (a animação libera no momento combinado)
  const [flashFor, setFlashFor] = useState<number | null>(null);
  if (sawOpen && g.winner !== null && g.wonAt && flashFor !== g.wonAt) {
    setFlashFor(g.wonAt);
    setFlashing(true);
  }
  const [editNames, setEditNames] = useState(false);

  const blueT = teamOnSide(g, "blue");
  const redT = teamOnSide(g, "red");

  const startCorrection = (s: number | null) => {
    setCorrecting(s);
    setSel(null);
  };
  const common = { code, cfg, g, byId, version: data.version, preview, myT, myTurn, correcting, setCorrecting: startCorrection };

  return (
    <div
      className="relative flex min-h-dvh flex-col overflow-x-hidden text-white-dim lg:h-dvh lg:overflow-hidden"
      style={{
        ...themeVars(theme),
        background: `radial-gradient(ellipse 80% 55% at 50% -5%, color-mix(in srgb, var(--d-accent) 10%, transparent), transparent 70%), var(--d-bg)`,
      }}
    >
      <DraftBackdrop blue={teamColor(cfg.teams[blueT])} red={teamColor(cfg.teams[redT])} neutral={neutral} />
      {theme.logo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={theme.logo} alt="" aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 w-[38vmin] -translate-x-1/2 -translate-y-1/2 select-none opacity-[0.045]" />
      )}

      {/* topo */}
      <header className="relative z-10 grid grid-cols-2 items-center gap-x-3 gap-y-2 lg:grid-cols-[1fr_auto_1fr] px-3 pt-3 lg:px-4">
        <TeamHeader code={code} cfg={cfg} team={blueT} side="blue" wins={blueT === 0 ? a : b} live={g.status === "drafting"} online={sync.live.online[blueT]} spectators={sync.live.spectators[blueT]} taken={g.drafters[blueT].taken} ready={g.ready[blueT]} onEditNames={myT === blueT ? () => setEditNames(true) : undefined} />
        <div className="order-first col-span-2 flex flex-col items-center gap-1.5 lg:order-none lg:col-span-1">
          <GameTabs total={cfg.games} available={view.games} n={n} setGame={setGame} />
          <PhaseLine g={g} timer={cfg.timer} cfg={cfg} offset={sync.offset} onTimeout={refresh} eager={myT !== null} />
        </div>
        <TeamHeader code={code} cfg={cfg} team={redT} side="red" wins={redT === 0 ? a : b} live={g.status === "drafting"} online={sync.live.online[redT]} spectators={sync.live.spectators[redT]} taken={g.drafters[redT].taken} ready={g.ready[redT]} onEditNames={myT === redT ? () => setEditNames(true) : undefined} />
      </header>

      {/* meio: picks | seletor | picks */}
      <div className="relative z-10 grid min-h-0 flex-1 grid-cols-2 gap-3 p-3 lg:grid-cols-[minmax(190px,19vw)_1fr_minmax(190px,19vw)] lg:px-4">
        <PickColumn side="blue" {...common} send={send} />
        {/* no celular a altura de 70% é para a grade de campeões; com o draft encerrado o painel fica do tamanho do conteúdo */}
        <div className={`order-3 col-span-2 flex flex-col lg:order-none lg:col-span-1 lg:min-h-0 ${g.status === "done" && correcting === null ? "" : "min-h-[70vh]"}`}>
          <Requests g={g} cfg={cfg} myT={myT} send={send} byId={byId} />
          <div className="relative flex min-h-0 flex-1 flex-col border border-[var(--d-line)] bg-black/60 p-3">
            {g.status === "done" && correcting === null ? (
              <DonePanel g={g} cfg={cfg} code={code} view={view} n={n} myT={myT} send={send} setGame={setGame} byId={byId} version={data.version} />
            ) : (
              <ChampionPicker
                champions={data.champions}
                version={data.version}
                statusOf={statusOf}
                selected={isSelected}
                onPick={onPick}
                canPick={canPickNow}
                noneTile={(correcting !== null ? STEPS[correcting].type : step?.type) === "ban" && canPickNow ? "Sem ban" : undefined}
                className="h-full"
              />
            )}
            {g.status === "lobby" && <LobbyPanel g={g} cfg={cfg} code={code} myT={myT} send={send} />}
          </div>
          {fearless.length > 0 && <FearlessStrip list={fearless} cfg={cfg} byId={byId} version={data.version} />}
        </div>
        <PickColumn side="red" {...common} send={send} />
      </div>

      {/* bans + ação */}
      <footer className="relative z-10 grid gap-3 px-3 pb-3 lg:grid-cols-[1fr_auto_1fr] lg:items-center lg:px-4">
        <BanRow side="blue" {...common} />
        <div className="order-first flex min-w-[16rem] flex-col items-center gap-1 lg:order-none">
          <ActionBar
            g={g}
            cfg={cfg}
            myT={myT}
            myTurn={myTurn}
            sel={sel}
            byId={byId}
            correcting={correcting}
            lock={lock}
            sendCorrection={sendCorrection}
            cancelCorrection={() => startCorrection(null)}
            isLatest={isLatest}
          />
          <RoleLine code={code} me={me} cfg={cfg} canChange={isLatest && (g.winner === null || neutral) && !!me} onChange={() => setMe(null)} />
        </div>
        <BanRow side="red" {...common} />
      </footer>

      {toast && (
        <div role="status" className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 border border-loss/50 bg-black/90 px-4 py-2.5 text-sm text-white shadow-xl">
          {toast}
        </div>
      )}
      {sync.status === "offline" && !sync.paused && (
        <div className="fixed left-1/2 top-2 z-50 -translate-x-1/2 bg-loss px-3 py-1 font-mono text-[0.7rem] uppercase tracking-[0.14em] text-white">Reconectando…</div>
      )}
      {sync.paused && (
        // qualquer toque na tela já volta a atualizar (useDraftSync); o botão só deixa isso claro
        <button
          type="button"
          className="fixed left-1/2 top-2 z-50 flex -translate-x-1/2 items-center gap-2 border border-[var(--d-line)] bg-black/85 px-3 py-1.5 font-mono text-[0.68rem] uppercase tracking-[0.14em] text-white-dim shadow-xl hover:text-white"
        >
          <span className="size-1.5 rounded-full bg-gray" aria-hidden />
          Sala em pausa · toque para atualizar
        </button>
      )}

      {editNames && myT !== null && <NamesModal cfg={cfg} team={myT} send={send} onClose={() => setEditNames(false)} />}
      {showJoin && <JoinModal code={code} cfg={cfg} g={g} live={sync.live} lostSeat={lostSeat} send={send} setMe={setMe} lastTeam={lastTeam} />}
      {sawOpen && g.winner !== null && g.wonAt ? (
        <WinnerFlash
          key={g.wonAt}
          code={code}
          cfg={cfg}
          g={g}
          score={[a, b]}
          offset={sync.offset}
          setBusy={setFlashing}
          silent={result.clinched || result.over}
          // todas as telas seguem juntas para o próximo jogo (se a série já está decidida, fica a tela de campeão)
          onDone={() => {
            if (view.games[n] && !result.clinched) setGame(n + 1);
          }}
        />
      ) : null}
      {!showJoin && !flashing && (result.clinched || result.over) && <Victory code={code} cfg={cfg} view={view} result={result} score={[a, b]} setGame={setGame} />}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Topo
// ---------------------------------------------------------------------------------------------

function TeamHeader({
  code,
  cfg,
  team,
  side,
  wins,
  live,
  online,
  spectators,
  taken,
  ready,
  onEditNames,
}: {
  code: string;
  cfg: RoomView["config"];
  team: TeamIdx;
  side: Side;
  wins: number;
  onEditNames?: () => void;
  /** durante o draft há presença ao vivo; fora dele as telas não gravam presença (o banco dorme) */
  live: boolean;
  online: boolean;
  spectators: number;
  taken: boolean;
  ready: boolean;
}) {
  const t = cfg.teams[team];
  const color = teamColor(t);
  const right = side === "red";
  return (
    <div className={`flex min-w-0 animate-[draft-rise_.6s_var(--ease-out-expo)] items-center gap-3 ${right ? "flex-row-reverse text-right" : ""}`}>
      <LogoPlate src={teamLogo(code, t, team)} tone={teamLogoTone(t)} color={color} size={52} className="max-sm:!size-10" />
      <div className="min-w-0">
        <p className="font-mono text-[0.62rem] uppercase tracking-[0.18em]" style={{ color: SIDE_COLOR[side] }}>
          {side === "blue" ? "Lado azul" : "Lado vermelho"}
        </p>
        <p className="truncate font-display text-xl font-black uppercase leading-tight text-white sm:text-2xl lg:text-3xl" style={{ textShadow: `0 0 24px ${color}55` }}>
          {t.name}
        </p>
        <p className={`flex items-center gap-2 font-mono text-[0.62rem] uppercase tracking-[0.12em] text-gray ${right ? "justify-end" : ""}`}>
          {live ? (
            <span className="inline-flex items-center gap-1" title={taken ? (online ? "Drafter conectado" : "Drafter desconectado") : "Sem drafter"}>
              <span className={`size-1.5 rounded-full ${taken && online ? "bg-green" : taken ? "bg-loss" : "bg-white/25"}`} />
              drafter
            </span>
          ) : (
            <span className="inline-flex items-center gap-1">
              <span className={`size-1.5 rounded-full ${taken ? "bg-white/60" : "bg-white/25"}`} />
              {taken ? (ready ? "drafter pronto" : "drafter na vaga") : "sem drafter"}
            </span>
          )}
          {live && spectators > 0 && <span>· {spectators} assistindo</span>}
          {onEditNames && (
            <button type="button" onClick={onEditNames} className="text-white-dim underline-offset-2 hover:text-white hover:underline">
              ✎ nomes
            </button>
          )}
        </p>
      </div>
      {cfg.games > 1 && (
        <span className={`font-display text-3xl font-black tabular-nums lg:text-4xl ${right ? "mr-auto" : "ml-auto"}`} style={{ color }}>
          {wins}
        </span>
      )}
    </div>
  );
}

function GameTabs({ total, available, n, setGame }: { total: number; available: GameView[]; n: number; setGame: (n: number) => void }) {
  if (total < 2) return <p className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-gray">Jogo único</p>;
  return (
    <nav className="flex gap-1" aria-label="Jogos da série">
      {Array.from({ length: total }, (_, i) => {
        const k = i + 1;
        const g = available[i];
        const on = k === n;
        return (
          <button
            key={k}
            type="button"
            disabled={!g}
            onClick={() => setGame(k)}
            aria-current={on ? "page" : undefined}
            className={`border px-2.5 py-1 font-mono text-[0.65rem] uppercase tracking-[0.12em] transition-colors ${
              on ? "border-[var(--d-accent)] text-white" : g ? "border-[var(--d-line)] text-gray hover:text-white" : "border-transparent text-white/20"
            }`}
            title={g ? (g.winner !== null ? "Jogo encerrado" : "Jogo em andamento") : "Liberado depois do resultado do jogo anterior"}
          >
            {!g && "🔒 "}Jogo {k}
            {g?.winner !== null && g?.winner !== undefined && " ✓"}
          </button>
        );
      })}
    </nav>
  );
}

function PhaseLine({
  g,
  timer,
  cfg,
  offset,
  onTimeout,
  eager,
}: {
  g: GameView;
  timer: number;
  cfg: RoomView["config"];
  offset: number;
  onTimeout: () => void;
  /** drafter: pede o fechamento do passo assim que o prazo vence; as outras telas só se ninguém fechou em 3 s */
  eager: boolean;
}) {
  // o relógio bate aqui dentro (5 vezes por segundo) sem re-renderizar a sala inteira
  const now = useServerNow(offset, g.status === "drafting" && g.deadline !== null);
  const remaining = g.deadline !== null ? Math.min(timer, Math.max(0, Math.ceil((g.deadline - now) / 1000))) : null;
  const kicked = useRef(-1);
  const timeout = useRef(onTimeout);
  useEffect(() => {
    timeout.current = onTimeout;
  });
  useEffect(() => {
    // o prazo passou: pede ao servidor para fechar a ação (sem esperar a próxima consulta)
    if (g.status === "drafting" && g.deadline !== null && now > g.deadline + GRACE_MS + (eager ? 250 : 3000) && kicked.current !== g.step) {
      kicked.current = g.step;
      timeout.current();
    }
  }, [now, g.status, g.deadline, g.step, eager]);
  const step = currentStep(g);
  if (!step) {
    const text = g.status === "lobby" ? "Aguardando os drafters" : g.winner !== null ? `Vitória de ${cfg.teams[g.winner].name}` : "Draft encerrado";
    return (
      <p key={text} className="animate-[draft-rise_.5s_var(--ease-out-expo)] font-mono text-[0.72rem] uppercase tracking-[0.16em] text-white-dim">
        {text}
      </p>
    );
  }
  const color = SIDE_COLOR[step.side];
  const pct = remaining !== null && timer > 0 ? Math.min(100, (remaining / timer) * 100) : 100;
  return (
    <div className="flex w-[min(22rem,80vw)] lg:w-[min(22rem,40vw)] flex-col items-center gap-1">
      <p key={g.step} className="animate-[draft-rise_.45s_var(--ease-out-expo)] font-mono text-[0.68rem] uppercase tracking-[0.16em]" style={{ color }}>
        {step.type === "ban" ? `Bans fase ${step.phase}` : `Picks fase ${step.phase}`} · {step.side === "blue" ? "Azul" : "Vermelho"} {step.type === "ban" ? "bane" : "escolhe"}
      </p>
      <p className={`font-display text-4xl font-black tabular-nums leading-none ${remaining !== null && remaining <= 5 ? "text-loss" : "text-white"}`}>
        {remaining ?? "∞"}
      </p>
      <span className="h-1 w-full overflow-hidden bg-white/10">
        <span className="block h-full transition-[width] duration-200 ease-linear" style={{ width: `${pct}%`, background: remaining !== null && remaining <= 5 ? "#ff4d5e" : color }} />
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Fundo e nomes
// ---------------------------------------------------------------------------------------------

/** Fundo com as cores dos dois times (lado azul à esquerda, vermelho à direita), no estilo do kit de stream. */
function DraftBackdrop({ blue, red, neutral }: { blue: string; red: string; neutral?: boolean }) {
  return (
    <div className="draft-backdrop" aria-hidden>
      <div className="draft-half draft-half--blue" style={{ "--team": blue } as React.CSSProperties} />
      <div className="draft-half draft-half--red" style={{ "--team": red } as React.CSSProperties} />
      <div className="draft-seam" />
      <div className="draft-dots" />
      <div className="draft-vignette" />
      {/* neutro por cima da vinheta: as cores dos dois times chegam fortes até o meio */}
      {neutral && <div className="draft-neutral" style={{ "--blue": blue, "--red": red } as React.CSSProperties} />}
    </div>
  );
}

/** Nomes dos jogadores por lane (opcional), editados pelo drafter do time. Valem para a série toda. */
function NamesModal({ cfg, team, send, onClose }: { cfg: RoomView["config"]; team: TeamIdx; send: (a: DraftAction) => Promise<string | null>; onClose: () => void }) {
  const [names, setNames] = useState(() => Array.from({ length: 5 }, (_, k) => cfg.teams[team].players[k] ?? ""));
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    const err = await send({ type: "players", names });
    setBusy(false);
    if (!err) onClose();
  }
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="clip-step my-auto w-full max-w-md animate-[draft-rise_.4s_var(--ease-out-expo)] bg-bg-2 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <p className="label-mono">{cfg.teams[team].name}</p>
        <h2 className="mt-2 font-display text-3xl font-black uppercase text-white">Jogadores por lane</h2>
        <p className="mt-1 text-sm text-gray">Opcional. Aparece nos slots de pick e vale para os próximos jogos da série.</p>
        <div className="mt-5 grid gap-2">
          {DRAFT_LANES.map((l, k) => (
            <label key={l} className="grid grid-cols-[1.5rem_5rem_1fr] items-center gap-2">
              <LaneIcon role={l} className="size-5" />
              <span className="text-xs text-gray">{LANE_LABEL[l]}</span>
              <input
                value={names[k]}
                maxLength={24}
                onChange={(e) => setNames((n) => n.map((x, j) => (j === k ? e.target.value : x)))}
                placeholder="Nome (opcional)"
                className="w-full border border-line bg-bg-0 px-3 py-1.5 text-sm text-white placeholder:text-gray-dim focus:border-green focus:outline-none"
              />
            </label>
          ))}
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-3 font-mono text-[0.7rem] uppercase tracking-[0.14em] text-gray hover:text-white">
            Cancelar
          </button>
          <BigButton onClick={save} disabled={busy}>
            Salvar
          </BigButton>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Slots
// ---------------------------------------------------------------------------------------------

type SlotProps = {
  code: string;
  cfg: RoomView["config"];
  g: GameView;
  byId: Map<string, DraftChampion>;
  version: string;
  preview: string | null;
  myT: TeamIdx | null;
  myTurn: boolean;
  correcting: number | null;
  setCorrecting: (s: number | null) => void;
};

/** Pode pedir troca deste slot? (drafter do time, ação já feita, resultado ainda não marcado, fora da própria vez) */
const canCorrect = (g: GameView, myT: TeamIdx | null, myTurn: boolean, side: Side, stepIdx: number) =>
  !myTurn && myT !== null && sideOf(g, myT) === side && stepIdx < g.actions.length && g.winner === null && g.status !== "lobby";

function PickColumn({ side, cfg, g, byId, preview, myT, myTurn, correcting, setCorrecting, send }: SlotProps & { side: Side; send: (a: DraftAction) => Promise<string | null> }) {
  const team = teamOnSide(g, side);
  const right = side === "red";
  const order = g.order[team];
  const canMove = myT === team && g.status === "done" && g.winner === null;
  return (
    <div className={`flex min-h-0 flex-col gap-2 ${right ? "order-2 lg:order-none" : "order-1 lg:order-none"}`}>
      {order.map((slot, pos) => {
        const champ = slotChamp(g, side, "pick", slot);
        const idx = stepIndex(side, "pick", slot);
        const active = g.status === "drafting" && g.step === idx;
        const shown = champ ?? (active ? preview : null);
        const c = shown ? byId.get(shown) : undefined;
        const lane = DRAFT_LANES[pos];
        const player = cfg.teams[team].players[pos]?.trim();
        const fixing = correcting === idx;
        return (
          <div
            key={pos}
            className={`group relative min-h-[64px] flex-1 overflow-hidden border bg-black/40 transition-[border-color,box-shadow] ${
              active || fixing ? "z-[1]" : ""
            }`}
            style={{
              borderColor: active || fixing ? SIDE_COLOR[side] : "var(--d-line)",
              boxShadow: active ? `0 0 0 1px ${SIDE_COLOR[side]}, 0 0 28px ${SIDE_COLOR[side]}55` : undefined,
            }}
          >
            {c && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={c.id}
                src={championSplash(c.id)}
                alt=""
                className={`absolute inset-0 size-full object-cover object-[50%_22%] ${champ ? "animate-[draft-in_.45s_var(--ease-out-expo)]" : "opacity-45 grayscale-[.4]"}`}
                draggable={false}
              />
            )}
            <span
              className="absolute inset-0"
              style={{ background: `linear-gradient(${right ? "270deg" : "90deg"}, rgb(0 0 0 / .85), rgb(0 0 0 / .1) 70%), linear-gradient(0deg, ${SIDE_COLOR[side]}22, transparent 60%)` }}
            />
            {active && (
              <>
                <span className="absolute inset-0 animate-pulse" style={{ background: `${SIDE_COLOR[side]}12` }} />
                <span
                  className="pointer-events-none absolute inset-y-0 left-0 w-1/2 animate-[draft-shine_1.8s_ease-in-out_infinite]"
                  style={{ background: `linear-gradient(90deg, transparent, ${SIDE_COLOR[side]}30, transparent)` }}
                />
              </>
            )}
            <div className={`relative flex h-full flex-col justify-end p-2.5 ${right ? "items-end text-right" : ""}`}>
              <p className={`flex items-center gap-1.5 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-white/60 ${right ? "flex-row-reverse" : ""}`} title={LANE_LABEL[lane]}>
                <LaneIcon role={lane} className="size-3.5 shrink-0 opacity-80" />
                <span className="truncate">{player || LANE_LABEL[lane]}</span>
              </p>
              <p className="font-display text-lg font-black uppercase leading-none text-white lg:text-2xl">
                {c ? c.name : champ === null ? <span className="text-white/35">Sem campeão</span> : active ? <span className="text-white/45">Escolhendo…</span> : ""}
              </p>
            </div>
            <div className={`absolute top-1.5 flex gap-1 opacity-80 transition-opacity group-hover:opacity-100 ${right ? "left-1.5" : "right-1.5"}`}>
              {/* levar o campeão direto para outra lane (troca com quem está lá) */}
              {canMove &&
                DRAFT_LANES.map((l, k) =>
                  k === pos ? null : (
                    <SlotButton key={l} label={`Levar para ${LANE_LABEL[l]}`} onClick={() => send({ type: "movePick", from: pos, to: k })}>
                      <LaneIcon role={l} className="size-3.5" />
                    </SlotButton>
                  ),
                )}
              {canCorrect(g, myT, myTurn, side, idx) && (
                <SlotButton label="Pedir troca deste pick" onClick={() => setCorrecting(fixing ? null : idx)} active={fixing}>
                  ✎
                </SlotButton>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SlotButton({ label, onClick, children, active }: { label: string; onClick: () => void; children: React.ReactNode; active?: boolean }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`flex size-6 items-center justify-center border text-xs ${active ? "border-[var(--d-accent)] bg-[var(--d-accent)] text-[var(--d-on-accent)]" : "border-white/25 bg-black/70 text-white hover:border-white"}`}
    >
      {children}
    </button>
  );
}

function BanRow({ side, g, byId, version, preview, myT, myTurn, correcting, setCorrecting }: SlotProps & { side: Side }) {
  const right = side === "red";
  const groups = [
    [0, 1, 2],
    [3, 4],
  ];
  if (right) groups.reverse().forEach((x) => x.reverse());
  return (
    <div className={`flex items-center gap-3 ${right ? "justify-end" : ""}`}>
      {groups.map((grp, k) => (
        <div key={k} className="flex gap-1.5">
          {grp.map((slot) => {
            const champ = slotChamp(g, side, "ban", slot);
            const idx = stepIndex(side, "ban", slot);
            const active = g.status === "drafting" && g.step === idx;
            const shown = champ ?? (active ? preview : null);
            const c = shown ? byId.get(shown) : undefined;
            const fix = canCorrect(g, myT, myTurn, side, idx);
            const fixing = correcting === idx;
            return (
              <button
                key={slot}
                type="button"
                disabled={!fix}
                onClick={() => fix && setCorrecting(fixing ? null : idx)}
                title={fix ? "Pedir troca deste ban" : c ? `Ban: ${c.name}` : undefined}
                className="relative size-11 overflow-hidden border bg-black/50 sm:size-12 lg:size-14"
                style={{
                  borderColor: active || fixing ? SIDE_COLOR[side] : "var(--d-line)",
                  boxShadow: active ? `0 0 16px ${SIDE_COLOR[side]}88` : undefined,
                }}
              >
                {c ? (
                  <>
                    <Image
                      key={champ ?? "preview"}
                      src={championIcon(version, c.id)}
                      alt={c.name}
                      width={64}
                      height={64}
                      className={`size-full scale-110 object-cover ${champ ? "animate-[draft-ban_.4s_var(--ease-out-expo)] grayscale" : "opacity-50"}`}
                    />
                    {champ && <span className={`absolute inset-0 animate-[draft-slash_.35s_.15s_ease-out_both] ${BAN_SLASH}`} />}
                  </>
                ) : champ === null ? (
                  <span className="text-lg text-white/30">⦸</span>
                ) : (
                  <span className="absolute inset-0" style={{ background: active ? `${SIDE_COLOR[side]}22` : undefined }} />
                )}
                {fix && <span className="absolute right-0 top-0 bg-black/70 px-0.5 text-[0.55rem] leading-none text-white">✎</span>}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Barra de ação (embaixo, no centro)
// ---------------------------------------------------------------------------------------------

function ActionBar({
  g,
  cfg,
  myT,
  myTurn,
  sel,
  byId,
  correcting,
  lock,
  sendCorrection,
  cancelCorrection,
  isLatest,
}: {
  g: GameView;
  cfg: RoomView["config"];
  myT: TeamIdx | null;
  myTurn: boolean;
  sel: string | null;
  byId: Map<string, DraftChampion>;
  correcting: number | null;
  lock: () => void;
  sendCorrection: () => void;
  cancelCorrection: () => void;
  isLatest: boolean;
}) {
  const step = currentStep(g);
  if (correcting !== null) {
    const from = g.actions[correcting];
    const name = (id: string | null | undefined) => (id ? (byId.get(id)?.name ?? id) : STEPS[correcting].type === "ban" ? "sem ban" : "vazio");
    return (
      <div className="flex flex-col items-center gap-1.5">
        <p className="text-center text-xs text-gray">
          Troca do {slotLabel(correcting)}: <span className="text-white">{name(from)}</span> → <span className="text-white">{sel === null ? "escolha na lista" : name(sel || null)}</span>
        </p>
        <div className="flex gap-2">
          <BigButton disabled={sel === null} onClick={sendCorrection}>
            Enviar pedido
          </BigButton>
          <button type="button" onClick={cancelCorrection} className="px-3 font-mono text-[0.7rem] uppercase tracking-[0.14em] text-gray hover:text-white">
            Cancelar
          </button>
        </div>
        <p className="text-[0.68rem] text-gray-dim">O drafter adversário precisa aceitar.</p>
      </div>
    );
  }
  if (step) {
    if (myTurn)
      return (
        <BigButton disabled={sel === null} onClick={lock}>
          {step.type === "ban" ? (sel === "" ? "Confirmar sem ban" : "Banir") : "Escolher"}
          {sel ? ` ${byId.get(sel)?.name ?? ""}` : ""}
        </BigButton>
      );
    const actor = cfg.teams[teamOnSide(g, step.side)].name;
    return (
      <p className="py-3 text-center font-mono text-[0.72rem] uppercase tracking-[0.16em] text-gray">
        {myT !== null ? "Vez do adversário · " : ""}
        {actor} está {step.type === "ban" ? "banindo" : "escolhendo"}
      </p>
    );
  }
  if (g.status === "lobby") return <p className="py-3 text-center font-mono text-[0.72rem] uppercase tracking-[0.16em] text-gray">Jogo {g.n} · aguardando os dois drafters ficarem prontos</p>;
  if (!isLatest || g.winner !== null) return <p className="py-3 text-center font-mono text-[0.72rem] uppercase tracking-[0.16em] text-gray">Draft do jogo {g.n}</p>;
  return <p className="py-3 text-center font-mono text-[0.72rem] uppercase tracking-[0.16em] text-gray">Draft encerrado · boa partida!</p>;
}

function BigButton({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="clip-step-sm min-w-[14rem] bg-[var(--d-accent)] px-8 py-3.5 font-mono text-sm font-semibold uppercase tracking-[0.18em] text-[var(--d-on-accent)] transition hover:brightness-110 hover:shadow-[0_0_28px_color-mix(in_srgb,var(--d-accent)_55%,transparent)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:shadow-none"
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------------------------
// Painéis
// ---------------------------------------------------------------------------------------------

function LobbyPanel({ g, cfg, code, myT, send }: { g: GameView; cfg: RoomView["config"]; code: string; myT: TeamIdx | null; send: (a: DraftAction) => Promise<string | null> }) {
  const blueT = g.blueTeam;
  const redT = other(blueT);
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]">
      <div className="clip-step w-full max-w-lg bg-[var(--d-panel)] p-6 shadow-2xl">
        <p className="label-mono text-center">Jogo {g.n} de {cfg.games} · preparação</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          {([blueT, redT] as TeamIdx[]).map((t) => {
            const side = sideOf(g, t);
            const team = cfg.teams[t];
            return (
              <div key={t} className="border bg-black/30 p-3 text-center" style={{ borderColor: `${SIDE_COLOR[side]}88` }}>
                <p className="font-mono text-[0.6rem] uppercase tracking-[0.16em]" style={{ color: SIDE_COLOR[side] }}>
                  {side === "blue" ? "Azul" : "Vermelho"}
                </p>
                <div className="mt-2 flex justify-center">
                  <LogoPlate src={teamLogo(code, team, t)} tone={teamLogoTone(team)} color={teamColor(team)} size={40} />
                </div>
                <p className="mt-2 truncate font-display text-lg font-black uppercase text-white">{team.name}</p>
                <p className={`mt-1 font-mono text-[0.65rem] uppercase tracking-[0.14em] ${g.ready[t] ? "text-green" : g.drafters[t].taken ? "text-white-dim" : "text-gray-dim"}`}>
                  {g.ready[t] ? "✓ Pronto" : g.drafters[t].taken ? "Drafter na sala" : "Sem drafter"}
                </p>
              </div>
            );
          })}
        </div>

        {myT !== null ? (
          <div className="mt-6 flex flex-col items-center gap-3">
            <BigButton onClick={() => send({ type: "ready", value: !g.ready[myT] })}>{g.ready[myT] ? "Cancelar pronto" : "Pronto"}</BigButton>
            {g.sideSwapBy === null && (
              <button type="button" onClick={() => send({ type: "swapSides" })} className="font-mono text-[0.68rem] uppercase tracking-[0.14em] text-gray hover:text-white">
                ⇄ Pedir troca de lados
              </button>
            )}
            {g.sideSwapBy === myT && (
              <p className="text-center text-xs text-gray">
                Troca de lados pedida. Aguardando o outro drafter aceitar.{" "}
                <button type="button" onClick={() => send({ type: "cancelSwap" })} className="text-white underline">
                  Cancelar
                </button>
              </p>
            )}
            {g.sideSwapBy !== null && g.sideSwapBy !== myT && (
              <div className="flex flex-col items-center gap-2 border border-[var(--d-accent)]/50 p-3 text-center text-sm">
                <p>{cfg.teams[g.sideSwapBy].name} quer trocar de lado neste jogo.</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => send({ type: "swapSides" })} className="bg-[var(--d-accent)] px-3 py-1.5 font-mono text-[0.68rem] uppercase tracking-[0.12em] text-[var(--d-on-accent)]">
                    Aceitar
                  </button>
                  <button type="button" onClick={() => send({ type: "cancelSwap" })} className="border border-white/25 px-3 py-1.5 font-mono text-[0.68rem] uppercase tracking-[0.12em] text-white">
                    Recusar
                  </button>
                </div>
              </div>
            )}
            <p className="text-center text-[0.7rem] text-gray-dim">
              {cfg.timer ? `${cfg.timer}s por ação` : "Sem limite de tempo"} · {cfg.mode === "fearless" ? "Fearless" : "Livre"} · o draft começa quando os dois estiverem prontos
            </p>
          </div>
        ) : (
          <p className="mt-6 text-center text-sm text-gray">O draft começa quando os dois drafters marcarem pronto.</p>
        )}
      </div>
    </div>
  );
}

function DonePanel({
  g,
  cfg,
  code,
  view,
  n,
  myT,
  send,
  setGame,
}: {
  g: GameView;
  cfg: RoomView["config"];
  code: string;
  view: RoomView;
  n: number;
  myT: TeamIdx | null;
  send: (a: DraftAction) => Promise<string | null>;
  setGame: (n: number) => void;
  byId: Map<string, DraftChampion>;
  version: string;
}) {
  const next = view.games[n];
  const nextStarted = !!next && next.status !== "lobby";
  const canMark = myT !== null && !nextStarted;
  return (
    <div data-lenis-prevent className="flex h-full flex-col items-center justify-center gap-5 overflow-y-auto p-4 text-center">
      <p className="label-mono">Draft do jogo {g.n} encerrado</p>
      {g.winner === null ? (
        <>
          <h2 className="font-display text-3xl font-black uppercase text-white lg:text-4xl">Quem ganhou?</h2>
          {canMark ? (
            <div className="flex flex-wrap justify-center gap-3">
              {([0, 1] as TeamIdx[]).map((t) => (
                <WinnerButton key={t} code={code} cfg={cfg} t={t} onClick={() => send({ type: "result", winner: t })} />
              ))}
            </div>
          ) : (
            <p className="max-w-sm text-sm text-gray">Depois da partida, um dos drafters marca o vencedor e o próximo jogo é liberado.</p>
          )}
          {myT !== null && <p className="max-w-md text-xs text-gray-dim">Até marcar o resultado, cada drafter pode levar os próprios campeões para a lane certa (ícones no slot) e pedir troca de um slot (✎) se algo saiu errado.</p>}
        </>
      ) : (
        <>
          <LogoPlate src={teamLogo(code, cfg.teams[g.winner], g.winner)} tone={teamLogoTone(cfg.teams[g.winner])} color={teamColor(cfg.teams[g.winner])} size={64} />
          <h2 className="font-display text-3xl font-black uppercase lg:text-4xl" style={{ color: teamColor(cfg.teams[g.winner]) }}>
            Vitória de {cfg.teams[g.winner].name}
          </h2>
          {next ? (
            <BigButton onClick={() => setGame(n + 1)}>Ir para o jogo {n + 1} →</BigButton>
          ) : (
            <p className="text-sm text-gray">Fim da série.</p>
          )}
          {canMark && (
            <button type="button" onClick={() => send({ type: "result", winner: null })} className="font-mono text-[0.66rem] uppercase tracking-[0.14em] text-gray hover:text-white">
              Corrigir resultado
            </button>
          )}
        </>
      )}
    </div>
  );
}

function WinnerButton({ code, cfg, t, onClick }: { code: string; cfg: RoomView["config"]; t: TeamIdx; onClick: () => void }) {
  const team = cfg.teams[t];
  const color = teamColor(team);
  return (
    <button
      type="button"
      onClick={onClick}
      className="clip-step-sm flex min-w-[11rem] flex-col items-center gap-2 border bg-black/40 px-5 py-4 transition hover:bg-white/[0.06]"
      style={{ borderColor: `${color}88` }}
    >
      <LogoPlate src={teamLogo(code, team, t)} tone={teamLogoTone(team)} color={color} size={44} />
      <span className="font-display text-xl font-black uppercase text-white">{team.name}</span>
    </button>
  );
}

function Requests({
  g,
  cfg,
  myT,
  send,
  byId,
}: {
  g: GameView;
  cfg: RoomView["config"];
  myT: TeamIdx | null;
  send: (a: DraftAction) => Promise<string | null>;
  byId: Map<string, DraftChampion>;
}) {
  if (!g.requests.length) return null;
  return (
    <div className="mb-2 flex flex-col gap-1.5">
      {g.requests.map((r) => {
        const old = g.actions[r.step];
        const empty = STEPS[r.step].type === "ban" ? "sem ban" : "vazio";
        const team = cfg.teams[r.team].name;
        const text = (
          <>
            {slotLabel(r.step)} de {team}: <ChampChip id={old} fallback={empty} byId={byId} /> → <ChampChip id={r.champ} fallback={empty} byId={byId} />
          </>
        );
        return (
          <div key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border border-[var(--d-accent)]/60 bg-[var(--d-panel)] px-3 py-2 text-sm">
            {myT === r.team ? (
              <>
                <span className="text-gray">Seu pedido ·</span> {text}
                <span className="text-xs text-gray-dim">aguardando o adversário</span>
                <button type="button" onClick={() => send({ type: "cancelRequest", id: r.id })} className="ml-auto text-xs text-gray hover:text-white">
                  Cancelar
                </button>
              </>
            ) : myT === other(r.team) ? (
              <>
                <span className="text-white">{cfg.teams[r.team].name} pede troca ·</span> {text}
                <span className="ml-auto flex gap-2">
                  <button type="button" onClick={() => send({ type: "respond", id: r.id, accept: true })} className="bg-[var(--d-accent)] px-3 py-1 font-mono text-[0.66rem] uppercase tracking-[0.12em] text-[var(--d-on-accent)]">
                    Aceitar
                  </button>
                  <button type="button" onClick={() => send({ type: "respond", id: r.id, accept: false })} className="border border-white/25 px-3 py-1 font-mono text-[0.66rem] uppercase tracking-[0.12em] text-white">
                    Recusar
                  </button>
                </span>
              </>
            ) : (
              <>
                <span className="text-gray">{cfg.teams[r.team].name} pediu troca ·</span> {text}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ChampChip({ id, fallback, byId }: { id: string | null | undefined; fallback: string; byId: Map<string, DraftChampion> }) {
  return <span className="font-medium text-white">{id ? (byId.get(id)?.name ?? id) : <span className="text-gray">{fallback}</span>}</span>;
}

function FearlessStrip({ list, cfg, byId, version }: { list: { champ: string; team: TeamIdx; game: number }[]; cfg: RoomView["config"]; byId: Map<string, DraftChampion>; version: string }) {
  return (
    <div className="mt-2 flex items-center gap-2 overflow-hidden border border-[var(--d-line)] bg-black/30 px-3 py-2">
      <span className="shrink-0 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-gray">Fearless · bloqueados</span>
      <div data-lenis-prevent className="flex min-w-0 gap-1 overflow-x-auto">
        {list.map((f) => (
          <span key={`${f.game}-${f.champ}`} title={`${byId.get(f.champ)?.name ?? f.champ} · ${cfg.teams[f.team].name} · jogo ${f.game}`} className="relative shrink-0">
            <Image src={championIcon(version, f.champ)} alt={byId.get(f.champ)?.name ?? f.champ} width={28} height={28} className="size-7 grayscale" />
            <span className="absolute inset-x-0 bottom-0 h-0.5" style={{ background: teamColor(cfg.teams[f.team]) }} />
          </span>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Entrada (escolha de time e papel, a cada jogo)
// ---------------------------------------------------------------------------------------------

function JoinModal({
  code,
  cfg,
  g,
  live,
  lostSeat,
  send,
  setMe,
  lastTeam,
}: {
  code: string;
  cfg: RoomView["config"];
  g: GameView;
  live: SyncApi["live"];
  lostSeat: boolean;
  send: (a: DraftAction) => Promise<string | null>;
  setMe: (m: Me | null) => void;
  lastTeam: TeamIdx | null;
}) {
  const [team, setTeam] = useState<TeamIdx | null>(lastTeam);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function join(role: "drafter" | "spectator") {
    if (team === null) return;
    setBusy(true);
    setErr(null);
    const e = await send({ type: "claim", team, role });
    setBusy(false);
    if (e) setErr(e);
    else setMe({ team, role });
  }

  /** Espectador neutro: sem time (para transmissão). Libera a vaga de drafter, se estava com ela. */
  async function joinNeutral() {
    setBusy(true);
    setErr(null);
    const e = await send({ type: "claim", team: 0, role: "spectator" });
    setBusy(false);
    if (e) setErr(e);
    else setMe({ team: 0, role: "spectator", neutral: true });
  }

  // durante o draft a vaga só é livre se o drafter caiu; antes dele (lobby) quem chega pode assumir
  // (ninguém grava presença no lobby, para o banco dormir; o servidor ainda recusa se o drafter agiu há pouco)
  const seatBusy = (t: TeamIdx) => g.status === "drafting" && g.drafters[t].taken && !g.drafters[t].mine && live.online[t];
  const seatTaken = (t: TeamIdx) => g.drafters[t].taken && !g.drafters[t].mine;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm">
      <div className="clip-step my-auto w-full max-w-xl bg-bg-2 p-6 shadow-2xl sm:p-8">
        <p className="label-mono">Jogo {g.n} de {cfg.games}</p>
        <h2 className="mt-2 font-display text-3xl font-black uppercase text-white">Entre no draft</h2>
        {lostSeat ? (
          <p className="mt-2 text-sm text-loss">Sua vaga de drafter foi assumida por outra pessoa. Escolha de novo.</p>
        ) : (
          <p className="mt-2 text-sm text-gray">A cada jogo da série todo mundo escolhe de novo o time e o papel.</p>
        )}

        <p className="label-mono mt-6">Seu time</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {([g.blueTeam, other(g.blueTeam)] as TeamIdx[]).map((t) => {
            const tm = cfg.teams[t];
            const side = sideOf(g, t);
            const on = team === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTeam(t)}
                aria-pressed={on}
                className={`flex items-center gap-3 border p-3 text-left transition-colors ${on ? "bg-white/[0.06]" : "hover:bg-white/[0.03]"}`}
                style={{ borderColor: on ? teamColor(tm) : "var(--color-line)" }}
              >
                <LogoPlate src={teamLogo(code, tm, t)} tone={teamLogoTone(tm)} color={teamColor(tm)} size={44} />
                <span className="min-w-0">
                  <span className="block truncate font-display text-xl font-black uppercase text-white">{tm.name}</span>
                  <span className="font-mono text-[0.62rem] uppercase tracking-[0.14em]" style={{ color: SIDE_COLOR[side] }}>
                    Lado {side === "blue" ? "azul" : "vermelho"} neste jogo
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <p className="label-mono mt-6">Como você entra</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            disabled={team === null || busy || (team !== null && seatBusy(team))}
            onClick={() => join("drafter")}
            className="border border-line p-4 text-left transition-colors enabled:hover:border-white disabled:opacity-40"
          >
            <span className="block font-display text-xl font-black uppercase text-white">Drafter</span>
            <span className="text-xs text-gray">
              {team !== null && seatBusy(team)
                ? "Vaga ocupada"
                : team !== null && seatTaken(team)
                  ? "Já tem drafter: entrar assume a vaga dele"
                  : "Faz os picks e bans do time (um por time)"}
            </span>
          </button>
          <button type="button" disabled={team === null || busy} onClick={() => join("spectator")} className="border border-line p-4 text-left transition-colors enabled:hover:border-white disabled:opacity-40">
            <span className="block font-display text-xl font-black uppercase text-white">Espectador</span>
            <span className="text-xs text-gray">Acompanha com a tela do time (sem limite)</span>
          </button>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={joinNeutral}
          className="mt-3 flex w-full items-center justify-between gap-3 border border-line p-4 text-left transition-colors enabled:hover:border-white disabled:opacity-40"
          style={{ background: `linear-gradient(90deg, ${teamColor(cfg.teams[g.blueTeam])}1f, transparent 50%, ${teamColor(cfg.teams[other(g.blueTeam)])}1f)` }}
        >
          <span>
            <span className="block font-display text-xl font-black uppercase text-white">Espectador neutro</span>
            <span className="text-xs text-gray">Sem lado, com as cores dos dois times. Ideal para quem vai transmitir.</span>
          </span>
          <span className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-gray">Sem time</span>
        </button>
        {err && <p className="mt-4 text-sm text-loss">{err}</p>}
      </div>
    </div>
  );
}

/** Linha discreta embaixo da ação: papel atual (com "trocar") e copiar o link da sala. */
function RoleLine({ code, me, cfg, canChange, onChange }: { code: string; me: Me | null; cfg: RoomView["config"]; canChange: boolean; onChange: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-3 font-mono text-[0.6rem] uppercase tracking-[0.12em] text-gray-dim">
      {me && (
        <span>
          {me.neutral ? "Espectador neutro" : `${me.role === "drafter" ? "Drafter" : "Espectador"} · ${cfg.teams[me.team].name}`}
          {canChange && (
            <button type="button" onClick={onChange} className="ml-2 text-white-dim underline-offset-2 hover:text-white hover:underline">
              trocar
            </button>
          )}
        </span>
      )}
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(`${window.location.origin}/draft/${code}`);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          } catch {
            /* sem clipboard */
          }
        }}
        className="text-white-dim underline-offset-2 hover:text-white hover:underline"
      >
        {copied ? "Link copiado" : "Copiar link"}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Vencedor do jogo: a mesma animação em todas as telas
// ---------------------------------------------------------------------------------------------

/**
 * Começa um pouco depois de o vencedor ser marcado (pelo relógio do servidor), para dar tempo de todas as
 * telas ficarem sabendo pelo sinal; assim a animação roda junta em todas. Quem souber atrasado (aba
 * escondida) pega o resto dela ou só segue para o próximo jogo.
 */
const FLASH_DELAY_MS = 5500; // > intervalo do sinal na espera do resultado (4 s) + leitura
const FLASH_MS = 3500;

function WinnerFlash({
  code,
  cfg,
  g,
  score: [a, b],
  offset,
  setBusy,
  silent,
  onDone,
}: {
  code: string;
  cfg: RoomView["config"];
  g: GameView;
  score: [number, number];
  offset: number;
  setBusy: (b: boolean) => void;
  /** jogo que decide a série: não mostra a animação do jogo (a tela de campeão entra no mesmo instante) */
  silent?: boolean;
  onDone: () => void;
}) {
  const [show, setShow] = useState(false);
  // relógio do servidor no momento em que soubemos (o deslocamento oscila um pouco a cada consulta)
  const off = useRef(offset);
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  });
  useEffect(() => {
    const wonAt = g.wonAt ?? 0;
    const now = Date.now() + off.current;
    if (now > wonAt + 60_000) {
      // soube muito depois (aba esquecida): sem animação, só libera a tela de campeão
      setBusy(false);
      return;
    }
    const start = wonAt + FLASH_DELAY_MS - now;
    const end = silent ? start : start + FLASH_MS;
    setBusy(true);
    const finish = () => {
      setShow(false);
      setBusy(false);
      done.current();
    };
    const t1 = setTimeout(() => !silent && setShow(true), Math.max(0, start));
    const t2 = setTimeout(finish, Math.max(0, end));
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      setBusy(false);
    };
  }, [g.wonAt, setBusy, silent]);

  if (!show || g.winner === null) return null;
  const w = g.winner;
  const team = cfg.teams[w];
  const color = teamColor(team);
  return (
    <div
      role="status"
      className="fixed inset-0 z-[60] flex items-center justify-center overflow-hidden p-6 text-center"
      style={{ background: `radial-gradient(ellipse at center, ${color}40, transparent 65%), rgb(0 0 0 / .86)` }}
    >
      <div className="relative animate-[draft-in_.6s_var(--ease-out-expo)]">
        <div className="flex justify-center">
          <LogoPlate src={teamLogo(code, team, w)} tone={teamLogoTone(team)} color={color} size={104} />
        </div>
        <p className="mt-6 font-mono text-sm uppercase tracking-[0.3em] text-white/70">Jogo {g.n} · vitória</p>
        <h2 className="mt-2 font-display text-5xl font-black uppercase leading-none sm:text-7xl" style={{ color, textShadow: `0 0 50px ${color}88` }}>
          {team.name}
        </h2>
        {cfg.games > 1 && (
          <p className="mt-5 font-display text-4xl font-black tabular-nums text-white">
            <span style={{ color: teamColor(cfg.teams[0]) }}>{a}</span>
            <span className="mx-3 text-white/40">×</span>
            <span style={{ color: teamColor(cfg.teams[1]) }}>{b}</span>
          </p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Fim da série
// ---------------------------------------------------------------------------------------------

function Victory({
  code,
  cfg,
  view,
  result,
  score: [a, b],
  setGame,
}: {
  code: string;
  cfg: RoomView["config"];
  view: RoomView;
  result: ReturnType<typeof seriesResult>;
  score: [number, number];
  setGame: (n: number) => void;
}) {
  const key = `ingen-draft:${code}:victory:${a}-${b}`;
  const [hidden, setHidden] = useState(() => {
    try {
      return typeof window !== "undefined" && sessionStorage.getItem(key) === "1";
    } catch {
      return false;
    }
  });
  if (hidden) return null;
  const close = () => {
    try {
      sessionStorage.setItem(key, "1");
    } catch {
      /* ok */
    }
    setHidden(true);
  };
  const w = result.winner;
  const team = w !== null ? cfg.teams[w] : null;
  const color = team ? teamColor(team) : "#b4b8bf";
  const remaining = cfg.games - view.games.filter((g) => g.winner !== null).length;
  const nextGame = view.games.find((g) => g.winner === null);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden p-6 text-center"
      style={{ background: `radial-gradient(ellipse at center, ${color}33, transparent 65%), rgb(0 0 0 / .88)` }}
    >
      <div className="relative animate-[draft-in_.7s_var(--ease-out-expo)]">
        {team && w !== null ? (
          <>
            <div className="flex justify-center">
              <LogoPlate src={teamLogo(code, team, w)} tone={teamLogoTone(team)} color={color} size={120} />
            </div>
            <p className="mt-6 font-mono text-sm uppercase tracking-[0.3em] text-white/70">Campeão da série</p>
            <h2 className="mt-2 font-display text-6xl font-black uppercase leading-none sm:text-8xl" style={{ color, textShadow: `0 0 60px ${color}88` }}>
              {team.name}
            </h2>
          </>
        ) : (
          <h2 className="font-display text-6xl font-black uppercase text-white sm:text-8xl">Série empatada</h2>
        )}
        <p className="mt-6 font-display text-5xl font-black tabular-nums text-white">
          <span style={{ color: teamColor(cfg.teams[0]) }}>{a}</span>
          <span className="mx-4 text-white/40">×</span>
          <span style={{ color: teamColor(cfg.teams[1]) }}>{b}</span>
        </p>
        <p className="mt-1 text-sm text-gray">
          {cfg.teams[0].name} × {cfg.teams[1].name}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={close} className="clip-step-sm bg-white px-6 py-3 font-mono text-[0.75rem] font-semibold uppercase tracking-[0.16em] text-bg-0 hover:brightness-90">
            Ver os drafts
          </button>
          {remaining > 0 && nextGame && !result.over && (
            <button
              type="button"
              onClick={() => {
                close();
                setGame(nextGame.n);
              }}
              className="clip-step-sm border border-white/30 px-6 py-3 font-mono text-[0.75rem] uppercase tracking-[0.16em] text-white hover:border-white"
            >
              Jogar o jogo {nextGame.n} mesmo assim
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
