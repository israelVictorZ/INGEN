"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { GLOSSARY, termFor, type Term } from "@/lib/glossary";

type Pos = { x: number; y: number; below: boolean };

/**
 * Ícone (i) com a explicação de uma métrica (#35).
 * A dica vai para o <body> (portal) para não ser cortada pelos cards com `clip-path`.
 * Abre com mouse, foco do teclado ou toque; fecha ao sair, rolar a página, tocar fora ou Esc.
 */
export function InfoTip({ text, label, className = "" }: { text: string; label: string; className?: string }) {
  const btn = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<Pos | null>(null);
  const id = useId();

  const show = () => {
    const r = btn.current?.getBoundingClientRect();
    if (!r) return;
    const half = Math.min(130, window.innerWidth / 2 - 8);
    const below = r.top < 120;
    setPos({ x: Math.min(Math.max(r.left + r.width / 2, half + 8), window.innerWidth - half - 8), y: below ? r.bottom + 8 : r.top - 8, below });
  };
  const hide = () => setPos(null);

  useEffect(() => {
    if (!pos) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && hide();
    const onDown = (e: PointerEvent) => !btn.current?.contains(e.target as Node) && hide();
    window.addEventListener("scroll", hide, { passive: true, capture: true });
    window.addEventListener("resize", hide);
    window.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("scroll", hide, { capture: true });
      window.removeEventListener("resize", hide);
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [pos]);

  return (
    <>
      <button
        ref={btn}
        type="button"
        aria-label={`O que é ${label}?`}
        aria-describedby={pos ? id : undefined}
        onPointerEnter={(e) => e.pointerType === "mouse" && show()}
        onPointerLeave={(e) => e.pointerType === "mouse" && hide()}
        onFocus={show}
        onBlur={hide}
        onClick={(e) => {
          // dentro de links/cards: só abre a dica, não navega
          e.preventDefault();
          e.stopPropagation();
          show();
        }}
        className={`no-print inline-flex size-3.5 shrink-0 cursor-help items-center justify-center rounded-full border border-gray-dim/70 align-middle font-mono text-[0.5rem] normal-case leading-none tracking-normal text-gray transition-colors hover:border-green hover:text-green ${className}`}
      >
        i
      </button>
      {pos &&
        createPortal(
          <span
            id={id}
            role="tooltip"
            className="pointer-events-none fixed z-[100] w-max max-w-[260px] border border-line bg-bg-0 px-3 py-2 text-left font-sans text-xs normal-case leading-snug tracking-normal text-white-dim shadow-[0_8px_30px_rgb(0_0_0/0.6)]"
            style={{ left: pos.x, top: pos.y, transform: `translate(-50%, ${pos.below ? "0" : "-100%"})` }}
          >
            {text}
          </span>,
          document.body,
        )}
    </>
  );
}

/**
 * Rótulo de métrica + (i) quando o termo existe no glossário. Uso: <MetricLabel label="CS / min" />.
 * `term` força o verbete quando o rótulo não basta para identificá-lo.
 */
export function MetricLabel({ label, term, children }: { label: string; term?: Term; children?: React.ReactNode }) {
  const t = term ?? termFor(label);
  return (
    <span className="inline-flex items-center gap-1.5">
      {children ?? label}
      {t && <InfoTip text={GLOSSARY[t]} label={label} />}
    </span>
  );
}
