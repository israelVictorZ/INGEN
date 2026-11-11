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
  TOP: { x: 14, y: 17 },
  JUNGLE: { x: 31, y: 44 },
  MID: { x: 52, y: 49 },
  ADC: { x: 72, y: 86 },
  SUPPORT: { x: 87, y: 70 },
};

/** Lanes no padrão do minimapa: cada uma sai da base aliada (canto inferior esquerdo) e termina na base inimiga. */
const LANE_PATH: Record<string, string> = {
  TOP: "M 10 81 L 10 15 Q 10 10 15 10 L 81 10",
  MID: "M 19 81 L 81 19",
  BOT: "M 19 90 L 85 90 Q 90 90 90 85 L 90 19",
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
        .fromTo(q("[data-river]"), { drawSVG: "50% 50%" }, { drawSVG: "0% 100%", duration: 1.1, ease: "power2.out" }, "<0.2")
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
          {/* rio: atravessa o mapa do canto superior esquerdo ao inferior direito */}
          <path data-river d="M 2 2 L 98 98" stroke="rgb(0 240 127 / .06)" strokeWidth="13" strokeLinecap="round" />
          <path data-river d="M 6 6 L 94 94" stroke="rgb(0 240 127 / .22)" strokeWidth=".5" strokeDasharray="1.2 1.6" />
          {/* acampamentos da selva */}
          {[[30, 30], [24, 52], [42, 66], [70, 70], [76, 48], [58, 34]].map(([x, y], i) => (
            <rect key={i} data-base x={x - 1.4} y={y - 1.4} width="2.8" height="2.8" transform={`rotate(45 ${x} ${y})`} fill="rgb(255 255 255 / .1)" />
          ))}
          {/* lanes: faixa larga + linha central */}
          {Object.entries(LANE_PATH).map(([k, d]) => {
            const hot = hotLane === k;
            return (
              <g key={k} style={{ transition: "opacity .3s" }} opacity={hotLane && !hot ? 0.45 : 1}>
                <path data-lane d={d} stroke={hot ? `${color}55` : "rgb(255 255 255 / .07)"} strokeWidth="5.5" strokeLinejoin="round" style={{ transition: "stroke .3s" }} />
                <path data-lane d={d} stroke={hot ? color : "rgb(255 255 255 / .28)"} strokeWidth={hot ? 1 : 0.6} strokeLinejoin="round" style={{ transition: "stroke .3s", filter: hot ? `drop-shadow(0 0 2px ${color})` : undefined }} />
              </g>
            );
          })}
          {/* bases opacas por cima das lanes */}
          <g data-base>
            <rect x="2" y="80" width="18" height="18" rx="2" fill="#0a0d13" stroke={color} strokeWidth=".8" />
            <rect x="6" y="84" width="10" height="10" rx="1" fill={color} />
          </g>
          <g data-base>
            <rect x="80" y="2" width="18" height="18" rx="2" fill="#0a0d13" stroke="rgb(255 255 255 / .3)" strokeWidth=".8" />
            <rect x="84" y="6" width="10" height="10" rx="1" fill="#262b33" />
          </g>
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
