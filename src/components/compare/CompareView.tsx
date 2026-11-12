"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import type { Role } from "@/db/schema";
import type { Insights, Stats, WinSplit } from "@/lib/data";
import { LaneIcon } from "@/components/brand/LaneIcon";
import { Select, type SelectOption } from "@/components/ui/Select";
import { championIcon, championSplash } from "@/lib/ddragon-urls";
import { ROLE_META, TIER_META, rankLabel, scoreToLabel } from "@/lib/format";

export type ComparePlayer = {
  slug: string;
  /** reserva: grupo próprio no select, fora dos duelos de lane padrão */
  reserve: boolean;
  /** perfil do titular ou op.gg do reserva */
  href: string;
  name: string;
  riotId: string;
  role: Role;
  team: { slug: string; name: string; accent: string };
  tier: string | null;
  division: string | null;
  lp: number | null;
  score: number;
  ranked: { wins: number; losses: number; winrate: number } | null;
  champs: { key: string; name: string; games: number; wins: number; kda: number }[];
  pool: { key: string; name: string; games: number; wins: number }[];
  stats: Stats | null;
  insights: Insights | null;
  form: boolean[];
  streak: number;
  lpToday: number | null;
  history: { t: number; score: number }[];
  duos: { slug: string; games: number; wins: number }[];
};

type Better = "high" | "low" | "none";
type Metric = { label: string; get: (p: ComparePlayer) => number | null | undefined; fmt: (v: number) => string; better: Better; hint?: string };

const pctF = (v: number) => `${Math.round(v * 100)}%`;
const f1 = (v: number) => v.toFixed(1);
const f2 = (v: number) => v.toFixed(2);
const f0 = (v: number) => v.toFixed(0);
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
const wrOf = (s: WinSplit | undefined) => (s && s.games ? s.wins / s.games : null);

/** Métricas agrupadas por categoria (todas comparadas lado a lado). */
const GROUPS: { key: string; title: string; metrics: Metric[] }[] = [
  {
    key: "combat",
    title: "Combate",
    metrics: [
      { label: "KDA", get: (p) => p.stats?.kda, fmt: f2, better: "high" },
      { label: "Abates / jogo", get: (p) => p.stats?.kills, fmt: f1, better: "high" },
      { label: "Mortes / jogo", get: (p) => p.stats?.deaths, fmt: f1, better: "low" },
      { label: "Assistências / jogo", get: (p) => p.stats?.assists, fmt: f1, better: "high" },
      { label: "Part. em abates", get: (p) => p.stats?.kp, fmt: pctF, better: "high" },
      { label: "Dano / min", get: (p) => p.stats?.damagePerMin, fmt: f0, better: "high" },
      { label: "% do dano do time", get: (p) => p.stats?.damageShare, fmt: pctF, better: "high" },
      { label: "Abates solo / jogo", get: (p) => p.stats?.soloKills, fmt: f1, better: "high" },
      { label: "Participação em first blood", get: (p) => p.stats?.firstBloodRate, fmt: pctF, better: "high" },
    ],
  },
  {
    key: "farm",
    title: "Farm e economia",
    metrics: [
      { label: "CS / min", get: (p) => p.stats?.csPerMin, fmt: f1, better: "high" },
      { label: "CS aos 10 min", get: (p) => p.stats?.csAt10, fmt: f1, better: "high" },
      { label: "Ouro / min", get: (p) => p.stats?.goldPerMin, fmt: f0, better: "high" },
      { label: "Placas de torre / jogo", get: (p) => p.stats?.turretPlates, fmt: f1, better: "high" },
      { label: "Dano recebido / jogo", get: (p) => p.stats?.damageTaken, fmt: (v) => `${(v / 1000).toFixed(1)}k`, better: "none", hint: "depende da função" },
    ],
  },
  {
    key: "vision",
    title: "Visão e mapa",
    metrics: [
      { label: "Placar de visão / min", get: (p) => p.stats?.visionPerMin, fmt: f2, better: "high" },
      { label: "Wards colocadas / jogo", get: (p) => p.stats?.wardsPlaced, fmt: f1, better: "high" },
      { label: "Wards destruídas / jogo", get: (p) => p.stats?.wardsKilled, fmt: f1, better: "high" },
      { label: "Control wards / jogo", get: (p) => p.stats?.controlWards, fmt: f1, better: "high" },
    ],
  },
  {
    key: "results",
    title: "Resultados e forma",
    metrics: [
      { label: "Elo Solo/Duo", get: (p) => (p.tier ? p.score : null), fmt: (v) => scoreToLabel(v), better: "high" },
      { label: "Winrate na temporada", get: (p) => p.ranked?.winrate, fmt: pctF, better: "high" },
      { label: "Winrate recente", get: (p) => p.stats?.winrate, fmt: pctF, better: "high" },
      { label: "Vitórias nas últimas 10", get: (p) => (p.form.length ? p.form.filter(Boolean).length : null), fmt: f0, better: "high" },
      { label: "PDL nas últimas 24h", get: (p) => p.lpToday, fmt: (v) => `${v > 0 ? "+" : ""}${v}`, better: "high" },
      { label: "Partidas na temporada", get: (p) => (p.ranked ? p.ranked.wins + p.ranked.losses : null), fmt: f0, better: "none" },
      { label: "Partidas nos últimos 7 dias", get: (p) => p.insights?.gamesLast7d, fmt: f0, better: "none" },
      { label: "Duração média", get: (p) => p.insights?.avgDurationSec, fmt: mmss, better: "none" },
    ],
  },
];

const CONTEXT: Metric[] = [
  { label: "Winrate no lado azul", get: (p) => wrOf(p.insights?.sides.blue), fmt: pctF, better: "high" },
  { label: "Winrate no lado vermelho", get: (p) => wrOf(p.insights?.sides.red), fmt: pctF, better: "high" },
  { label: "Jogos curtos (até 25 min)", get: (p) => wrOf(p.insights?.duration.short), fmt: pctF, better: "high" },
  { label: "Jogos médios (25 a 35 min)", get: (p) => wrOf(p.insights?.duration.mid), fmt: pctF, better: "high" },
  { label: "Jogos longos (35+ min)", get: (p) => wrOf(p.insights?.duration.long), fmt: pctF, better: "high" },
];
const contextGames = (p: ComparePlayer, i: number) => {
  const ins = p.insights;
  if (!ins) return 0;
  return [ins.sides.blue, ins.sides.red, ins.duration.short, ins.duration.mid, ins.duration.long][i].games;
};

/** Radar com 8 eixos (normalizados por um teto razoável para Solo/Duo). */
const AXES = [
  { label: "KDA", get: (s: Stats) => s.kda, max: 6 },
  { label: "CS/min", get: (s: Stats) => s.csPerMin, max: 10 },
  { label: "Dano/min", get: (s: Stats) => s.damagePerMin, max: 1100 },
  { label: "% dano", get: (s: Stats) => s.damageShare, max: 0.35 },
  { label: "Part. abates", get: (s: Stats) => s.kp, max: 0.8 },
  { label: "Visão/min", get: (s: Stats) => s.visionPerMin, max: 3 },
  { label: "Ouro/min", get: (s: Stats) => s.goldPerMin, max: 520 },
  { label: "Winrate", get: (s: Stats) => s.winrate, max: 0.75 },
];

const R = 40;
const point = (i: number, value: number) => {
  const a = (Math.PI * 2 * i) / AXES.length - Math.PI / 2;
  const r = R * Math.max(0.04, Math.min(1, value));
  return [50 + Math.cos(a) * r, 50 + Math.sin(a) * r];
};
const shape = (p: ComparePlayer | undefined) =>
  AXES.map((ax, i) => point(i, p?.stats ? ax.get(p.stats) / ax.max : 0).map((n) => n.toFixed(2)).join(",")).join(" ");

const COLOR_A = "#3dfd4e";
const COLOR_B = "#c9cdd3";

function winner(va: number | null | undefined, vb: number | null | undefined, better: Better) {
  if (va == null || vb == null || better === "none" || va === vb) return 0;
  return (better === "high" ? va > vb : va < vb) ? -1 : 1; // -1 = A, 1 = B
}

/** Linha de métrica com barras espelhadas. */
function MetricRow({ m, pa, pb, games }: { m: Metric; pa: ComparePlayer; pb: ComparePlayer; games?: [number, number] }) {
  const va = m.get(pa) ?? null;
  const vb = m.get(pb) ?? null;
  // amostras pequenas não decidem
  const w = games && (games[0] < 3 || games[1] < 3) ? 0 : winner(va, vb, m.better);
  const max = Math.max(Math.abs(va ?? 0), Math.abs(vb ?? 0)) || 1;
  const width = (v: number | null) => (v == null ? 0 : Math.max(2, (Math.abs(v) / max) * 100));
  return (
    <li>
      <div className="mb-1.5 grid grid-cols-[1fr_auto_1fr] items-baseline gap-3 font-mono text-xs">
        <span className={w === -1 ? "font-semibold text-green" : "text-gray"}>
          {va == null ? "—" : m.fmt(va)}
          {games && <span className="ml-1 text-[0.58rem] text-gray-dim">({games[0]})</span>}
        </span>
        <span className="text-center text-[0.6rem] uppercase tracking-[0.14em] text-gray-dim">
          {m.label}
          {m.hint && <span className="block normal-case tracking-normal text-[0.55rem] text-gray-dim/70">{m.hint}</span>}
        </span>
        <span className={`text-right ${w === 1 ? "font-semibold text-silver" : "text-gray"}`}>
          {games && <span className="mr-1 text-[0.58rem] text-gray-dim">({games[1]})</span>}
          {vb == null ? "—" : m.fmt(vb)}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-1">
        <div className="flex h-1.5 justify-end bg-bg-3">
          <span data-cmp-bar className="h-full" style={{ width: `${width(va)}%`, background: w === -1 ? COLOR_A : "#5a606a", ["--o" as string]: "right center" }} />
        </div>
        <div className="h-1.5 bg-bg-3">
          <span data-cmp-bar className="block h-full" style={{ width: `${width(vb)}%`, background: w === 1 ? COLOR_B : "#5a606a", ["--o" as string]: "left center" }} />
        </div>
      </div>
    </li>
  );
}

function Score({ a, b }: { a: number; b: number }) {
  return (
    <span className="font-mono text-[0.68rem] tracking-wider">
      <span className={a > b ? "text-green" : "text-gray"}>{a}</span>
      <span className="text-gray-dim"> × </span>
      <span className={b > a ? "text-silver" : "text-gray"}>{b}</span>
    </span>
  );
}

const fmtDay = (t: number) => new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" }).format(t);

/** Evolução de elo dos dois jogadores no mesmo gráfico (degraus). */
function EloOverlay({ pa, pb, until }: { pa: ComparePlayer; pb: ComparePlayer; until: number | null }) {
  const all = [...pa.history, ...pb.history];
  if (!all.length) return <p className="mt-4 text-sm text-gray">Ainda não há registros de elo para esses jogadores.</p>;
  const W = 1000;
  const H = 220;
  const t0 = Math.min(...all.map((h) => h.t));
  const t1 = Math.max(until ?? 0, ...all.map((h) => h.t), t0 + 60_000);
  const min = Math.floor((Math.min(...all.map((h) => h.score)) - 30) / 100) * 100;
  const max = Math.ceil((Math.max(...all.map((h) => h.score)) + 30) / 100) * 100;
  const x = (t: number) => ((t - t0) / (t1 - t0)) * W;
  const y = (s: number) => H - ((s - min) / (max - min)) * H;
  const path = (h: { t: number; score: number }[]) => {
    if (!h.length) return "";
    let d = `M${x(h[0].t).toFixed(1)},${y(h[0].score).toFixed(1)}`;
    for (let i = 1; i < h.length; i++) d += ` H${x(h[i].t).toFixed(1)} V${y(h[i].score).toFixed(1)}`;
    return d + ` H${W}`;
  };
  const ticks: number[] = [];
  const step = max - min > 800 ? 200 : 100;
  for (let s = min; s <= max; s += step) ticks.push(s);
  return (
    <div className="relative mt-6 pl-[88px]">
      <div className="pointer-events-none absolute inset-y-0 left-0 w-[82px]">
        {ticks.map((s) => (
          <span key={s} className="absolute right-0 -translate-y-1/2 font-mono text-[0.56rem] uppercase tracking-wider text-gray-dim" style={{ top: `${(y(s) / H) * 100}%` }}>
            {scoreToLabel(s)}
          </span>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-[220px] w-full overflow-visible">
        {ticks.map((s) => (
          <line key={s} x1="0" x2={W} y1={y(s)} y2={y(s)} stroke="rgb(255 255 255 / .06)" vectorEffect="non-scaling-stroke" />
        ))}
        <path d={path(pb.history)} fill="none" stroke={COLOR_B} strokeWidth="2.5" vectorEffect="non-scaling-stroke" opacity=".9" />
        <path d={path(pa.history)} fill="none" stroke={COLOR_A} strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="mt-2 flex justify-between font-mono text-[0.58rem] uppercase tracking-wider text-gray-dim">
        <span>{fmtDay(t0)}</span>
        <span>{fmtDay(t1)}</span>
      </div>
    </div>
  );
}

function FormStrip({ p, color }: { p: ComparePlayer; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between font-mono text-[0.62rem] uppercase tracking-wider">
        <span style={{ color }}>{p.name}</span>
        <span className={p.streak > 1 ? "text-green" : p.streak < -1 ? "text-loss" : "text-gray-dim"}>
          {p.streak > 1 ? `${p.streak}V seguidas` : p.streak < -1 ? `${-p.streak}D seguidas` : "sem sequência"}
        </span>
      </div>
      <div className="mt-2 flex gap-1">
        {p.form.length ? (
          p.form.map((w, i) => (
            <span key={i} className={`flex h-7 flex-1 items-center justify-center font-display text-xs font-black ${w ? "bg-green text-bg-0" : "bg-loss/80 text-white"}`}>
              {w ? "V" : "D"}
            </span>
          ))
        ) : (
          <span className="font-mono text-xs text-gray-dim">Sem partidas recentes</span>
        )}
      </div>
    </div>
  );
}

function TrendList({ p, color }: { p: ComparePlayer; color: string }) {
  const t = p.insights?.trend;
  const rows: { label: string; r: number; o: number; fmt: (v: number) => string; better: Better }[] = t
    ? [
        { label: "Winrate", r: t.recent.winrate, o: t.previous.winrate, fmt: pctF, better: "high" },
        { label: "KDA", r: t.recent.kda, o: t.previous.kda, fmt: f2, better: "high" },
        { label: "Mortes", r: t.recent.deaths, o: t.previous.deaths, fmt: f1, better: "low" },
        { label: "CS/min", r: t.recent.csPerMin, o: t.previous.csPerMin, fmt: f1, better: "high" },
        { label: "Dano/min", r: t.recent.damagePerMin, o: t.previous.damagePerMin, fmt: f0, better: "high" },
      ]
    : [];
  return (
    <div>
      <p className="font-mono text-[0.62rem] uppercase tracking-wider" style={{ color }}>
        {p.name}
      </p>
      {rows.length ? (
        <ul className="mt-2 space-y-1.5">
          {rows.map((r) => {
            const up = r.r > r.o;
            const good = r.r === r.o ? null : r.better === "low" ? !up : up;
            return (
              <li key={r.label} className="flex items-center justify-between gap-2 font-mono text-xs">
                <span className="text-gray">{r.label}</span>
                <span className="text-white-dim">
                  <span className="text-gray-dim">{r.fmt(r.o)} → </span>
                  {r.fmt(r.r)}
                  <span className={`ml-1.5 ${good == null ? "text-gray-dim" : good ? "text-green" : "text-loss"}`}>{r.r === r.o ? "=" : up ? "▲" : "▼"}</span>
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-2 font-mono text-xs text-gray-dim">Partidas insuficientes para tendência.</p>
      )}
    </div>
  );
}

export function CompareView({
  players,
  version,
  until,
  initialA,
  initialB,
}: {
  players: ComparePlayer[];
  version: string;
  until: number | null;
  initialA?: string;
  initialB?: string;
}) {
  // Duelos de lane: mesma posição nos dois times (ex.: JG da Black × JG da Silver)
  const duels = useMemo(() => {
    const out: { role: Role; a: string; b: string }[] = [];
    for (const r of ["TOP", "JUNGLE", "MID", "ADC", "SUPPORT"] as Role[]) {
      const same = players.filter((p) => p.role === r && !p.reserve);
      if (same.length >= 2) out.push({ role: r, a: same[0].slug, b: same[1].slug });
    }
    return out;
  }, [players]);

  const valid = (slug?: string) => players.some((p) => p.slug === slug);
  const startA = valid(initialA) ? initialA! : duels[0]?.a ?? players[0].slug;
  const startB = valid(initialB) && initialB !== startA ? initialB! : (duels.find((d) => d.a === startA)?.b ?? players.find((p) => p.slug !== startA)!.slug);
  const [a, setA] = useState(startA);
  const [b, setB] = useState(startB);
  const root = useRef<HTMLDivElement>(null);

  const pa = players.find((p) => p.slug === a)!;
  const pb = players.find((p) => p.slug === b)!;

  const sync = (na: string, nb: string) => {
    if (na === nb) nb = players.find((p) => p.slug !== na)!.slug;
    setA(na);
    setB(nb);
    window.history.replaceState(null, "", `/comparar?a=${na}&b=${nb}`);
  };
  const swap = () => sync(b, a);

  // Radar: os polígonos se transformam entre jogadores
  useGSAP(
    () => {
      gsap.to("[data-poly-a]", { attr: { points: shape(pa) }, duration: 0.9, ease: "expo.out" });
      gsap.to("[data-poly-b]", { attr: { points: shape(pb) }, duration: 0.9, ease: "expo.out", delay: 0.05 });
      gsap.fromTo("[data-cmp-bar]", { scaleX: 0 }, { scaleX: 1, duration: 1, ease: "expo.out", stagger: 0.012, transformOrigin: "var(--o)" });
      gsap.fromTo("[data-cmp-name]", { yPercent: 110 }, { yPercent: 0, duration: 0.8, ease: "expo.out" });
    },
    { scope: root, dependencies: [a, b] },
  );

  // Placar geral e por categoria
  const tally = (ms: Metric[]) =>
    ms.reduce(
      (acc, m) => {
        const w = winner(m.get(pa), m.get(pb), m.better);
        if (w === -1) acc.a++;
        if (w === 1) acc.b++;
        return acc;
      },
      { a: 0, b: 0 },
    );
  const groupScores = GROUPS.map((g) => ({ key: g.key, title: g.title, ...tally(g.metrics) }));
  const total = groupScores.reduce((s, g) => ({ a: s.a + g.a, b: s.b + g.b }), { a: 0, b: 0 });
  const decided = total.a + total.b;

  const together = pa.duos.find((d) => d.slug === pb.slug);
  const eloGap = pa.tier && pb.tier ? pa.score - pb.score : null;
  const common = pa.pool.filter((c) => pb.pool.some((o) => o.key === c.key));

  const options: SelectOption[] = players.map((m) => ({
    value: m.slug,
    label: m.name,
    group: m.reserve ? "Reservas" : m.team.name,
    keywords: `${ROLE_META[m.role].label} ${ROLE_META[m.role].short} ${m.tier ? rankLabel(m.tier, m.division ?? "") : ""}`,
  }));
  const bySlug = (slug: string | undefined) => players.find((p) => p.slug === slug);
  const renderOption = (o: SelectOption) => {
    const m = bySlug(o.value)!;
    return (
      <span className="flex items-center gap-3">
        <LaneIcon role={m.role} className="size-5 shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-lg font-extrabold uppercase leading-none text-white">{m.name}</span>
          <span className="mt-0.5 block font-mono text-[0.6rem] uppercase tracking-wider" style={{ color: m.tier ? TIER_META[m.tier]?.color : "#767c87" }}>
            {ROLE_META[m.role].short} · {m.tier ? `${rankLabel(m.tier, m.division ?? "")} ${m.lp} PDL` : "Sem ranqueada"}
          </span>
        </span>
      </span>
    );
  };

  const renderSide = (p: ComparePlayer, side: "a" | "b") => {
    const color = side === "a" ? COLOR_A : COLOR_B;
    const other = side === "a" ? b : a;
    return (
      <div className={`relative min-w-0 overflow-hidden p-4 sm:p-6 md:p-10 ${side === "b" ? "text-right" : ""}`}>
        {p.champs[0] && (
          <Image
            src={championSplash(p.champs[0].key)}
            alt=""
            fill
            sizes="50vw"
            className={`object-cover opacity-25 ${side === "a" ? "object-[30%_20%]" : "object-[70%_20%]"}`}
          />
        )}
        <div className={`absolute inset-0 ${side === "a" ? "bg-gradient-to-r" : "bg-gradient-to-l"} from-bg-1 via-bg-1/80 to-transparent`} />
        <div className="relative">
          <div className={`flex ${side === "b" ? "justify-end" : ""}`}>
            <Select
              className="w-full sm:w-auto"
              label={side === "a" ? "Jogador A" : "Jogador B"}
              value={p.slug}
              options={options.map((o) => ({ ...o, disabled: o.value === other }))}
              onChange={(v) => (side === "a" ? sync(v, b) : sync(a, v))}
              accent={color}
              align={side === "a" ? "left" : "right"}
              renderOption={renderOption}
              renderValue={(o) => {
                const m = bySlug(o?.value);
                return m ? (
                  <span className="flex items-center gap-2.5">
                    <LaneIcon role={m.role} className="size-4 shrink-0" />
                    <span className="font-mono text-[0.7rem] uppercase tracking-[0.16em] text-white">
                      Trocar<span className="hidden sm:inline"> jogador</span>
                    </span>
                  </span>
                ) : null;
              }}
            />
          </div>
          <div className={`mt-5 flex items-center gap-2 sm:mt-6 sm:gap-3 ${side === "b" ? "flex-row-reverse" : ""}`}>
            <LaneIcon role={p.role} className="size-6 shrink-0 sm:size-8" />
            <span className="label-mono min-w-0 truncate text-[0.58rem] sm:text-[0.68rem]">
              <span className="hidden sm:inline">{ROLE_META[p.role].label} · </span>
              <span className={p.team.accent === "silver" ? "text-silver" : "text-green"}>{p.team.name}</span>
              {p.reserve && <span className="text-gray-dim"> · Reserva</span>}
            </span>
          </div>
          <div className="overflow-hidden">
            {p.reserve ? (
              <a href={p.href} target="_blank" rel="noopener noreferrer" title="Ver no op.gg" data-cmp-name className="mt-2 block truncate font-display text-[clamp(2.1rem,7vw,6rem)] font-black uppercase leading-[0.85]" style={{ color }}>
                {p.name}
              </a>
            ) : (
              <Link href={p.href} data-cmp-name className="mt-2 block truncate font-display text-[clamp(2.1rem,7vw,6rem)] font-black uppercase leading-[0.85]" style={{ color }}>
                {p.name}
              </Link>
            )}
          </div>
          <p className="mt-2 truncate font-mono text-[0.65rem] text-gray sm:text-xs">{p.riotId}</p>
          <p className="mt-3 font-mono text-[0.62rem] uppercase tracking-wider sm:text-xs" style={{ color: p.tier ? TIER_META[p.tier]?.color : undefined }}>
            {p.tier ? rankLabel(p.tier, p.division ?? "") : "Sem ranqueada"}
            {p.tier && <span className="block sm:inline"><span className="hidden sm:inline"> · </span>{p.lp} PDL</span>}
            {p.ranked && <span className="hidden text-gray sm:inline"> · {p.ranked.wins}V {p.ranked.losses}D</span>}
          </p>
          <div className={`mt-4 flex gap-1.5 sm:mt-5 sm:gap-2 ${side === "b" ? "justify-end" : ""}`}>
            {p.champs.slice(0, 5).map((c, i) => (
              <Image
                key={c.key}
                src={championIcon(version, c.key)}
                alt={c.name}
                title={c.name}
                width={40}
                height={40}
                className={`clip-step-sm size-8 sm:size-10 ${i >= 3 ? "hidden sm:block" : ""}`}
              />
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div ref={root}>
      <div className="no-print mb-8">
        <p className="label-mono mb-3">Duelos de lane</p>
        <div className="flex flex-wrap gap-2">
          {duels.map((d) => {
            const on = (a === d.a && b === d.b) || (a === d.b && b === d.a);
            return (
              <button
                key={d.role}
                type="button"
                onClick={() => sync(d.a, d.b)}
                className={`clip-step-sm flex items-center gap-2 px-4 py-2 font-mono text-[0.7rem] uppercase tracking-[0.16em] transition-colors ${
                  on ? "bg-green text-bg-0" : "bg-bg-3 text-white hover:bg-white hover:text-bg-0"
                }`}
              >
                <LaneIcon role={d.role} className="size-4" active={!on} />
                {ROLE_META[d.role].short}: Black × Silver
              </button>
            );
          })}
        </div>
      </div>

      {/* Duelo: divisão pelo chevron do escudo */}
      <div className="clip-step relative grid grid-cols-2 bg-bg-2">
        {renderSide(pa, "a")}
        {renderSide(pb, "b")}
        <div className="pointer-events-none absolute inset-y-0 left-1/2 w-12 -translate-x-1/2 md:w-24">
          <svg viewBox="0 0 40 100" preserveAspectRatio="none" className="size-full">
            <path d="M20 0 L20 38 L8 50 L20 62 L20 100" stroke="#262b33" strokeWidth="1" fill="none" vectorEffect="non-scaling-stroke" />
          </svg>
        </div>
        <button
          type="button"
          onClick={swap}
          aria-label="Inverter lados"
          title="Inverter lados"
          className="clip-step-sm group absolute left-1/2 top-1/2 flex size-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center bg-bg-0 font-display text-lg font-black text-white transition-colors hover:bg-green hover:text-bg-0 md:size-14 md:text-2xl"
        >
          <span className="group-hover:hidden">VS</span>
          <span className="hidden text-xl group-hover:inline">⇄</span>
        </button>
      </div>

      {/* Placar */}
      <div className="mt-6 grid gap-px bg-line md:grid-cols-[1.2fr_2fr]">
        <div className="bg-bg-2 p-6">
          <p className="label-mono">Placar de métricas</p>
          <div className="mt-4 flex items-end gap-4">
            <span className="font-display text-6xl font-black leading-none" style={{ color: total.a >= total.b ? COLOR_A : "#5a606a" }}>
              {total.a}
            </span>
            <span className="pb-2 font-mono text-xs uppercase tracking-widest text-gray-dim">×</span>
            <span className="font-display text-6xl font-black leading-none" style={{ color: total.b >= total.a ? COLOR_B : "#5a606a" }}>
              {total.b}
            </span>
          </div>
          <div className="mt-4 flex h-2 bg-bg-3">
            <span className="h-full transition-[width] duration-700" style={{ width: `${decided ? (total.a / decided) * 100 : 50}%`, background: COLOR_A }} />
            <span className="h-full flex-1" style={{ background: COLOR_B }} />
          </div>
          <p className="mt-3 font-mono text-[0.65rem] text-gray">
            {total.a === total.b
              ? "Empate técnico nas métricas comparáveis."
              : `${total.a > total.b ? pa.name : pb.name} leva ${Math.max(total.a, total.b)} de ${decided} métricas decididas.`}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-px bg-line sm:grid-cols-4">
          {groupScores.map((g) => (
            <div key={g.key} className="bg-bg-2 p-5">
              <p className="label-mono text-[0.58rem]">{g.title}</p>
              <div className="mt-3">
                <Score a={g.a} b={g.b} />
              </div>
              <p className="mt-1 font-mono text-[0.6rem] text-gray-dim">
                {g.a === g.b ? "equilibrado" : `vantagem ${g.a > g.b ? pa.name : pb.name}`}
              </p>
            </div>
          ))}
          <div className="col-span-2 bg-bg-2 p-5 sm:col-span-4">
            <div className="flex flex-wrap gap-x-8 gap-y-2 font-mono text-[0.68rem] text-gray">
              <span>
                <span className="text-gray-dim">Diferença de elo · </span>
                {eloGap == null ? (
                  "—"
                ) : eloGap === 0 ? (
                  "mesmo elo"
                ) : (
                  <span className="text-white-dim">
                    <span style={{ color: eloGap > 0 ? COLOR_A : COLOR_B }}>{eloGap > 0 ? pa.name : pb.name}</span> {Math.abs(eloGap)} PDL acima
                  </span>
                )}
              </span>
              <span>
                <span className="text-gray-dim">Juntos no mesmo time · </span>
                {together ? (
                  <span className="text-white-dim">
                    {together.games} {together.games === 1 ? "partida" : "partidas"} ·{" "}
                    <span className={together.wins / together.games >= 0.5 ? "text-green" : "text-loss"}>{pctF(together.wins / together.games)} de vitórias</span>
                  </span>
                ) : (
                  "nenhuma partida recente"
                )}
              </span>
              <span>
                <span className="text-gray-dim">Campeões em comum · </span>
                <span className="text-white-dim">{common.length}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.3fr]">
        {/* Radar */}
        <div className="clip-step bg-bg-2 p-6">
          <p className="label-mono">Perfil de jogo</p>
          <svg viewBox="-14 -8 128 116" className="mx-auto mt-4 w-full max-w-[440px]">
            {[0.25, 0.5, 0.75, 1].map((lv) => (
              <polygon key={lv} points={AXES.map((_, i) => point(i, lv).join(",")).join(" ")} fill="none" stroke="rgb(255 255 255 / .08)" strokeWidth=".4" />
            ))}
            {AXES.map((ax, i) => {
              const [x, y] = point(i, 1);
              const [lx, ly] = point(i, 1.22);
              return (
                <g key={ax.label}>
                  <line x1="50" y1="50" x2={x} y2={y} stroke="rgb(255 255 255 / .08)" strokeWidth=".4" />
                  <text x={lx} y={ly} fill="#8a8f98" fontSize="3.4" textAnchor="middle" dominantBaseline="middle" fontFamily="var(--font-mono)">
                    {ax.label.toUpperCase()}
                  </text>
                </g>
              );
            })}
            <polygon data-poly-b points={shape(undefined)} fill={`${COLOR_B}22`} stroke={COLOR_B} strokeWidth=".8" />
            <polygon data-poly-a points={shape(undefined)} fill={`${COLOR_A}2a`} stroke={COLOR_A} strokeWidth=".8" />
          </svg>
          <div className="mt-2 flex justify-center gap-6 font-mono text-[0.7rem] uppercase tracking-wider">
            <span className="flex items-center gap-2" style={{ color: COLOR_A }}>
              <span className="size-2" style={{ background: COLOR_A }} /> {pa.name}
            </span>
            <span className="flex items-center gap-2" style={{ color: COLOR_B }}>
              <span className="size-2" style={{ background: COLOR_B }} /> {pb.name}
            </span>
          </div>

          <div className="mt-8 space-y-4 border-t border-line pt-6">
            <p className="label-mono">Forma · últimas 10</p>
            <FormStrip p={pa} color={COLOR_A} />
            <FormStrip p={pb} color={COLOR_B} />
          </div>
        </div>

        {/* Combate + farm */}
        <div className="grid gap-6">
          {GROUPS.slice(0, 2).map((g, gi) => (
            <div key={g.key} className="clip-step bg-bg-2 p-6">
              <div className="flex items-center justify-between">
                <p className="label-mono">{g.title}</p>
                <Score a={groupScores[gi].a} b={groupScores[gi].b} />
              </div>
              <ul className="mt-5 space-y-4">
                {g.metrics.map((m) => (
                  <MetricRow key={m.label} m={m} pa={pa} pb={pb} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {GROUPS.slice(2).map((g, gi) => (
          <div key={g.key} className="clip-step bg-bg-2 p-6">
            <div className="flex items-center justify-between">
              <p className="label-mono">{g.title}</p>
              <Score a={groupScores[gi + 2].a} b={groupScores[gi + 2].b} />
            </div>
            <ul className="mt-5 space-y-4">
              {g.metrics.map((m) => (
                <MetricRow key={m.label} m={m} pa={pa} pb={pb} />
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Elo no tempo */}
      <div className="clip-step mt-6 bg-bg-2 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="label-mono">Evolução de elo · Solo/Duo</p>
          <div className="flex gap-5 font-mono text-[0.65rem] uppercase tracking-wider">
            <span className="flex items-center gap-2" style={{ color: COLOR_A }}>
              <span className="h-0.5 w-4" style={{ background: COLOR_A }} /> {pa.name}
            </span>
            <span className="flex items-center gap-2" style={{ color: COLOR_B }}>
              <span className="h-0.5 w-4" style={{ background: COLOR_B }} /> {pb.name}
            </span>
          </div>
        </div>
        <EloOverlay pa={pa} pb={pb} until={until} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Contexto */}
        <div className="clip-step bg-bg-2 p-6">
          <p className="label-mono">Contexto de jogo</p>
          <p className="mt-1 font-mono text-[0.6rem] text-gray-dim">Winrate por lado do mapa e duração · (n) = partidas; menos de 3 não decide</p>
          <ul className="mt-5 space-y-4">
            {CONTEXT.map((m, i) => (
              <MetricRow key={m.label} m={m} pa={pa} pb={pb} games={[contextGames(pa, i), contextGames(pb, i)]} />
            ))}
          </ul>
        </div>

        {/* Tendência */}
        <div className="clip-step bg-bg-2 p-6">
          <p className="label-mono">Tendência</p>
          <p className="mt-1 font-mono text-[0.6rem] text-gray-dim">Partidas anteriores → últimas 10</p>
          <div className="mt-5 grid gap-6 sm:grid-cols-2">
            <TrendList p={pa} color={COLOR_A} />
            <TrendList p={pb} color={COLOR_B} />
          </div>
        </div>
      </div>

      {/* Campeões */}
      <div className="clip-step mt-6 bg-bg-2 p-6">
        <p className="label-mono">Campeões da lane</p>
        <div className="mt-5 grid gap-6 md:grid-cols-2">
          {[pa, pb].map((p, si) => (
            <div key={p.slug}>
              <p className="mb-3 font-mono text-[0.62rem] uppercase tracking-wider" style={{ color: si ? COLOR_B : COLOR_A }}>
                {p.name}
              </p>
              <ul className="space-y-1.5">
                {p.champs.length ? (
                  p.champs.map((c) => {
                    const wr = c.wins / c.games;
                    const shared = (si ? pa : pb).pool.some((o) => o.key === c.key);
                    return (
                      <li key={c.key} className="flex items-center gap-3 bg-bg-0 p-1.5 pr-4">
                        <Image src={championIcon(version, c.key)} alt="" width={36} height={36} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-display text-base font-extrabold uppercase leading-none text-white">
                            {c.name}
                            {shared && <span className="ml-2 font-mono text-[0.55rem] font-normal tracking-wider text-green">EM COMUM</span>}
                          </span>
                          <span className="font-mono text-[0.6rem] text-gray">
                            {c.games} {c.games === 1 ? "partida" : "partidas"} · KDA {c.kda.toFixed(1)}
                          </span>
                        </span>
                        <span className={`font-mono text-sm ${wr >= 0.5 ? "text-green" : "text-loss"}`}>{pctF(wr)}</span>
                      </li>
                    );
                  })
                ) : (
                  <li className="font-mono text-xs text-gray-dim">Sem partidas na lane.</li>
                )}
              </ul>
            </div>
          ))}
        </div>
        <ul className="mt-6 space-y-4 border-t border-line pt-6">
          {(
            [
              { label: "Campeões diferentes", get: (p) => p.insights?.uniqueChamps, fmt: f0, better: "none" },
              { label: "Campeões com 3+ partidas", get: (p) => p.insights?.comfortChamps, fmt: f0, better: "high" },
              { label: "% das partidas no campeão mais jogado", get: (p) => p.insights?.oneTrickShare, fmt: pctF, better: "none" },
              { label: "% das partidas na lane principal", get: (p) => p.insights?.mainRoleShare, fmt: pctF, better: "high" },
            ] satisfies Metric[]
          ).map((m) => (
            <MetricRow key={m.label} m={m} pa={pa} pb={pb} />
          ))}
        </ul>
        {common.length > 0 && (
          <div className="mt-6">
            <p className="label-mono text-[0.6rem]">Em comum no pool</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {common.map((c) => {
                const o = pb.pool.find((x) => x.key === c.key)!;
                return (
                  <span key={c.key} className="flex items-center gap-2 bg-bg-0 py-1 pl-1 pr-3" title={c.name}>
                    <Image src={championIcon(version, c.key)} alt="" width={26} height={26} />
                    <span className="font-mono text-[0.62rem]">
                      <span style={{ color: COLOR_A }}>{pctF(c.wins / c.games)}</span>
                      <span className="text-gray-dim"> ({c.games}) × </span>
                      <span style={{ color: COLOR_B }}>{pctF(o.wins / o.games)}</span>
                      <span className="text-gray-dim"> ({o.games})</span>
                    </span>
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <p className="mt-6 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-gray-dim">
        Médias das últimas partidas Solo/Duo de cada jogador (Flex e remakes não contam). Métricas de wards, CS aos 10, placas e abates solo
        usam só partidas com detalhes.
      </p>
    </div>
  );
}
