"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { FEATURES, LINKS } from "@/lib/features";
import { TeamTwitchNavLink } from "@/components/live/Live";
import { DiscordIcon, InstagramIcon, XIcon, YouTubeIcon } from "@/components/brand/SocialIcons";

const ALL_NAV = [
  { href: "/elenco", label: "Elenco" },
  { href: "/ranking", label: "Ranking" },
  { href: "/comparar", label: "Comparar" },
  { href: "/scouting/black", label: "Scouting", match: "/scouting" },
  { href: "/noticias", label: "Notícias", feature: "news" as const },
];
const NAV = ALL_NAV.filter((n) => !("feature" in n && n.feature) || FEATURES[n.feature]);

export function Header() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  // fecha o menu mobile ao trocar de página
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  return (
    <header
      className={`no-print fixed inset-x-0 top-0 z-50 transition-[background,border-color,backdrop-filter] duration-500 ${
        scrolled || open ? "border-b border-line bg-bg-0/75 backdrop-blur-xl" : "border-b border-transparent"
      }`}
    >
      <div className="wrap flex h-16 items-center justify-between gap-6">
        <Link href="/" className="group flex items-center gap-3" aria-label="INGEN, início">
          <Image src="/brand/ingen-logo.webp" alt="" width={42} height={35} priority className="transition-transform duration-500 group-hover:scale-110" />
          <span className="font-display text-xl font-black tracking-[0.12em] text-white">INGEN</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => {
            const active = pathname.startsWith(n.match ?? n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`relative px-3 py-2 font-mono text-[0.72rem] uppercase tracking-[0.16em] transition-colors ${
                  active ? "text-white" : "text-gray hover:text-white"
                }`}
              >
                {active && <span className="absolute left-1 top-1/2 size-1.5 -translate-y-1/2 bg-green" />}
                {n.label}
              </Link>
            );
          })}
          <span className="mx-2 h-4 w-px bg-line" />
          <TeamTwitchNavLink className="px-2 py-2" />
          <a
            href={LINKS.discord}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Discord da INGEN"
            className="px-2 py-2 text-gray transition-colors hover:text-[#8f9bff]"
          >
            <DiscordIcon className="size-[18px]" />
          </a>
          <a
            href={LINKS.instagram}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram da INGEN"
            className="px-2 py-2 text-gray transition-colors hover:text-[#ff6fae]"
          >
            <InstagramIcon className="size-[18px]" />
          </a>
          <a
            href={LINKS.youtube}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="YouTube da INGEN"
            className="px-2 py-2 text-gray transition-colors hover:text-[#ff4e45]"
          >
            <YouTubeIcon className="size-[18px]" />
          </a>
          <a
            href={LINKS.x}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="X da INGEN"
            className="px-2 py-2 text-gray transition-colors hover:text-white"
          >
            <XIcon className="size-4" />
          </a>
        </nav>

        <div className="flex items-center gap-3 md:hidden">
          <TeamTwitchNavLink />
          <button
          type="button"
          className="relative flex size-10 items-center justify-center md:hidden"
          aria-label={open ? "Fechar menu" : "Abrir menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span className={`absolute h-0.5 w-6 bg-white transition-transform duration-300 ${open ? "rotate-45" : "-translate-y-1.5"}`} />
          <span className={`absolute h-0.5 w-6 bg-green transition-transform duration-300 ${open ? "-rotate-45" : "translate-y-1.5"}`} />
        </button>
        </div>
      </div>

      {open && (
        <nav className="wrap flex flex-col border-t border-line pb-6 pt-2 md:hidden">
          {NAV.map((n, i) => (
            <Link
              key={n.href}
              href={n.href}
              className="flex items-baseline gap-4 border-b border-line py-4 font-display text-3xl font-extrabold uppercase text-white"
            >
              <span className="font-pixel text-xs text-green">0{i + 1}</span>
              {n.label}
            </Link>
          ))}
          <div className="mt-6 grid grid-cols-2 gap-2">
            <a
              href={LINKS.twitch}
              target="_blank"
              rel="noopener noreferrer"
              className="clip-step-sm flex items-center justify-center gap-2 bg-[#9146ff] py-3 font-mono text-[0.72rem] uppercase tracking-[0.16em] text-white"
            >
              Twitch ↗
            </a>
            <a
              href={LINKS.discord}
              target="_blank"
              rel="noopener noreferrer"
              className="clip-step-sm flex items-center justify-center gap-2 bg-[#5865f2] py-3 font-mono text-[0.72rem] uppercase tracking-[0.16em] text-white"
            >
              <DiscordIcon /> Discord ↗
            </a>
            <a
              href={LINKS.youtube}
              target="_blank"
              rel="noopener noreferrer"
              className="clip-step-sm flex items-center justify-center gap-2 bg-[#ff0033] py-3 font-mono text-[0.72rem] uppercase tracking-[0.16em] text-white"
            >
              <YouTubeIcon /> YouTube ↗
            </a>
            <a
              href={LINKS.x}
              target="_blank"
              rel="noopener noreferrer"
              className="clip-step-sm flex items-center justify-center gap-2 border border-line bg-black py-3 font-mono text-[0.72rem] uppercase tracking-[0.16em] text-white"
            >
              <XIcon /> X ↗
            </a>
            <a
              href={LINKS.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="clip-step-sm col-span-2 flex items-center justify-center gap-2 bg-[linear-gradient(90deg,#f58529,#dd2a7b,#8134af)] py-3 font-mono text-[0.72rem] uppercase tracking-[0.16em] text-white"
            >
              <InstagramIcon /> Instagram ↗
            </a>
          </div>
        </nav>
      )}
    </header>
  );
}
