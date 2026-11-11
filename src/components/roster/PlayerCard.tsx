"use client";

import Link from "next/link";
import Image from "next/image";
import { useRef, useState } from "react";
import gsap from "gsap";
import type { Role } from "@/db/schema";
import { LaneIcon } from "@/components/brand/LaneIcon";
import { ROLE_META, TIER_META, rankLabel, pct } from "@/lib/format";
import { championLoading } from "@/lib/ddragon-urls";

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
        <div className="absolute inset-0 bg-gradient-to-t from-bg-0 via-bg-0/70 to-transparent" />
        <div className="absolute inset-0 bg-dots opacity-40 mix-blend-overlay" />

        <div className="absolute left-4 top-4 flex items-center gap-2">
          <LaneIcon role={p.role} className="size-7" />
          <span className="font-mono text-[0.68rem] uppercase tracking-[0.2em] text-white-dim">{ROLE_META[p.role].short}</span>
        </div>
        <span className="absolute right-4 top-4 font-pixel text-xs text-white/30">0{index + 1}</span>

        <div className="absolute inset-x-0 bottom-0 p-5">
          {p.splash[skin] && (
            <p className="mb-2 font-mono text-[0.62rem] uppercase tracking-[0.2em] text-gray transition-opacity">
              {p.splash[skin].name}
            </p>
          )}
          <h3 className="font-display text-4xl font-black uppercase leading-none text-white transition-colors group-hover:text-green">
            {p.displayName}
          </h3>
          <p className="mt-1 truncate font-mono text-[0.7rem] text-gray">{p.riotId}</p>
          <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
            <span className="flex items-center gap-2 font-mono text-[0.7rem] uppercase tracking-wider" style={{ color: tierColor }}>
              <span className="size-1.5 rotate-45" style={{ background: tierColor }} />
              {p.tier ? `${rankLabel(p.tier, p.division ?? "")} · ${p.lp} PDL` : "Sem ranqueada"}
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
