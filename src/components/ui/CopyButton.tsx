"use client";

import { useState } from "react";

export function CopyButton({ text, label, done = "Copiado!", className = "" }: { text: string; label: string; done?: string; className?: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setOk(true);
          setTimeout(() => setOk(false), 1800);
        } catch {
          /* clipboard indisponível */
        }
      }}
      className={`clip-step-sm inline-flex items-center gap-2 bg-bg-3 px-4 py-2.5 font-mono text-[0.72rem] uppercase tracking-[0.16em] transition-colors hover:bg-white hover:text-bg-0 ${
        ok ? "!bg-green !text-bg-0" : "text-white"
      } ${className}`}
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
        {ok ? <path d="M1.5 6.5 4.5 9.5 10.5 2.5" stroke="currentColor" strokeWidth="1.8" /> : <path d="M4 1h7v7M1 4h7v7H1z" stroke="currentColor" strokeWidth="1.3" />}
      </svg>
      {ok ? done : label}
    </button>
  );
}

export function PrintButton({ label = "Salvar PDF" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="clip-step-sm inline-flex items-center gap-2 bg-bg-3 px-4 py-2.5 font-mono text-[0.72rem] uppercase tracking-[0.16em] text-white transition-colors hover:bg-white hover:text-bg-0"
    >
      ⎙ {label}
    </button>
  );
}
