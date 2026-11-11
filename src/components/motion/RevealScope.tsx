"use client";

import { useRef } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { revealElement } from "./reveal";

/**
 * Envolve o conteúdo de uma página. Depois que ESTE trecho hidrata,
 * anima todos os `[data-reveal]` dentro dele (nunca mexe no DOM antes da hidratação).
 */
export function RevealScope({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    (_ctx, contextSafe) => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      let alive = true;
      const run = contextSafe!(() => {
        if (!alive) return;
        ref.current?.querySelectorAll<HTMLElement>("[data-reveal]").forEach((el) => revealElement(el, reduce));
        ScrollTrigger.refresh();
      });
      // espera as fontes para medir posições corretamente
      document.fonts.ready.then(run);
      return () => {
        alive = false;
      };
    },
    { scope: ref },
  );

  return (
    <div ref={ref} className="contents">
      {children}
    </div>
  );
}
