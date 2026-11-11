"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useSyncExternalStore } from "react";
import type { LiveInfo, LivePayload } from "@/lib/live";
import { LINKS, TEAM_TWITCH_CHANNEL } from "@/lib/features";
import { TwitchIcon } from "@/components/brand/SocialIcons";

/* Store compartilhado: um único fetch de /api/live para todos os selos da página, renovado a cada 60s. */
type LiveState = LivePayload & { fetchedAt: number | null };
const EMPTY: LiveState = {
  team: { channel: TEAM_TWITCH_CHANNEL, isLive: false, title: null, viewers: null, game: null, thumbnail: null, startedAt: null },
  players: {},
  fetchedAt: null,
};
let state: LiveState = EMPTY;
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;

async function refresh() {
  try {
    const res = await fetch("/api/live", { cache: "no-store" });
    const data = (await res.json()) as LivePayload;
    state = { team: data.team ?? EMPTY.team, players: data.players ?? {}, fetchedAt: Date.now() };
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

export function useLive() {
  return useSyncExternalStore(subscribe, () => state, () => EMPTY);
}

/** "1h 20min no ar" a partir do início da transmissão (medido no último fetch). */
function uptime(info: LiveInfo, now: number | null) {
  if (!info.startedAt || !now) return null;
  const min = Math.max(0, Math.round((now - new Date(info.startedAt).getTime()) / 60000));
  const h = Math.floor(min / 60);
  return h ? `${h}h ${String(min % 60).padStart(2, "0")}min no ar` : `${min} min no ar`;
}

const twitchUrl = (channel: string) => `https://www.twitch.tv/${channel}`;
const fmtViewers = (n: number | null) => (!n ? null : new Intl.NumberFormat("pt-BR").format(n));

export const Dot = ({ className = "" }: { className?: string }) => (
  <span className={`relative flex size-2 ${className}`}>
    <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#ff2e4d] opacity-75" />
    <span className="relative inline-flex size-2 rounded-full bg-[#ff2e4d]" />
  </span>
);

/** Selo pequeno "AO VIVO" (some quando o jogador não está transmitindo). */
export function LiveBadge({ slug, className = "" }: { slug: string; className?: string }) {
  const live = useLive().players[slug];
  if (!live?.isLive) return null;
  return (
    <span className={`inline-flex items-center gap-1.5 bg-bg-0/90 px-2 py-1 font-mono text-[0.6rem] font-medium uppercase tracking-[0.16em] text-white ${className}`}>
      <Dot /> Ao vivo
    </span>
  );
}

/** Botão da Twitch no perfil: mostra se está ao vivo, título e espectadores. */
export function TwitchButton({ slug, channel }: { slug: string; channel: string }) {
  const live = useLive().players[slug];
  const on = !!live?.isLive;
  return (
    <a
      href={twitchUrl(channel)}
      target="_blank"
      rel="noopener noreferrer"
      className={`clip-step-sm group inline-flex items-center gap-3 px-5 py-3 font-mono text-[0.75rem] font-medium uppercase tracking-[0.16em] transition-colors ${
        on ? "bg-[#9146ff] text-white hover:bg-[#a970ff]" : "bg-bg-3 text-white hover:bg-white hover:text-bg-0"
      }`}
      title={on ? live?.title ?? undefined : undefined}
    >
      <TwitchIcon />
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

/** Link da Twitch oficial no menu: ganha um ponto vermelho quando o canal está ao vivo. */
export function TeamTwitchNavLink({ className = "" }: { className?: string }) {
  const on = useLive().team.isLive;
  return (
    <a
      href={LINKS.twitch}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={on ? "Twitch da INGEN, ao vivo agora" : "Twitch da INGEN"}
      className={`relative inline-flex items-center gap-2 font-mono text-[0.72rem] uppercase tracking-[0.16em] transition-colors ${
        on ? "text-white" : "text-gray hover:text-[#bf94ff]"
      } ${className}`}
    >
      <TwitchIcon className={`size-4 ${on ? "text-[#bf94ff]" : ""}`} />
      {on && (
        <span className="flex items-center gap-1.5 bg-[#9146ff] px-1.5 py-0.5 text-[0.58rem] text-white">
          <Dot /> Live
        </span>
      )}
    </a>
  );
}

/** Faixa "Ao vivo agora" na home: aparece só quando o time ou algum jogador está transmitindo. */
export function LiveNowStrip({ names }: { names: Record<string, string> }) {
  const { team, players } = useLive();
  const on = Object.entries(players).filter(([, v]) => v.isLive);
  if (!on.length && !team.isLive) return null;
  return (
    <div className="border-y border-[#9146ff]/40 bg-[#9146ff]/10">
      <div className="wrap flex flex-wrap items-center gap-x-6 gap-y-2 py-3">
        <span className="flex items-center gap-2 font-mono text-[0.68rem] uppercase tracking-[0.2em] text-white">
          <Dot /> Ao vivo agora
        </span>
        {team.isLive && (
          <a href={LINKS.twitch} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3">
            <span className="font-display text-lg font-extrabold uppercase text-white hover:text-[#bf94ff]">Canal oficial</span>
            <span className="max-w-[40ch] truncate font-mono text-xs text-[#c4a6ff] hover:text-white">{team.title ?? "twitch.tv/" + team.channel} ↗</span>
          </a>
        )}
        {on.map(([slug, v]) => (
          <span key={slug} className="flex items-center gap-3">
            <Link href={`/jogador/${slug}`} className="font-display text-lg font-extrabold uppercase text-white hover:text-green">
              {names[slug] ?? slug}
            </Link>
            <a
              href={twitchUrl(v.channel)}
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

/* ------------------------------------------------------------------ */
/* Pin flutuante "AO VIVO"                                            */
/* ------------------------------------------------------------------ */
const PIN_KEY = "ingen:live-pin-min";
const readMin = () => {
  try {
    return sessionStorage.getItem(PIN_KEY);
  } catch {
    return null;
  }
};
const pinListeners = new Set<() => void>();
const subscribePin = (cb: () => void) => {
  pinListeners.add(cb);
  return () => pinListeners.delete(cb);
};
const writeMin = (v: string | null) => {
  try {
    if (v) sessionStorage.setItem(PIN_KEY, v);
    else sessionStorage.removeItem(PIN_KEY);
  } catch {
    /* sem storage: só não lembra entre páginas */
  }
  pinListeners.forEach((l) => l());
};

/**
 * Pin fixo no canto da tela quando a INGEN está ao vivo (canal oficial primeiro;
 * se ele estiver offline, mostra o primeiro jogador transmitindo).
 * Pode ser minimizado: vira uma pílula pulsante e lembra a escolha nesta aba.
 */
export function LivePin({ names }: { names: Record<string, string> }) {
  const { team, players, fetchedAt } = useLive();
  const minimized = useSyncExternalStore(subscribePin, readMin, () => null);
  const [imgError, setImgError] = useState(false);

  const playerLive = Object.entries(players).find(([, v]) => v.isLive);
  const info: LiveInfo | null = team.isLive ? team : playerLive ? playerLive[1] : null;
  if (!info) return null;
  const isTeam = info === team;
  const who = isTeam ? "INGEN · canal oficial" : (names[playerLive![0]] ?? playerLive![0]);
  const streamKey = `${info.channel}:${info.startedAt ?? ""}`;
  const url = twitchUrl(info.channel);
  const viewers = fmtViewers(info.viewers);
  const up = uptime(info, fetchedAt);

  if (minimized === streamKey) {
    return (
      <button
        type="button"
        onClick={() => writeMin(null)}
        className="no-print fixed bottom-4 right-4 z-[60] flex animate-[live-glow_2.4s_ease-in-out_infinite] items-center gap-2.5 bg-[#9146ff] py-2.5 pl-3 pr-4 font-mono text-[0.68rem] font-medium uppercase tracking-[0.16em] text-white md:bottom-6 md:right-6"
        aria-label={`Abrir aviso: ${who} ao vivo na Twitch`}
      >
        <TwitchIcon className="size-4" />
        <Dot />
        Ao vivo
        {viewers && <span className="text-white/70">· {viewers}</span>}
      </button>
    );
  }

  return (
    <aside
      aria-label="Transmissão ao vivo"
      className="no-print fixed inset-x-4 bottom-4 z-[60] animate-[pin-in_0.6s_var(--ease-out-expo)_both] sm:inset-x-auto sm:right-4 sm:w-[340px] md:bottom-6 md:right-6"
    >
      <div className="animate-[live-glow_2.4s_ease-in-out_infinite] bg-bg-0">
        <a href={url} target="_blank" rel="noopener noreferrer" className="group relative block aspect-video overflow-hidden bg-[#1a1028]">
          {info.thumbnail && !imgError ? (
            <Image
              src={`${info.thumbnail}?t=${fetchedAt ?? 0}`}
              alt=""
              fill
              unoptimized
              sizes="340px"
              onError={() => setImgError(true)}
              className="object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_30%_20%,#9146ff_0%,#1a1028_70%)]">
              <TwitchIcon className="size-14 text-white/80" />
            </span>
          )}
          <span className="absolute inset-0 bg-gradient-to-t from-bg-0 via-bg-0/10 to-transparent" />
          <span className="pointer-events-none absolute inset-y-0 left-0 w-1/3 animate-[scan_3.2s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          <span className="absolute left-3 top-3 flex items-center gap-2 bg-[#ff2e4d] px-2 py-1 font-mono text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-white">
            <span className="size-1.5 animate-[blink_1s_steps(1)_infinite] rounded-full bg-white" /> Ao vivo
          </span>
          {viewers && (
            <span className="absolute right-3 top-3 bg-bg-0/80 px-2 py-1 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-white">
              {viewers} assistindo
            </span>
          )}
          <span className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <span className="flex size-14 items-center justify-center rounded-full bg-[#9146ff] text-white shadow-[0_0_40px_#9146ff]">
              <svg viewBox="0 0 24 24" className="ml-1 size-6" fill="currentColor" aria-hidden>
                <path d="M7 4.5v15l12.5-7.5L7 4.5Z" />
              </svg>
            </span>
          </span>
        </a>
        <div className="relative p-4">
          <button
            type="button"
            onClick={() => writeMin(streamKey)}
            className="absolute right-2 top-2 flex size-7 items-center justify-center text-gray transition-colors hover:text-white"
            aria-label="Minimizar aviso de transmissão"
          >
            <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
              <path d="M3 8h10" />
            </svg>
          </button>
          <p className="flex items-center gap-2 font-mono text-[0.62rem] uppercase tracking-[0.18em] text-[#bf94ff]">
            <TwitchIcon className="size-3.5" /> {who}
          </p>
          <p className="mt-2 line-clamp-2 pr-6 font-display text-xl font-extrabold uppercase leading-[1.05] text-white">
            {info.title ?? `twitch.tv/${info.channel}`}
          </p>
          <p className="mt-1.5 font-mono text-[0.62rem] text-gray">
            {[info.game, up].filter(Boolean).join(" · ") || `twitch.tv/${info.channel}`}
          </p>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="clip-step-sm mt-4 flex items-center justify-center gap-2 bg-[#9146ff] px-4 py-2.5 font-mono text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-white transition-colors hover:bg-[#a970ff]"
          >
            Assistir agora <span aria-hidden>↗</span>
          </a>
        </div>
      </div>
    </aside>
  );
}

/* ------------------------------------------------------------------ */
/* Bloco do canal oficial (home)                                       */
/* ------------------------------------------------------------------ */
const noop = () => () => {};

/** Canal oficial da INGEN: player embutido quando ao vivo; convite para seguir quando offline. */
export function TeamTwitchPanel() {
  const { team, fetchedAt } = useLive();
  const host = useSyncExternalStore(noop, () => window.location.hostname, () => null);
  const on = team.isLive;
  const up = uptime(team, fetchedAt);
  const viewers = fmtViewers(team.viewers);

  return (
    <div className={`clip-step relative overflow-hidden bg-bg-2 ${on ? "ring-1 ring-[#9146ff]" : ""}`}>
      <div className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-[#9146ff] opacity-20 blur-3xl" />
      <div className="relative aspect-video bg-[#120c1c]">
        {on && host ? (
          <iframe
            title="Transmissão ao vivo da INGEN na Twitch"
            src={`https://player.twitch.tv/?channel=${TEAM_TWITCH_CHANNEL}&parent=${host}&muted=true&autoplay=true`}
            allowFullScreen
            className="absolute inset-0 size-full"
          />
        ) : (
          <a href={LINKS.twitch} target="_blank" rel="noopener noreferrer" className="group absolute inset-0 flex flex-col items-center justify-center gap-4 overflow-hidden">
            <span className="absolute inset-0 bg-dots opacity-70" />
            <span className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgb(145_70_255/0.35)_0%,transparent_60%)]" />
            <span className="relative flex size-20 items-center justify-center bg-[#9146ff] text-white transition-transform duration-500 clip-step-sm group-hover:scale-110">
              <TwitchIcon className="size-10" />
            </span>
            <span className="relative font-mono text-[0.68rem] uppercase tracking-[0.2em] text-gray">Offline agora · siga para ser avisado</span>
          </a>
        )}
      </div>
      <div className="relative flex flex-wrap items-center justify-between gap-4 p-6">
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-mono text-[0.65rem] uppercase tracking-[0.18em] text-[#bf94ff]">
            {on ? <Dot /> : <span className="size-2 rounded-full bg-gray-dim" />}
            {on ? `Ao vivo${viewers ? ` · ${viewers} assistindo` : ""}` : "Canal oficial"}
          </p>
          <p className="mt-2 truncate font-display text-2xl font-black uppercase leading-none text-white md:text-3xl">
            {on && team.title ? team.title : `twitch.tv/${TEAM_TWITCH_CHANNEL}`}
          </p>
          {on && (team.game || up) && <p className="mt-1.5 font-mono text-[0.65rem] text-gray">{[team.game, up].filter(Boolean).join(" · ")}</p>}
        </div>
        <a
          href={LINKS.twitch}
          target="_blank"
          rel="noopener noreferrer"
          className="clip-step-sm inline-flex shrink-0 items-center gap-3 bg-[#9146ff] px-5 py-3 font-mono text-[0.75rem] font-medium uppercase tracking-[0.16em] text-white transition-colors hover:bg-[#a970ff]"
        >
          <TwitchIcon />
          {on ? "Assistir na Twitch" : "Seguir na Twitch"} <span aria-hidden>↗</span>
        </a>
      </div>
    </div>
  );
}
