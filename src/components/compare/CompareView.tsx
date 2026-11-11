"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import type { Role } from "@/db/schema";
import { LaneIcon } from "@/components/brand/LaneIcon";
import { championIcon, championSplash } from "@/lib/ddragon-urls";
import { ROLE_META, TIER_META, rankLabel } from "@/lib/format";

export type ComparePlayer = {
  slug: string;
  name: string;
  riotId: string;
  role: Role;
  team: { slug: string; name: string; accent: string };
  tier: string | null;
  division: string | null;
  lp: number | null;
  score: number;
  champs: { key: string; name: string; games: number }[];
  stats: {
    games: number;
    winrate: number;
    kda: number;
    csPerMin: number;
    visionPerMin: number;
    goldPerMin: number;
    kp: number;
    damageShare: number;
    deaths: number;
  } | null;
};

const AXES = [
  { k: "kda", label: "KDA", max: 6, fmt: (v: number) => v.toFixed(2) },
  { k: "csPerMin", label: "CS/min", max: 9, fmt: (v: number) => v.toFixed(1) },
  { k: "visionPerMin", label: "Visão/min", max: 3, fmt: (v: number) => v.toFixed(2) },
  { k: "kp", label: "Part. abates", max: 0.75, fmt: (v: number) => `${Math.round(v * 100)}%` },
  { k: "damageShare", label: "% dano", max: 0.35, fmt: (v: number) => `${Math.round(v * 100)}%` },
  { k: "winrate", label: "Winrate", max: 0.75, fmt: (v: number) => `${Math.round(v * 100)}%` },
] as const;

const EXTRA = [
  { k: "goldPerMin", label: "Ouro/min", fmt: (v: number) => v.toFixed(0), better: "high" },
  { k: "deaths", label: "Mortes/jogo", fmt: (v: number) => v.toFixed(1), better: "low" },
  { k: "games", label: "Partidas analisadas", fmt: (v: number) => String(v), better: "none" },
] as const;

const R = 42;
const point = (i: number, value: number) => {
  const a = (Math.PI * 2 * i) / AXES.length - Math.PI / 2;
  const r = R * Math.max(0.04, Math.min(1, value));
  return [50 + Math.cos(a) * r, 50 + Math.sin(a) * r];
};
const shape = (p: ComparePlayer | undefined) =>
  AXES.map((ax, i) => point(i, p?.stats ? (p.stats[ax.k] as number) / ax.max : 0).map((n) => n.toFixed(2)).join(",")).join(" ");

const COLOR_A = "#3dfd4e";
const COLOR_B = "#c9cdd3";

export function CompareView({ players, version, initialA, initialB }: { players: ComparePlayer[]; version: string; initialA?: string; initialB?: string }) {
  const first = players.find((p) => p.slug === initialA) ?? players[0];
  const sameTeam = (slug?: string) => players.find((p) => p.slug === slug && p.team.slug === first.team.slug && p.slug !== first.slug);
  const [a, setA] = useState(first.slug);
  const [b, setB] = useState((sameTeam(initialB) ?? players.find((p) => p.team.slug === first.team.slug && p.slug !== first.slug))!.slug);
  const root = useRef<HTMLDivElement>(null);

  const pa = players.find((p) => p.slug === a)!;
  const pb = players.find((p) => p.slug === b)!;
  const teamMates = useMemo(() => players.filter((p) => p.team.slug === pa.team.slug), [players, pa.team.slug]);
  const teams = useMemo(() => [...new Map(players.map((p) => [p.team.slug, p.team])).values()], [players]);

  const sync = (na: string, nb: string) => {
    setA(na);
    setB(nb);
    window.history.replaceState(null, "", `/comparar?a=${na}&b=${nb}`);
  };
  const pickTeam = (slug: string) => {
    const list = players.filter((p) => p.team.slug === slug);
    sync(list[0].slug, list[1]?.slug ?? list[0].slug);
  };

  // Radar: os polígonos se transformam entre jogadores
  useGSAP(
    () => {
      gsap.to("[data-poly-a]", { attr: { points: shape(pa) }, duration: 0.9, ease: "expo.out" });
      gsap.to("[data-poly-b]", { attr: { points: shape(pb) }, duration: 0.9, ease: "expo.out", delay: 0.05 });
      gsap.fromTo("[data-cmp-bar]", { scaleX: 0 }, { scaleX: 1, duration: 1, ease: "expo.out", stagger: 0.03, transformOrigin: "var(--o)" });
      gsap.fromTo("[data-cmp-name]", { yPercent: 110 }, { yPercent: 0, duration: 0.8, ease: "expo.out" });
    },
    { scope: root, dependencies: [a, b] },
  );

  const renderSide = (p: ComparePlayer, side: "a" | "b") => (
    <div className={`relative overflow-hidden p-6 md:p-10 ${side === "b" ? "md:text-right" : ""}`}>
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
        <select
          value={p.slug}
          onChange={(e) => (side === "a" ? sync(e.target.value, e.target.value === b ? a : b) : sync(a, e.target.value))}
          className="clip-step-sm cursor-pointer appearance-none bg-bg-3 px-4 py-2 font-mono text-[0.7rem] uppercase tracking-[0.16em] text-white outline-none"
          aria-label={side === "a" ? "Jogador A" : "Jogador B"}
        >
          {teamMates
            .filter((m) => (side === "a" ? true : m.slug !== a))
            .map((m) => (
              <option key={m.slug} value={m.slug}>
                {ROLE_META[m.role].short} · {m.name}
              </option>
            ))}
        </select>
        <div className={`mt-6 flex items-center gap-3 ${side === "b" ? "md:justify-end" : ""}`}>
          <LaneIcon role={p.role} className="size-8" />
          <span className="label-mono">{ROLE_META[p.role].label}</span>
        </div>
        <div className="overflow-hidden">
          <Link
            href={`/jogador/${p.slug}`}
            data-cmp-name
            className="mt-2 block font-display text-[clamp(3rem,7vw,6rem)] font-black uppercase leading-[0.85]"
            style={{ color: side === "a" ? COLOR_A : COLOR_B }}
          >
            {p.name}
          </Link>
        </div>
        <p className="mt-2 font-mono text-xs text-gray">{p.riotId}</p>
        <p className="mt-3 font-mono text-xs uppercase tracking-wider" style={{ color: p.tier ? TIER_META[p.tier]?.color : undefined }}>
          {p.tier ? `${rankLabel(p.tier, p.division ?? "")} · ${p.lp} PDL` : "Sem ranqueada"}
        </p>
        <div className={`mt-5 flex gap-2 ${side === "b" ? "md:justify-end" : ""}`}>
          {p.champs.slice(0, 4).map((c) => (
            <Image key={c.key} src={championIcon(version, c.key)} alt={c.name} title={c.name} width={40} height={40} className="clip-step-sm" />
          ))}
        </div>
      </div>
    </div>
  );

  const rows = [
    ...AXES.map((ax) => ({ label: ax.label, va: pa.stats?.[ax.k] ?? 0, vb: pb.stats?.[ax.k] ?? 0, fmt: ax.fmt, better: "high" as const })),
    ...EXTRA.map((ex) => ({ label: ex.label, va: pa.stats?.[ex.k] ?? 0, vb: pb.stats?.[ex.k] ?? 0, fmt: ex.fmt, better: ex.better })),
  ];

  return (
    <div ref={root}>
      <div className="no-print mb-8 flex flex-wrap gap-2">
        {teams.map((t) => (
          <button
            key={t.slug}
            type="button"
            onClick={() => pickTeam(t.slug)}
            className={`clip-step-sm px-4 py-2 font-mono text-[0.7rem] uppercase tracking-[0.16em] transition-colors ${
              t.slug === pa.team.slug ? "bg-green text-bg-0" : "bg-bg-3 text-white hover:bg-white hover:text-bg-0"
            }`}
          >
            {t.name}
          </button>
        ))}
      </div>

      {/* Duelo: divisão pelo chevron do escudo */}
      <div className="clip-step relative grid bg-bg-2 md:grid-cols-2">
        {renderSide(pa, "a")}
        {renderSide(pb, "b")}
        <div className="pointer-events-none absolute inset-y-0 left-1/2 hidden w-24 -translate-x-1/2 md:block">
          <svg viewBox="0 0 40 100" preserveAspectRatio="none" className="size-full">
            <path d="M20 0 L20 38 L8 50 L20 62 L20 100" stroke="#262b33" strokeWidth="1" fill="none" vectorEffect="non-scaling-stroke" />
          </svg>
          <span className="absolute left-1/2 top-1/2 flex size-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center bg-bg-0 font-display text-2xl font-black text-white clip-step-sm">
            VS
          </span>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.3fr]">
        {/* Radar */}
        <div className="clip-step bg-bg-2 p-6">
          <p className="label-mono">Perfil de jogo</p>
          <svg viewBox="-12 -6 124 112" className="mx-auto mt-4 w-full max-w-[420px]">
            {[0.25, 0.5, 0.75, 1].map((lv) => (
              <polygon
                key={lv}
                points={AXES.map((_, i) => point(i, lv).join(",")).join(" ")}
                fill="none"
                stroke="rgb(255 255 255 / .08)"
                strokeWidth=".4"
              />
            ))}
            {AXES.map((ax, i) => {
              const [x, y] = point(i, 1);
              const [lx, ly] = point(i, 1.2);
              return (
                <g key={ax.k}>
                  <line x1="50" y1="50" x2={x} y2={y} stroke="rgb(255 255 255 / .08)" strokeWidth=".4" />
                  <text x={lx} y={ly} fill="#8a8f98" fontSize="3.6" textAnchor="middle" dominantBaseline="middle" fontFamily="var(--font-mono)">
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
        </div>

        {/* Barras lado a lado */}
        <div className="clip-step bg-bg-2 p-6">
          <p className="label-mono">Métrica por métrica</p>
          <ul className="mt-5 space-y-4">
            {rows.map((r) => {
              const max = Math.max(r.va, r.vb) || 1;
              const aWins = r.better === "high" ? r.va > r.vb : r.better === "low" ? r.va < r.vb : false;
              const bWins = r.better === "high" ? r.vb > r.va : r.better === "low" ? r.vb < r.va : false;
              return (
                <li key={r.label}>
                  <div className="mb-1.5 grid grid-cols-[1fr_auto_1fr] items-baseline gap-3 font-mono text-xs">
                    <span className={aWins ? "font-semibold text-green" : "text-gray"}>{r.fmt(r.va)}</span>
                    <span className="text-center text-[0.62rem] uppercase tracking-[0.16em] text-gray-dim">{r.label}</span>
                    <span className={`text-right ${bWins ? "font-semibold text-silver" : "text-gray"}`}>{r.fmt(r.vb)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    <div className="flex h-1.5 justify-end bg-bg-3">
                      <span data-cmp-bar className="h-full" style={{ width: `${(r.va / max) * 100}%`, background: aWins ? COLOR_A : "#5a606a", ["--o" as string]: "right center" }} />
                    </div>
                    <div className="h-1.5 bg-bg-3">
                      <span data-cmp-bar className="block h-full" style={{ width: `${(r.vb / max) * 100}%`, background: bWins ? COLOR_B : "#5a606a", ["--o" as string]: "left center" }} />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="mt-6 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-gray-dim">
            Médias das ranqueadas recentes de cada jogador
          </p>
        </div>
      </div>
    </div>
  );
}
