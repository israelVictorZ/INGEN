"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import type { LiveMap } from "@/lib/live";

/* Store compartilhado: um único fetch de /api/live para todos os selos da página, renovado a cada 60s. */
let state: LiveMap = {};
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;

async function refresh() {
  try {
    const res = await fetch("/api/live", { cache: "no-store" });
    state = await res.json();
    listeners.forEach((l) => l());
  } catch {
    /* sem rede: mantém o último estado */
  }
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  if (!timer) {
    refresh();
    timer = setInterval(refresh, 60_000);
  }
  return () => {
    listeners.delete(cb);
    if (!listeners.size && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

const EMPTY: LiveMap = {};
export function useLive() {
  return useSyncExternalStore(subscribe, () => state, () => EMPTY);
}

const Dot = () => (
  <span className="relative flex size-2">
    <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#ff2e4d] opacity-75" />
    <span className="relative inline-flex size-2 rounded-full bg-[#ff2e4d]" />
  </span>
);

/** Selo pequeno "AO VIVO" (some quando o jogador não está transmitindo). */
export function LiveBadge({ slug, className = "" }: { slug: string; className?: string }) {
  const live = useLive()[slug];
  if (!live?.isLive) return null;
  return (
    <span className={`inline-flex items-center gap-1.5 bg-bg-0/90 px-2 py-1 font-mono text-[0.6rem] font-medium uppercase tracking-[0.16em] text-white ${className}`}>
      <Dot /> Ao vivo
    </span>
  );
}

/** Botão da Twitch no perfil: mostra se está ao vivo, título e espectadores. */
export function TwitchButton({ slug, channel }: { slug: string; channel: string }) {
  const live = useLive()[slug];
  const on = !!live?.isLive;
  return (
    <a
      href={`https://www.twitch.tv/${channel}`}
      target="_blank"
      rel="noopener noreferrer"
      className={`clip-step-sm group inline-flex items-center gap-3 px-5 py-3 font-mono text-[0.75rem] font-medium uppercase tracking-[0.16em] transition-colors ${
        on ? "bg-[#9146ff] text-white hover:bg-[#a970ff]" : "bg-bg-3 text-white hover:bg-white hover:text-bg-0"
      }`}
      title={on ? live?.title ?? undefined : undefined}
    >
      <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden>
        <path d="M4.3 3 3 6.4v13.1h4.5V22h2.5l2.5-2.5h3.7L21 14.8V3H4.3Zm15 10.9-2.9 2.9h-4.5l-2.5 2.5v-2.5H5.7V4.7h13.6v9.2ZM16.4 7.7v4.8h-1.7V7.7h1.7Zm-4.6 0v4.8h-1.7V7.7h1.7Z" />
      </svg>
      {on ? (
        <>
          <Dot /> Ao vivo{live?.viewers != null && ` · ${live.viewers}`}
        </>
      ) : (
        "Twitch"
      )}
    </a>
  );
}

/** Faixa "Ao vivo agora" na home: aparece só quando alguém está transmitindo. */
export function LiveNowStrip({ names }: { names: Record<string, string> }) {
  const live = useLive();
  const on = Object.entries(live).filter(([, v]) => v.isLive);
  if (!on.length) return null;
  return (
    <div className="border-y border-[#9146ff]/40 bg-[#9146ff]/10">
      <div className="wrap flex flex-wrap items-center gap-x-6 gap-y-2 py-3">
        <span className="flex items-center gap-2 font-mono text-[0.68rem] uppercase tracking-[0.2em] text-white">
          <Dot /> Ao vivo agora
        </span>
        {on.map(([slug, v]) => (
          <span key={slug} className="flex items-center gap-3">
            <Link href={`/jogador/${slug}`} className="font-display text-lg font-extrabold uppercase text-white hover:text-green">
              {names[slug] ?? slug}
            </Link>
            <a
              href={`https://www.twitch.tv/${v.channel}`}
              target="_blank"
              rel="noopener noreferrer"
              className="max-w-[40ch] truncate font-mono text-xs text-[#c4a6ff] hover:text-white"
            >
              {v.title ?? "twitch.tv/" + v.channel} ↗
            </a>
          </span>
        ))}
      </div>
    </div>
  );
}
