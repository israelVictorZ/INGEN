"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

const COLS = 12;
const ROWS = 7;

/**
 * Transição de página em "escada de pixels" (DNA das torres do escudo):
 * blocos verdes cobrem a tela e somem em degraus a cada navegação.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        gsap.set(ref.current, { display: "none" });
        return;
      }
      const cells = ref.current!.querySelectorAll("span");
      gsap
        .timeline({ onComplete: () => gsap.set(ref.current, { display: "none" }) })
        .to(cells, {
          scaleY: 0,
          duration: 0.45,
          ease: "steps(4)",
          stagger: { grid: [ROWS, COLS], from: "end", amount: 0.45 },
        });
    },
    { scope: ref },
  );

  return (
    <>
      <div
        ref={ref}
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[90] grid"
        style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)`, gridTemplateRows: `repeat(${ROWS}, 1fr)` }}
      >
        {Array.from({ length: COLS * ROWS }, (_, i) => {
          const row = Math.floor(i / COLS);
          return (
            <span
              key={i}
              className="block origin-top"
              style={{ background: row < 2 ? "#7cf94f" : row < 5 ? "#3dfd4e" : "#00f07f", marginBottom: -1, marginRight: -1 }}
            />
          );
        })}
      </div>
      {children}
    </>
  );
}
