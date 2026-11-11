"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type SelectOption = {
  value: string;
  /** texto usado na busca, no leitor de tela e no gatilho (quando não há renderValue) */
  label: string;
  group?: string;
  disabled?: boolean;
  /** palavras extras para a busca (ex.: elo, lane) */
  keywords?: string;
};

/**
 * Select personalizado no visual da INGEN (substitui o <select> nativo).
 * Acessível: combobox + listbox, setas, Home/End, Enter, Esc, busca por digitação e grupos.
 */
export function Select({
  value,
  options,
  onChange,
  label,
  renderOption,
  renderValue,
  accent = "#3dfd4e",
  align = "left",
  searchable,
  className = "",
}: {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  label: string;
  renderOption?: (o: SelectOption, state: { selected: boolean; active: boolean }) => React.ReactNode;
  renderValue?: (o: SelectOption | undefined) => React.ReactNode;
  accent?: string;
  align?: "left" | "right";
  searchable?: boolean;
  className?: string;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(-1);
  const root = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const typeahead = useRef({ text: "", at: 0 });
  const withSearch = searchable ?? options.length > 8;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => `${o.label} ${o.keywords ?? ""} ${o.group ?? ""}`.toLowerCase().includes(q));
  }, [options, query]);
  const selected = options.find((o) => o.value === value);

  const openList = () => {
    setQuery("");
    setActive(Math.max(0, options.findIndex((o) => o.value === value)));
    setOpen(true);
  };
  const close = (focusTrigger = true) => {
    setOpen(false);
    if (focusTrigger) trigger.current?.focus();
  };
  const choose = (o: SelectOption | undefined) => {
    if (!o || o.disabled) return;
    onChange(o.value);
    close();
  };

  // fecha ao clicar fora
  useEffect(() => {
    if (!open) return;
    const on = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!root.current?.contains(t) && !pop.current?.contains(t)) setOpen(false);
    };
    document.addEventListener("pointerdown", on);
    return () => document.removeEventListener("pointerdown", on);
  }, [open]);

  // o painel vai para o <body> (os cards têm overflow/clip-path) e acompanha o gatilho
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const r = trigger.current?.getBoundingClientRect();
      if (!r) return;
      const w = Math.min(340, window.innerWidth - 32);
      const left = align === "right" ? r.right - w : r.left;
      setPos({ top: r.bottom + 8, left: Math.max(16, Math.min(left, window.innerWidth - w - 16)) });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, align]);

  // foco na busca e item ativo visível
  useEffect(() => {
    if (open && withSearch) search.current?.focus();
    else if (open) list.current?.focus();
  }, [open, withSearch]);
  useEffect(() => {
    if (!open || active < 0) return;
    list.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const move = (dir: 1 | -1, from = active) => {
    if (!filtered.length) return;
    let i = from;
    for (let n = 0; n < filtered.length; n++) {
      i = (i + dir + filtered.length) % filtered.length;
      if (!filtered[i].disabled) break;
    }
    setActive(i);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        openList();
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        move(1);
        break;
      case "ArrowUp":
        e.preventDefault();
        move(-1);
        break;
      case "Home":
        e.preventDefault();
        move(1, -1);
        break;
      case "End":
        e.preventDefault();
        move(-1, filtered.length);
        break;
      case "Enter":
        e.preventDefault();
        choose(filtered[active]);
        break;
      case "Escape":
        e.preventDefault();
        close();
        break;
      case "Tab":
        setOpen(false);
        break;
      default:
        // busca por digitação quando não há campo de busca
        if (!withSearch && e.key.length === 1) {
          const now = e.timeStamp;
          const t = typeahead.current;
          t.text = now - t.at > 700 ? e.key.toLowerCase() : t.text + e.key.toLowerCase();
          t.at = now;
          const i = filtered.findIndex((o) => !o.disabled && o.label.toLowerCase().includes(t.text));
          if (i >= 0) setActive(i);
        }
    }
  };

  // agrupa mantendo a ordem original
  const groups: { name: string | undefined; items: { o: SelectOption; i: number }[] }[] = [];
  filtered.forEach((o, i) => {
    const g = groups.find((x) => x.name === o.group);
    if (g) g.items.push({ o, i });
    else groups.push({ name: o.group, items: [{ o, i }] });
  });

  return (
    <div ref={root} className={`relative inline-block ${className}`} onKeyDown={onKey}>
      <button
        ref={trigger}
        type="button"
        role="combobox"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        onClick={() => (open ? close() : openList())}
        className={`clip-step-sm group flex min-w-[220px] items-center gap-3 bg-bg-3 py-2.5 pl-4 pr-3 text-left text-white outline-none transition-colors hover:bg-[#232831] focus-visible:ring-1 ${
          open ? "bg-[#232831]" : ""
        }`}
        style={{ ["--tw-ring-color" as string]: accent }}
      >
        <span className="min-w-0 flex-1">{renderValue ? renderValue(selected) : <span className="font-mono text-[0.72rem] uppercase tracking-[0.16em]">{selected?.label ?? "Selecionar"}</span>}</span>
        <svg
          viewBox="0 0 12 12"
          aria-hidden
          className={`size-3 shrink-0 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke={accent}
          strokeWidth="1.6"
        >
          <path d="M2 4.5h2V6h1.5v1.5h1V6H8V4.5h2" />
        </svg>
      </button>

      {open && pos && createPortal(
        <div
          ref={pop}
          style={{ top: pos.top, left: pos.left }}
          className="fixed z-[70] w-[min(340px,calc(100vw-32px))] origin-top animate-[pin-in_0.35s_var(--ease-out-expo)_both] border border-line bg-bg-0/95 shadow-[0_24px_60px_-12px_rgb(0_0_0/0.9)] backdrop-blur-xl"
        >
          <span className="pointer-events-none absolute inset-x-0 top-0 h-px" style={{ background: accent }} />
          {withSearch && (
            <div className="border-b border-line p-2">
              <input
                ref={search}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                placeholder="Buscar jogador, lane ou elo…"
                aria-label="Buscar"
                aria-controls={`${id}-list`}
                aria-activedescendant={active >= 0 ? `${id}-opt-${active}` : undefined}
                className="w-full bg-bg-2 px-3 py-2 font-mono text-[0.72rem] text-white placeholder:text-gray-dim outline-none"
              />
            </div>
          )}
          <ul
            ref={list}
            id={`${id}-list`}
            role="listbox"
            tabIndex={-1}
            aria-label={label}
            aria-activedescendant={!withSearch && active >= 0 ? `${id}-opt-${active}` : undefined}
            className="max-h-[min(360px,60vh)] overflow-y-auto overscroll-contain p-1.5 outline-none"
          >
            {groups.map((g) => (
              <li key={g.name ?? "_"} role="presentation">
                {g.name && (
                  <p className="flex items-center gap-2 px-2.5 pb-1.5 pt-2.5 font-mono text-[0.58rem] uppercase tracking-[0.2em] text-gray-dim">
                    <span className="size-1 bg-gray-dim" /> {g.name}
                  </p>
                )}
                <ul role="group" aria-label={g.name}>
                  {g.items.map(({ o, i }) => {
                    const isSel = o.value === value;
                    const isAct = i === active;
                    return (
                      <li
                        key={o.value}
                        id={`${id}-opt-${i}`}
                        data-index={i}
                        role="option"
                        aria-selected={isSel}
                        aria-disabled={o.disabled || undefined}
                        onPointerMove={() => !o.disabled && setActive(i)}
                        onClick={() => choose(o)}
                        className={`relative flex cursor-pointer items-center gap-3 px-2.5 py-2 transition-colors ${
                          o.disabled ? "cursor-not-allowed opacity-35" : isAct ? "bg-bg-3" : ""
                        }`}
                      >
                        <span className="absolute inset-y-1 left-0 w-0.5 transition-opacity" style={{ background: accent, opacity: isSel ? 1 : 0 }} />
                        <span className="min-w-0 flex-1">
                          {renderOption ? renderOption(o, { selected: isSel, active: isAct }) : <span className="font-mono text-xs text-white">{o.label}</span>}
                        </span>
                        {isSel && (
                          <svg viewBox="0 0 12 12" className="size-3 shrink-0" fill="none" stroke={accent} strokeWidth="1.8" aria-hidden>
                            <path d="M2 6.5 5 9l5-6" />
                          </svg>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
            {!filtered.length && <li className="px-3 py-6 text-center font-mono text-xs text-gray-dim">Nada encontrado</li>}
          </ul>
        </div>,
        document.body,
      )}
    </div>
  );
}
