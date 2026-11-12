"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Sumário do guia: aparece no topo da página e, quando sai da tela, vira uma barra fixa
 * logo abaixo do header do site, com a seção atual destacada e a barra de progresso da leitura.
 */
export function GuideToc({ items }: { items: { id: string; label: string }[] }) {
  const inline = useRef<HTMLElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);
  const [active, setActive] = useState(items[0]?.id ?? "");
  const [progress, setProgress] = useState(0);

  // barra fixa quando o sumário original sai por cima da tela
  useEffect(() => {
    const el = inline.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setStuck(!e.isIntersecting && e.boundingClientRect.top < 0), { rootMargin: "-64px 0px 0px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // seção atual + progresso
  useEffect(() => {
    const sections = items.map((i) => document.getElementById(i.id)).filter((x): x is HTMLElement => !!x);
    const onScroll = () => {
      const y = window.scrollY + window.innerHeight * 0.3;
      let current = sections[0]?.id ?? "";
      for (const s of sections) if (s.offsetTop <= y) current = s.id;
      setActive(current);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(1, window.scrollY / max) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [items]);

  // no celular a barra rola de lado: mantém o item atual visível
  useEffect(() => {
    const b = bar.current;
    const a = b?.querySelector<HTMLElement>(`[data-id="${active}"]`);
    if (b && a) b.scrollTo({ left: a.offsetLeft - b.clientWidth / 2 + a.clientWidth / 2, behavior: "smooth" });
  }, [active]);

  const go = (id: string) => (e: React.MouseEvent) => {
    const el = document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 140 });
    history.replaceState(null, "", `#${id}`);
  };

  const link = (i: { id: string; label: string }, n: number, compact: boolean) => (
    <a
      key={i.id}
      href={`#${i.id}`}
      data-id={i.id}
      onClick={go(i.id)}
      aria-current={active === i.id ? "location" : undefined}
      className={`shrink-0 whitespace-nowrap font-mono text-[0.7rem] uppercase tracking-[0.14em] transition ${
        compact ? "px-3 py-2" : ""
      } ${active === i.id && compact ? "bg-deep text-lime" : "text-gray hover:text-green"}`}
    >
      <span className={active === i.id && compact ? "text-green" : "text-gray-dim"}>{String(n + 1).padStart(2, "0")}</span> {i.label}
    </a>
  );

  return (
    <>
      <nav ref={inline} aria-label="Seções do guia" className="flex flex-wrap gap-x-6 gap-y-3">
        {items.map((i, n) => link(i, n, false))}
      </nav>
      <div
        aria-hidden={!stuck}
        className={`fixed inset-x-0 top-16 z-40 border-b border-line bg-bg-1/90 backdrop-blur-md transition duration-300 ${
          stuck ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-3 opacity-0"
        }`}
      >
        <div ref={bar} className="wrap flex items-center gap-1 overflow-x-auto py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {items.map((i, n) => link(i, n, true))}
        </div>
        <div className="h-px bg-[image:var(--grad-ingen-x)] transition-[width] duration-150" style={{ width: `${progress * 100}%` }} />
      </div>
    </>
  );
}
