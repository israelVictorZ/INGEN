"use client";

import Link from "next/link";
import Image from "next/image";
import { useRef, useState } from "react";
import gsap from "gsap";
import type { Role } from "@/db/schema";
import { LaneIcon } from "@/components/brand/LaneIcon";
import { ROLE_META, TIER_META, rankLabel, pct } from "@/lib/format";
import { championLoading } from "@/lib/ddragon-urls";
import { LiveBadge } from "@/components/live/Live";

export type PlayerCardData = {
  slug: string;
  displayName: string;
  riotId: string;
  role: Role;
  accent: string;
  tier: string | null;
  division: string | null;
  lp: number | null;
  winrate: number | null;
  splash: { key: string; name: string }[];
};

/**
 * Card do jogador: tilt 3D + "troca de skin" (inspirado no ng.cash).
 * No hover, a splash alterna entre os campeões mais jogados.
 */
export function PlayerCard({ p, index = 0 }: { p: PlayerCardData; index?: number }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const [skin, setSkin] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const tierColor = p.tier ? TIER_META[p.tier]?.color : undefined;

  const onMove = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width - 0.5;
    const ny = (e.clientY - r.top) / r.height - 0.5;
    gsap.to(ref.current, { rotationY: nx * 10, rotationX: -ny * 10, duration: 0.6, ease: "power3" });
    gsap.to(ref.current!.querySelector("[data-splash]"), { x: nx * -18, y: ny * -18, duration: 0.8, ease: "power3" });
  };
  const onEnter = () => {
    if (p.splash.length < 2) return;
    timer.current = setInterval(() => setSkin((s) => (s + 1) % p.splash.length), 1100);
  };
  const onLeave = () => {
    if (timer.current) clearInterval(timer.current);
    setSkin(0);
    gsap.to(ref.current, { rotationY: 0, rotationX: 0, duration: 0.9, ease: "elastic.out(1,0.6)" });
    gsap.to(ref.current!.querySelector("[data-splash]"), { x: 0, y: 0, duration: 0.9 });
  };

  return (
    <div className="[perspective:1000px]">
      <Link
        ref={ref}
        href={`/jogador/${p.slug}`}
        onPointerMove={onMove}
        onPointerEnter={onEnter}
        onPointerLeave={onLeave}
        className="border-run clip-step group relative block aspect-[3/4.2] overflow-hidden bg-bg-2 [transform-style:preserve-3d]"
      >
        <div data-splash className="absolute -inset-6">
          {p.splash.map((s, i) => (
            <Image
              key={s.key}
              src={championLoading(s.key)}
              alt=""
              fill
              sizes="(min-width: 1024px) 22vw, 50vw"
              className={`object-cover object-[50%_12%] transition-[opacity,filter] duration-700 ${
                i === skin ? "opacity-60 group-hover:opacity-90" : "opacity-0"
              } grayscale-[0.35] group-hover:grayscale-0`}
            />
          ))}
        </div>
        {/* véus escuros: o texto fica legível mesmo com splash clara (ex.: Seraphine, Lux) */}
        <div className="absolute inset-0 bg-gradient-to-t from-bg-0 from-[28%] via-bg-0/80 via-[52%] to-transparent to-[82%]" />
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-bg-0/75 to-transparent" />
        <div className="absolute inset-0 bg-dots opacity-40 mix-blend-overlay" />

        <div className="absolute left-3 top-3 flex items-center gap-2 bg-bg-0/70 py-1 pl-1.5 pr-2.5 backdrop-blur-sm">
          <LaneIcon role={p.role} className="size-6" />
          <span className="font-mono text-[0.66rem] uppercase tracking-[0.2em] text-white">{ROLE_META[p.role].short}</span>
        </div>
        <span className="absolute right-3 top-3 bg-bg-0/70 px-2 py-1.5 font-pixel text-xs text-white/60 backdrop-blur-sm">0{index + 1}</span>
        <LiveBadge slug={p.slug} className="absolute right-3 top-10 z-10" />

        <div className="absolute inset-x-0 bottom-0 p-5 lg:max-xl:p-4">
          {p.splash[skin] && (
            <p className="mb-2 font-mono text-[0.62rem] uppercase tracking-[0.2em] text-white-dim transition-opacity">
              {p.splash[skin].name}
            </p>
          )}
          <h3 className="truncate font-display text-3xl font-black uppercase leading-none text-white sm:text-4xl transition-colors [text-shadow:0_2px_12px_rgb(0_0_0/0.8)] group-hover:text-green">
            {p.displayName}
          </h3>
          <p className="mt-1 truncate font-mono text-[0.7rem] text-white-dim">{p.riotId}</p>
          <div className="mt-4 flex items-center justify-between gap-2 border-t border-white/10 pt-3">
            <span className="flex min-w-0 items-center gap-2 font-mono text-[0.62rem] uppercase tracking-wider sm:text-[0.7rem]" style={{ color: tierColor }}>
              <span className="size-1.5 shrink-0 rotate-45" style={{ background: tierColor }} />
              <span className="truncate">
                {p.tier ? rankLabel(p.tier, p.division ?? "") : "Sem ranqueada"}
                {p.tier && <span className="hidden sm:inline lg:hidden"> · {p.lp} PDL</span>}
              </span>
            </span>
            {p.winrate != null && (
              <span className={`font-mono text-[0.7rem] ${p.winrate >= 0.5 ? "text-green" : "text-gray"}`}>{pct(p.winrate)}</span>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}

/**
 * Versão do card para o mobile: linha na largura toda, splash do campeão principal
 * à direita (esmaecendo para a esquerda) e as infos à esquerda. Sem tilt nem troca de skin.
 */
export function PlayerRow({ p, index = 0 }: { p: PlayerCardData; index?: number }) {
  const tierColor = p.tier ? TIER_META[p.tier]?.color : undefined;
  const main = p.splash[0];
  return (
    <Link
      href={`/jogador/${p.slug}`}
      className="border-run clip-step group relative flex items-stretch overflow-hidden bg-bg-2 active:bg-bg-3"
    >
      {main && (
        <div className="absolute inset-y-0 right-0 w-[58%]">
          <Image
            src={championLoading(main.key)}
            alt=""
            fill
            sizes="60vw"
            className="object-cover object-[50%_18%] opacity-55 grayscale-[0.35]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-bg-2 via-bg-2/70 to-transparent" />
        </div>
      )}
      <div className="absolute inset-0 bg-dots opacity-30 mix-blend-overlay" />

      {/* coluna da lane */}
      <div className="relative flex w-16 shrink-0 flex-col items-center justify-center gap-1.5 border-r border-white/5">
        <LaneIcon role={p.role} className="size-7" />
        <span className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-white-dim">{ROLE_META[p.role].short}</span>
      </div>

      <div className="relative min-w-0 flex-1 py-4 pl-4 pr-3">
        <div className="flex items-center gap-2">
          {main && <span className="truncate font-mono text-[0.58rem] uppercase tracking-[0.2em] text-gray">{main.name}</span>}
          <LiveBadge slug={p.slug} className="shrink-0" />
        </div>
        <h3 className="mt-1 truncate font-display text-[2rem] font-black uppercase leading-none text-white [text-shadow:0_2px_12px_rgb(0_0_0/0.8)]">
          {p.displayName}
        </h3>
        <p className="mt-1 truncate font-mono text-[0.66rem] text-white-dim">{p.riotId}</p>
        <p className="mt-2.5 flex min-w-0 items-center gap-2 font-mono text-[0.64rem] uppercase tracking-wider" style={{ color: tierColor }}>
          <span className="size-1.5 shrink-0 rotate-45" style={{ background: tierColor }} />
          <span className="truncate">
            {p.tier ? `${rankLabel(p.tier, p.division ?? "")} · ${p.lp} PDL` : "Sem ranqueada"}
          </span>
        </p>
      </div>

      <div className="relative flex shrink-0 flex-col items-end justify-between py-4 pr-4">
        <span className="bg-bg-0/70 px-1.5 py-1 font-pixel text-[0.65rem] text-white/60">0{index + 1}</span>
        {p.winrate != null && (
          <span className="text-right">
            <span className={`block font-display text-2xl font-black leading-none ${p.winrate >= 0.5 ? "text-green" : "text-gray"}`}>{pct(p.winrate)}</span>
            <span className="font-mono text-[0.55rem] uppercase tracking-[0.2em] text-gray [text-shadow:0_1px_6px_rgb(0_0_0/0.9)]">Winrate</span>
          </span>
        )}
      </div>
    </Link>
  );
}
