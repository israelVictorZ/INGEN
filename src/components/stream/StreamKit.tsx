"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { Role } from "@/db/schema";
import { Select, type SelectOption } from "@/components/ui/Select";
import { LaneIcon } from "@/components/brand/LaneIcon";
import { TeamTag } from "@/components/ui";
import { TIER_META, emblemUrl } from "@/lib/format";

export type StreamPlayer = {
  slug: string;
  name: string;
  team: string;
  accent: string;
  role: Role;
  tier: string | null;
  elo: string | null;
  canal: string | null;
};

// ---------------------------------------------------------------------------
// Peças e opções. Cada opção vira um parâmetro no link, mas o jogador só vê botões.
// ---------------------------------------------------------------------------

type Key = "jogador" | "canal" | "meta";
type Opt =
  | { kind: "toggle"; id: string; label: string; def: boolean; on?: [string, string]; off?: [string, string] }
  | { kind: "choice"; id: string; label: string; def: string; param: string; choices: [string, string][] }
  | { kind: "text"; id: string; label: string; param: string; placeholder: string; type?: "text" | "time" };

/** Opções de texto das telas cheias (os placeholders são os textos padrão de cada tela). */
const screenTexts = (l1: string, l2: string, sub: string): Opt[] => [
  { kind: "text", id: "titulo1", label: "Título, linha 1", param: "titulo1", placeholder: l1 },
  { kind: "text", id: "titulo2", label: "Título, linha 2 (verde)", param: "titulo2", placeholder: l2 },
  { kind: "text", id: "sub", label: "Frase de baixo", param: "sub", placeholder: sub },
];
type Item = { file: string; title: string; w: number; h: number; keys: Key[]; size: string; where: string; wide?: boolean; alerts?: boolean; opts: Opt[] };

const ITEMS: Item[] = [
  {
    file: "cliente.html", title: "Fundo do cliente", w: 1920, h: 1080, wide: true, keys: ["jogador", "canal", "meta"], size: "1920 × 1080",
    where: "Cena fora de partida: lobby, fila e seleção de campeões. Nick, lane e elo vêm do site e o elo se atualiza sozinho.",
    opts: [
      { kind: "toggle", id: "cam", label: "Tenho câmera", def: true, off: ["cam", "0"] },
      { kind: "toggle", id: "chat", label: "Chat dentro do fundo", def: true, off: ["chat", "0"] },
    ],
  },
  {
    file: "tampao-mapa.html", title: "Tampão de mapa", w: 300, h: 300, keys: ["jogador"], size: "Quadrado do tamanho do minimapa",
    where: "Em partida, por cima do minimapa.",
    opts: [
      { kind: "toggle", id: "texto", label: "Legenda", def: true, off: ["texto", "0"] },
      { kind: "toggle", id: "radar", label: "Radar", def: true, off: ["radar", "0"] },
    ],
  },
  {
    file: "webcam.html", title: "Borda da webcam", w: 320, h: 240, keys: ["jogador"], size: "Mesmo tamanho da câmera",
    where: "Por cima da câmera, com o mesmo tamanho. Na partida, entre o HUD e o minimapa.",
    opts: [
      { kind: "toggle", id: "tag", label: "Etiqueta com nick", def: true, off: ["tag", "0"] },
      { kind: "toggle", id: "aovivo", label: "Selo Ao vivo", def: true, off: ["aovivo", "0"] },
    ],
  },
  {
    file: "chat.html", title: "Chat", w: 524, h: 616, keys: ["jogador", "canal"], size: "Livre (ex.: 524 × 616)",
    where: "Só se você quiser o chat separado do fundo do cliente.",
    opts: [
      { kind: "choice", id: "sumir", label: "Mensagens somem", def: "", param: "sumir", choices: [["", "Nunca"], ["30", "30 s"], ["60", "1 min"]] },
      { kind: "choice", id: "fonte", label: "Letra", def: "", param: "fonte", choices: [["18", "P"], ["", "M"], ["26", "G"]] },
      { kind: "toggle", id: "comandos", label: "Mostrar !comandos", def: false, on: ["comandos", "1"] },
    ],
  },
  {
    file: "alertas.html", title: "Alertas", w: 1920, h: 1080, keys: ["jogador", "canal"], alerts: true, size: "1920 × 1080, por cima de tudo",
    where: "Em todas as cenas. Subs, presentes, raids e bits. Follows: veja o StreamElements no fim da página.",
    opts: [
      { kind: "choice", id: "posicao", label: "Posição", def: "", param: "posicao", choices: [["", "Topo"], ["centro", "Centro"], ["baixo", "Embaixo"]] },
      { kind: "choice", id: "tempo", label: "Duração", def: "", param: "tempo", choices: [["4", "4 s"], ["", "6 s"], ["10", "10 s"]] },
      { kind: "toggle", id: "som", label: "Som", def: true, off: ["som", "0"] },
    ],
  },
  {
    file: "comecando.html", title: "Já vai começar", w: 1920, h: 1080, keys: ["jogador", "canal"], size: "1920 × 1080",
    where: "Antes de começar. Escolha minutos de contagem ou o horário em que a live começa.",
    opts: [
      { kind: "choice", id: "minutos", label: "Contagem", def: "", param: "minutos", choices: [["", "Sem"], ["5", "5 min"], ["10", "10 min"], ["15", "15 min"]] },
      { kind: "toggle", id: "chat", label: "Chat ao lado", def: false, on: ["chat", "1"] },
      { kind: "text", id: "hora", label: "Ou até o horário", param: "hora", placeholder: "21:30", type: "time" },
      ...screenTexts("A live", "já vai começar", "Pega a água, chama o duo e cola no chat."),
    ],
  },
  {
    file: "volta-ja.html", title: "Volta já", w: 1920, h: 1080, keys: ["jogador", "canal"], size: "1920 × 1080",
    where: "Pausas. Sem contagem, mostra uma barra de carregamento.",
    opts: [
      { kind: "choice", id: "minutos", label: "Contagem", def: "", param: "minutos", choices: [["", "Sem"], ["3", "3 min"], ["5", "5 min"], ["10", "10 min"]] },
      { kind: "toggle", id: "chat", label: "Chat ao lado", def: false, on: ["chat", "1"] },
      ...screenTexts("A live", "volta já", "Não sai daí, já já tem mais."),
    ],
  },
  {
    file: "encerrando.html", title: "Encerrando", w: 1920, h: 1080, keys: ["jogador", "canal"], size: "1920 × 1080",
    where: "Fim da live, com as redes da INGEN em destaque.",
    opts: [
      { kind: "toggle", id: "chat", label: "Chat ao lado", def: false, on: ["chat", "1"] },
      ...screenTexts("Valeu pela", "live!", "Segue a INGEN para não perder a próxima."),
    ],
  },
];

const TESTS: [string, Record<string, unknown>][] = [
  ["Follow", { type: "follow", name: "Tsuki" }],
  ["Sub", { type: "sub", name: "Taiyou", tier: "Tier 1" }],
  ["Resub", { type: "resub", name: "vanessa.gg", months: 14, tier: "Tier 1", message: "14 meses de INGEN!" }],
  ["Presente", { type: "gift", name: "mod_ingen", recipient: "lucas_lol", tier: "Tier 1" }],
  ["10 presentes", { type: "giftbomb", name: "mod_ingen", amount: 10 }],
  ["Raid", { type: "raid", name: "OutroStreamer", amount: 128 }],
  ["Bits", { type: "bits", name: "fenrir", amount: 500, message: "pelo penta" }],
];

const SE_FILES = [
  { file: "html.html", tab: "HTML" },
  { file: "css.css", tab: "CSS" },
  { file: "js.js", tab: "JS" },
  { file: "fields.json", tab: "Fields" },
];

// ---------------------------------------------------------------------------
// Estado salvo no navegador (useSyncExternalStore: sem setState em efeito)
// ---------------------------------------------------------------------------

type State = Record<Key, string> & { opts: Record<string, string> };
const STORE = "ingen-stream-kit";
const BLANK: State = { jogador: "", canal: "", meta: "", opts: {} };
const listeners = new Set<() => void>();
let saved: string | null = null;
const noop = () => () => {};
function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}
function readSaved() {
  if (saved === null) {
    try {
      saved = localStorage.getItem(STORE) || "{}";
    } catch {
      saved = "{}";
    }
  }
  return saved;
}
function save(s: State) {
  saved = JSON.stringify(s);
  try {
    localStorage.setItem(STORE, saved);
  } catch {}
  listeners.forEach((l) => l());
}

function parseState(raw: string): State {
  try {
    const s = { ...BLANK, ...JSON.parse(raw) };
    return { ...s, opts: s.opts ?? {} };
  } catch {
    return BLANK;
  }
}
const latest = () => parseState(readSaved());

function useDebounced<T>(value: T, ms: number) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

const optValue = (s: State, it: Item, o: Opt) =>
  s.opts[`${it.file}:${o.id}`] ?? (o.kind === "toggle" ? (o.def ? "1" : "0") : o.kind === "choice" ? o.def : "");

function query(s: State, it: Item, extra: Record<string, string> = {}) {
  const q = new URLSearchParams();
  it.keys.forEach((k) => s[k] && q.set(k, s[k]));
  it.opts.forEach((o) => {
    const v = optValue(s, it, o);
    if (o.kind === "toggle") {
      const pair = v === "1" ? o.on : o.off;
      if (pair) q.set(pair[0], pair[1]);
    } else if (v.trim()) q.set(o.param, v.trim());
  });
  Object.entries(extra).forEach(([k, v]) => q.set(k, v));
  const str = q.toString();
  return str ? `?${str}` : "";
}

// ---------------------------------------------------------------------------
// UI
// ---------------------------------------------------------------------------

function CopyBtn({ text, label = "Copiar link", className = "" }: { text: string | (() => Promise<string>); label?: string; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        const value = typeof text === "string" ? text : await text();
        await navigator.clipboard.writeText(value).catch(() => {});
        setDone(true);
        setTimeout(() => setDone(false), 1400);
      }}
      className={`clip-step-sm shrink-0 bg-[image:var(--grad-ingen-x)] px-4 py-3 font-mono text-[0.7rem] font-medium uppercase tracking-[0.16em] text-bg-0 transition hover:brightness-110 ${className}`}
    >
      {done ? "Copiado ✓" : label}
    </button>
  );
}

/** Prévia sempre 16:9; a peça é escalada para caber inteira e centralizada. */
function Preview({ src, w, h, frameRef }: { src: string; w: number; h: number; frameRef?: (el: HTMLIFrameElement | null) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState({ s: 0, x: 0, y: 0 });
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const { width: cw, height: ch } = e.contentRect;
      const pad = w < 1000 ? 0.86 : 1; // peças pequenas ganham respiro
      const s = Math.min(cw / w, ch / h) * pad;
      setFit({ s, x: (cw - w * s) / 2, y: (ch - h * s) / 2 });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [w, h]);

  // Buffer duplo: a prévia atual continua na tela enquanto a nova carrega escondida.
  // A nova só aparece (com fade) quando o overlay avisa que terminou de desenhar ({ ingenReady }).
  const [shown, setShown] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(src);
  const [leaving, setLeaving] = useState<string | null>(null);
  const [lastSrc, setLastSrc] = useState(src);
  if (src !== lastSrc) {
    setLastSrc(src);
    setPending(src === shown ? null : src);
  }
  const pendingFrame = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    if (!pending) return;
    let done = false;
    const promote = () => {
      if (done) return;
      done = true;
      setLeaving(shown);
      setShown(pending);
      setPending(null);
    };
    const onMsg = (e: MessageEvent) => {
      if (e.data?.ingenReady && e.source === pendingFrame.current?.contentWindow) setTimeout(promote, 180);
    };
    window.addEventListener("message", onMsg);
    const fallback = setTimeout(promote, 6000); // nunca fica preso no "atualizando"
    return () => {
      window.removeEventListener("message", onMsg);
      clearTimeout(fallback);
    };
  }, [pending, shown]);

  useEffect(() => {
    if (!leaving) return;
    const t = setTimeout(() => setLeaving(null), 350);
    return () => clearTimeout(t);
  }, [leaving]);

  const frames = [leaving, shown, pending].filter((s, i, a): s is string => !!s && a.indexOf(s) === i);
  const style = { transform: `translate(${fit.x}px, ${fit.y}px) scale(${fit.s})`, colorScheme: "normal" as const };

  return (
    <div
      ref={box}
      className="relative aspect-video overflow-hidden bg-[#1d2127] bg-[length:20px_20px] bg-[image:conic-gradient(#252a31_25%,transparent_0_50%,#252a31_0_75%,transparent_0)]"
    >
      {fit.s > 0 &&
        frames.map((s) => (
          <iframe
            key={s}
            ref={s === pending ? (el) => void (pendingFrame.current = el) : s === shown ? frameRef : undefined}
            src={s}
            width={w}
            height={h}
            title="Prévia"
            aria-hidden={s !== shown}
            className={`pointer-events-none absolute left-0 top-0 origin-top-left border-0 transition-opacity duration-300 ${
              // o mesmo <iframe> passa de pendente (opacity 0) a visível: a transição faz o fade sem recarregar
              s === shown ? "z-[2] opacity-100" : s === leaving ? "z-[1] opacity-100" : "z-0 opacity-0"
            }`}
            // color-scheme igual ao do overlay: com o site em "dark", o Chrome pintaria um fundo branco atrás do iframe transparente
            style={style}
          />
        ))}

      {/* primeira carga: skeleton */}
      {!shown && (
        <div className="absolute inset-0 z-[3] grid place-items-center bg-bg-1">
          <div className="absolute inset-0 animate-pulse bg-[linear-gradient(110deg,transparent_30%,rgb(255_255_255/.04)_50%,transparent_70%)]" />
          <span className="relative font-mono text-[0.66rem] uppercase tracking-[0.16em] text-gray-dim">Carregando prévia…</span>
        </div>
      )}
      {/* trocas seguintes: a prévia antiga fica e aparece só um selo discreto */}
      {shown && pending && (
        <span className="absolute right-3 top-3 z-[3] inline-flex items-center gap-2 bg-bg-0/85 px-2.5 py-1.5 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-gray">
          <span className="size-1.5 animate-pulse bg-green" />
          Atualizando
        </span>
      )}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-2">
      <span className="label-mono">{label}</span>
      {children}
      {hint && <span className="text-xs text-gray-dim">{hint}</span>}
    </label>
  );
}

const inputCls =
  "h-12 w-full min-w-0 border border-line bg-bg-1 px-4 text-[0.95rem] text-white outline-none transition placeholder:text-gray-dim focus:border-green";

function Toggle({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`inline-flex items-center gap-2.5 px-3 py-2 font-mono text-[0.68rem] uppercase tracking-[0.12em] transition ${
        on ? "bg-deep text-lime shadow-[inset_0_0_0_1px_rgb(61_253_78/.45)]" : "bg-bg-3 text-gray hover:text-white"
      }`}
    >
      <span className={`grid size-3.5 place-items-center ${on ? "bg-green text-bg-0" : "shadow-[inset_0_0_0_1px_var(--color-gray-dim)]"}`}>
        {on && <span className="text-[0.6rem] leading-none">✓</span>}
      </span>
      {label}
    </button>
  );
}

function Choice({ label, value, choices, onChange }: { label: string; value: string; choices: [string, string][]; onChange: (v: string) => void }) {
  return (
    <div className="inline-flex items-center gap-2">
      <span className="font-mono text-[0.66rem] uppercase tracking-[0.12em] text-gray-dim">{label}</span>
      <div className="inline-flex bg-bg-3 p-0.5" role="radiogroup" aria-label={label}>
        {choices.map(([v, l]) => (
          <button
            key={v || "padrao"}
            type="button"
            role="radio"
            aria-checked={value === v}
            onClick={() => onChange(v)}
            className={`px-2.5 py-1.5 font-mono text-[0.66rem] uppercase tracking-[0.1em] transition ${value === v ? "bg-green text-bg-0" : "text-gray hover:text-white"}`}
          >
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}

function PlayerSummary({ player, canal }: { player?: StreamPlayer; canal: string }) {
  if (!player)
    return (
      <div className="flex h-full flex-col justify-between gap-6">
        <div className="flex items-center gap-4">
          <Image src="/brand/ingen-logo.webp" alt="" width={64} height={54} />
          <div>
            <p className="font-display text-3xl font-extrabold uppercase leading-none text-white">INGEN</p>
            <p className="mt-1 font-mono text-[0.68rem] uppercase tracking-[0.14em] text-gray">Canal oficial</p>
          </div>
        </div>
        <p className="text-sm leading-relaxed text-gray">Sem jogador escolhido, os overlays saem só com a marca da INGEN e o chat de twitch.tv/{canal || "ingen_team"}.</p>
      </div>
    );
  const tier = player.tier ? TIER_META[player.tier] : null;
  const twitch = canal || player.canal;
  return (
    <div className="flex h-full flex-col justify-between gap-6">
      <div className="flex items-center gap-4">
        <div className="grid size-16 shrink-0 place-items-center overflow-hidden bg-bg-1">
          {player.tier ? (
            <Image src={emblemUrl(player.tier)} alt={tier?.label ?? ""} width={64} height={64} loading="eager" className="scale-[2.6] object-contain" />
          ) : (
            <LaneIcon role={player.role} className="size-8" />
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate font-display text-4xl font-extrabold uppercase leading-none text-white">{player.name}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <TeamTag accent={player.accent} name={player.team} />
            <span className="inline-flex items-center gap-1.5 font-mono text-[0.68rem] uppercase tracking-[0.12em] text-gray">
              <LaneIcon role={player.role} className="size-4" />
            </span>
          </div>
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div className="bg-bg-1 px-3 py-2.5">
          <dt className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-gray-dim">Elo</dt>
          <dd className="mt-1 truncate font-medium" style={{ color: tier?.color ?? "#fff" }}>{player.elo ?? "Sem ranqueada"}</dd>
        </div>
        <div className="bg-bg-1 px-3 py-2.5">
          <dt className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-gray-dim">Twitch</dt>
          <dd className={`mt-1 truncate font-medium ${twitch ? "text-white" : "text-loss"}`}>{twitch ? twitch : "Preencha o canal"}</dd>
        </div>
      </dl>
    </div>
  );
}

// ---------------------------------------------------------------------------

export function StreamKit({ players }: { players: StreamPlayer[] }) {
  const raw = useSyncExternalStore(subscribe, readSaved, () => "{}");
  const state = useMemo(() => parseState(raw), [raw]);
  const origin = useSyncExternalStore(noop, () => location.origin, () => "");
  const alertFrame = useRef<HTMLIFrameElement | null>(null);

  const live = useDebounced(state, 450);
  const player = players.find((p) => p.slug === state.jogador);
  // sempre sobre o valor mais recente salvo (dois cliques seguidos não se sobrescrevem)
  const set = (k: Key) => (v: string) => save({ ...latest(), [k]: v });
  const setOpt = (it: Item, o: Opt, v: string) => {
    const cur = latest();
    save({ ...cur, opts: { ...cur.opts, [`${it.file}:${o.id}`]: v } });
  };

  const options: SelectOption[] = useMemo(
    () => [
      { value: "", label: "Canal oficial da INGEN", group: "Sem jogador" },
      ...players.map((p) => ({ value: p.slug, label: p.name, group: p.team, keywords: `${p.role} ${p.elo ?? ""}` })),
    ],
    [players],
  );

  return (
    <div className="flex flex-col gap-16">
      {/* 1 · dados */}
      <section className="grid gap-px overflow-hidden bg-line lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-6 bg-bg-2 p-6 md:p-8">
          <p className="label-mono flex items-center gap-3">
            <span className="text-green">01</span> Seus dados
          </p>
          <Field label="Quem vai fazer a live?">
            <Select
              value={state.jogador}
              options={options}
              onChange={set("jogador")}
              label="Jogador"
              searchable
              renderOption={(o) => {
                const p = players.find((x) => x.slug === o.value);
                return (
                  <span className="flex items-center gap-3">
                    {p && <LaneIcon role={p.role} className="size-5" />}
                    <span className="text-white">{o.label}</span>
                    {p?.elo && <span className="ml-auto font-mono text-[0.7rem] text-gray">{p.elo}</span>}
                  </span>
                );
              }}
            />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Canal da Twitch" hint={player?.canal ? "Já vem do site" : "Só o nome, sem o link"}>
              <input className={inputCls} value={state.canal} onChange={(e) => set("canal")(e.target.value.trim())} placeholder={player?.canal ?? "ingen_team"} />
            </Field>
            <Field label="Meta (opcional)" hint="Aparece no fundo do cliente">
              <input className={inputCls} value={state.meta} onChange={(e) => set("meta")(e.target.value)} placeholder="Diamante IV" />
            </Field>
          </div>
        </div>
        <div className="min-w-0 bg-bg-2 p-6 md:p-8 lg:bg-bg-3/40">
          <PlayerSummary player={player} canal={state.canal} />
        </div>
      </section>

      {/* 2 · peças */}
      <section className="flex flex-col gap-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <p className="label-mono flex items-center gap-3">
            <span className="text-green">02</span> Ajuste e copie cada peça
          </p>
          <p className="text-sm text-gray">Os botões mudam a prévia e o link na hora. Cada link vira uma Fonte de navegador.</p>
        </div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {ITEMS.map((it) => {
            const url = `${origin}/stream/overlays/${it.file}${query(state, it)}`;
            const src = `/stream/overlays/${it.file}${query(live, it, it.alerts ? { som: "0", demo: "1" } : { demo: "1" })}`;
            return (
              <article key={it.file} className={`clip-step flex min-w-0 flex-col bg-bg-2 ${it.wide ? "md:col-span-2 xl:col-span-3" : ""}`}>
                <div className={it.wide ? "xl:mx-auto xl:w-full xl:max-w-[900px]" : ""}>
                  <Preview src={src} w={it.w} h={it.h} frameRef={it.alerts ? (el) => (alertFrame.current = el) : undefined} />
                </div>
                <div className="flex flex-1 flex-col gap-4 p-5 md:p-6">
                  <div>
                    <span className="font-mono text-[0.66rem] uppercase tracking-[0.16em] text-green">{it.size}</span>
                    <h3 className="mt-2 font-display text-3xl font-extrabold uppercase leading-none text-white">{it.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-gray">{it.where}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {it.opts.map((o) =>
                      o.kind === "toggle" ? (
                        <Toggle key={o.id} label={o.label} on={optValue(state, it, o) === "1"} onClick={() => setOpt(it, o, optValue(state, it, o) === "1" ? "0" : "1")} />
                      ) : o.kind === "choice" ? (
                        <Choice key={o.id} label={o.label} value={optValue(state, it, o)} choices={o.choices} onChange={(v) => setOpt(it, o, v)} />
                      ) : null,
                    )}
                  </div>
                  {it.opts.some((o) => o.kind === "text") && (
                    <div className="grid gap-3">
                      {it.opts.map((o) =>
                        o.kind === "text" ? (
                          <label key={o.id} className="flex min-w-0 flex-col gap-1.5">
                            <span className="font-mono text-[0.64rem] uppercase tracking-[0.12em] text-gray-dim">{o.label}</span>
                            <input
                              type={o.type ?? "text"}
                              value={optValue(state, it, o)}
                              onChange={(e) => setOpt(it, o, e.target.value)}
                              placeholder={o.placeholder}
                              maxLength={60}
                              className="h-10 w-full min-w-0 border border-line bg-bg-1 px-3 text-sm text-white outline-none transition [color-scheme:dark] placeholder:text-gray-dim focus:border-green"
                            />
                          </label>
                        ) : null,
                      )}
                      <p className="text-xs text-gray-dim">Deixe em branco para usar o texto padrão.</p>
                    </div>
                  )}
                  {it.alerts && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="mr-1 font-mono text-[0.66rem] uppercase tracking-[0.12em] text-gray-dim">Testar</span>
                      {TESTS.map(([label, evt]) => (
                        <button
                          key={label}
                          type="button"
                          onClick={() => alertFrame.current?.contentWindow?.postMessage({ ingenAlert: evt }, "*")}
                          className="bg-bg-3 px-2.5 py-1.5 font-mono text-[0.64rem] uppercase tracking-[0.1em] text-white transition hover:bg-white hover:text-bg-0"
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="mt-auto flex flex-col gap-2 pt-1 sm:flex-row">
                    <input
                      readOnly
                      value={url}
                      aria-label={`Link: ${it.title}`}
                      onFocus={(e) => e.target.select()}
                      className="h-11 min-w-0 flex-1 border border-line bg-bg-1 px-3 font-mono text-xs text-gray outline-none"
                    />
                    <CopyBtn text={url} />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* 3 · StreamElements */}
      <section className="clip-step grid gap-6 bg-bg-2 p-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:p-8">
        <div className="min-w-0">
          <p className="label-mono flex items-center gap-3">
            <span className="text-green">03</span> Alertas com follows (StreamElements)
          </p>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-gray">
            A Twitch não avisa follows pelo chat. Para ter follows, monte o widget no StreamElements com estes quatro botões (o passo a passo está no guia).
            Use ele <b className="text-white">ou</b> a peça Alertas acima, nunca os dois.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {SE_FILES.map(({ file, tab }) => (
            <CopyBtn key={file} label={`Copiar ${tab}`} text={() => fetch(`/stream/streamelements/alertas/${file}`).then((r) => r.text())} />
          ))}
        </div>
      </section>
    </div>
  );
}
