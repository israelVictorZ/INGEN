"use client";

import { useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { NEWS_CATEGORY_LABEL } from "@/lib/format";

/** Filtro por categoria com transição: recebe os cards já renderizados no servidor. */
export function NewsGrid({ items }: { items: { category: string; node: React.ReactNode; key: string }[] }) {
  const [cat, setCat] = useState<string | null>(null);
  const grid = useRef<HTMLDivElement>(null);
  const cats = [...new Set(items.map((i) => i.category))];

  useGSAP(
    () => {
      gsap.fromTo(grid.current!.children, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.05, ease: "expo.out" });
    },
    { scope: grid, dependencies: [cat], revertOnUpdate: false },
  );

  const shown = items.filter((i) => !cat || i.category === cat);
  return (
    <>
      <div className="no-print flex flex-wrap gap-2">
        {[null, ...cats].map((c) => (
          <button
            key={c ?? "all"}
            type="button"
            onClick={() => setCat(c)}
            className={`clip-step-sm px-4 py-2 font-mono text-[0.7rem] uppercase tracking-[0.16em] transition-colors ${
              cat === c ? "bg-green text-bg-0" : "bg-bg-3 text-white hover:bg-white hover:text-bg-0"
            }`}
          >
            {c ? NEWS_CATEGORY_LABEL[c] : "Todas"}
          </button>
        ))}
      </div>
      <div ref={grid} className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {shown.map((i) => (
          <div key={i.key}>{i.node}</div>
        ))}
      </div>
    </>
  );
}
