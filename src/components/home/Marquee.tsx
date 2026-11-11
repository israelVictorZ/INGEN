"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger);

/** Faixa de texto gigante: anda sozinha e acelera/inclina com a velocidade do scroll. */
export function Marquee({ items }: { items: string[] }) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const rows = gsap.utils.toArray<HTMLElement>("[data-row]", root.current);
      const loops = rows.map((row, i) =>
        gsap.to(row, { xPercent: i % 2 ? 0 : -50, startAt: { xPercent: i % 2 ? -50 : 0 }, duration: 38, ease: "none", repeat: -1 }),
      );
      const skew = gsap.quickTo(rows, "skewX", { duration: 0.5, ease: "power3" });
      ScrollTrigger.create({
        trigger: root.current,
        start: "top bottom",
        end: "bottom top",
        onUpdate: (self) => {
          const v = self.getVelocity();
          loops.forEach((l) => l.timeScale(1 + Math.min(Math.abs(v) / 600, 5)));
          skew(gsap.utils.clamp(-8, 8, v / -250));
          gsap.delayedCall(0.15, () => loops.forEach((l) => gsap.to(l, { timeScale: 1, duration: 0.8 })));
        },
      });
    },
    { scope: root },
  );

  const line = [...items, ...items, ...items];
  return (
    <div ref={root} className="relative overflow-hidden border-y border-line bg-bg-0 py-6" aria-hidden>
      {[0, 1].map((r) => (
        <div key={r} data-row className="flex w-max whitespace-nowrap">
          {[0, 1].map((half) => (
            <div key={half} className="flex">
              {line.map((t, i) => (
                <span
                  key={i}
                  className={`flex items-center px-6 font-display text-[clamp(2.4rem,6vw,5rem)] font-black uppercase leading-[1.05] ${
                    (i + r) % 2 ? "text-transparent [-webkit-text-stroke:1px_rgb(255_255_255/0.28)]" : "text-white"
                  }`}
                >
                  {t}
                  <span className="ml-12 inline-block size-3 rotate-45 bg-green" />
                </span>
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
