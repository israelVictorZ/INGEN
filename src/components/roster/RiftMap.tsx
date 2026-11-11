"use client";

import Link from "next/link";
import Image from "next/image";
import { useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { useGSAP } from "@gsap/react";
import type { Role } from "@/db/schema";
import { LaneIcon } from "@/components/brand/LaneIcon";
import { ROLE_META, TIER_META, rankLabel } from "@/lib/format";

gsap.registerPlugin(ScrollTrigger, DrawSVGPlugin);

export type RiftSlot =
  | { kind: "player"; role: Role; slug: string; name: string; tier: string | null; division: string | null; lp: number | null; icon: string | null }
  | { kind: "open"; role: Role };

/** Posição de cada lane no minimapa (em %), lado azul. */
const POS: Record<Role, { x: number; y: number }> = {
  TOP: { x: 15, y: 17 },
  JUNGLE: { x: 33, y: 47 },
  MID: { x: 52, y: 50 },
  ADC: { x: 74, y: 88 },
  SUPPORT: { x: 89, y: 66 },
};

const LANE_PATH: Record<string, string> = {
  TOP: "M 8 96 L 8 12 Q 8 8 12 8 L 92 8",
  MID: "M 10 90 L 90 10",
  BOT: "M 8 92 L 88 92 Q 92 92 92 88 L 92 4",
};
const laneOf = (r: Role) => (r === "TOP" ? "TOP" : r === "MID" ? "MID" : r === "JUNGLE" ? null : "BOT");

/**
 * Mapa do Rift: o minimapa se desenha no scroll e os jogadores "pousam" nas suas lanes.
 */
export function RiftMap({ slots, accent }: { slots: RiftSlot[]; accent: string }) {
  const root = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<Role | null>(null);
  const color = accent === "silver" ? "#c9cdd3" : "#3dfd4e";

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const q = gsap.utils.selector(root);
      const tl = gsap.timeline({ scrollTrigger: { trigger: root.current, start: "top 75%", once: true } });
      tl.from(q("[data-map-frame]"), { autoAlpha: 0, scale: 0.96, duration: 0.8, ease: "expo.out" })
        .fromTo(q("[data-lane]"), { drawSVG: "0%" }, { drawSVG: "100%", duration: 1.4, ease: "power2.inOut", stagger: 0.12 }, "-=0.4")
        .fromTo(q("[data-river]"), { drawSVG: "50% 50%" }, { drawSVG: "0% 100%", duration: 1, ease: "power2.out" }, "<0.3")
        .from(q("[data-base]"), { scale: 0, transformOrigin: "50% 50%", duration: 0.6, ease: "back.out(2)", stagger: 0.1 }, "<")
        .from(q("[data-node]"), { scale: 0, autoAlpha: 0, duration: 0.7, ease: "back.out(2.2)", stagger: 0.1 }, "-=0.6");
    },
    { scope: root },
  );

  const hotLane = hover ? laneOf(hover) : null;

  return (
    <div ref={root} className="relative mx-auto aspect-square w-full max-w-[560px]">
      <div data-map-frame className="clip-step absolute inset-0 bg-bg-0">
        <div className="absolute inset-0 bg-dots opacity-50" />
        <svg viewBox="0 0 100 100" className="absolute inset-0 size-full" fill="none">
          {/* rio */}
          <path data-river d="M 0 100 L 100 0" stroke="rgb(255 255 255 / .04)" strokeWidth="18" />
          <path data-river d="M 18 18 Q 50 34 82 82" stroke="rgb(0 240 127 / .12)" strokeWidth="1.2" strokeDasharray="1.5 1.5" />
          {/* lanes */}
          {Object.entries(LANE_PATH).map(([k, d]) => (
            <path
              key={k}
              data-lane
              d={d}
              stroke={hotLane === k ? color : "rgb(255 255 255 / .16)"}
              strokeWidth={hotLane === k ? 2.6 : 1.6}
              strokeLinecap="square"
              style={{ transition: "stroke .3s, stroke-width .3s", filter: hotLane === k ? `drop-shadow(0 0 3px ${color})` : undefined }}
            />
          ))}
          {/* bases */}
          <rect data-base x="2" y="88" width="10" height="10" fill={color} opacity=".9" />
          <rect data-base x="88" y="2" width="10" height="10" fill="rgb(255 255 255 / .25)" />
        </svg>
      </div>

      {slots.map((s) => {
        const pos = POS[s.role];
        const active = hover === s.role;
        const inner = (
          <>
            <span
              className={`relative flex size-14 items-center justify-center overflow-hidden rounded-full border-2 bg-bg-2 transition-transform duration-300 md:size-16 ${
                active ? "scale-110" : ""
              } ${s.kind === "open" ? "border-dashed border-green/50" : ""}`}
              style={s.kind === "player" ? { borderColor: active ? color : "rgb(255 255 255 / .2)" } : undefined}
            >
              {s.kind === "player" && s.icon ? (
                <Image src={s.icon} alt="" fill sizes="64px" className="object-cover" />
              ) : (
                <LaneIcon role={s.role} className="size-8" />
              )}
              {s.kind === "open" && <span className="absolute inset-0 animate-[pulse-ring_2s_ease-out_infinite] rounded-full border border-green/60" />}
            </span>
            <span className="absolute -right-1 -top-1 flex size-6 items-center justify-center rounded-full border border-line bg-bg-0">
              <LaneIcon role={s.role} className="size-4" />
            </span>
            <span className="pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap text-center">
              <span className="block font-display text-lg font-extrabold uppercase leading-none text-white md:text-xl">
                {s.kind === "player" ? s.name : "Vaga aberta"}
              </span>
              <span
                className="block font-mono text-[0.6rem] uppercase tracking-[0.16em]"
                style={{ color: s.kind === "player" && s.tier ? TIER_META[s.tier]?.color : "#3dfd4e" }}
              >
                {s.kind === "player" ? (s.tier ? `${rankLabel(s.tier, s.division ?? "")}` : ROLE_META[s.role].short) : ROLE_META[s.role].short}
              </span>
            </span>
          </>
        );
        const cls = "absolute -translate-x-1/2 -translate-y-1/2 outline-none";
        const style = { left: `${pos.x}%`, top: `${pos.y}%`, zIndex: active ? 5 : 1 };
        const handlers = {
          onPointerEnter: () => setHover(s.role),
          onPointerLeave: () => setHover(null),
          onFocus: () => setHover(s.role),
          onBlur: () => setHover(null),
        };
        return (
          <div key={s.role} data-node className={cls} style={style}>
            {s.kind === "player" ? (
              <Link href={`/jogador/${s.slug}`} className="relative block" aria-label={`${s.name}, ${ROLE_META[s.role].label}`} {...handlers}>
                {inner}
              </Link>
            ) : (
              <Link href="/noticias/recrutamento-top-e-mid" className="relative block" aria-label={`Vaga aberta: ${ROLE_META[s.role].label}`} {...handlers}>
                {inner}
              </Link>
            )}
          </div>
        );
      })}
    </div>
  );
}
