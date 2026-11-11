"use client";

import Image from "next/image";
import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { ButtonLink } from "@/components/ui";

gsap.registerPlugin(ScrollTrigger);

const COLS = 16;
const ROWS = 13;
// distribuição determinística de "pixels" verdes (sem Math.random no render → sem mismatch de hidratação)
const greenCell = (i: number) => (i * 37 + 11) % 9 === 0;
const TITLE = [
  ["Dois", "elencos."],
  ["Um", "só", "escudo."],
];

export function Hero({ blackAvg, silverAvg }: { blackAvg: string; silverAvg: string }) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const q = gsap.utils.selector(root);
      if (reduce) {
        gsap.set(q("[data-hero]"), { autoAlpha: 1 });
        gsap.set(q(".px-cell"), { autoAlpha: 0 });
        return;
      }

      const tl = gsap.timeline({ delay: 0.35, defaults: { ease: "expo.out" } });
      tl.set(q("[data-hero]"), { autoAlpha: 1 })
        // 1. a grade de pixels "acende"
        .from(q(".px-cell"), { scale: 0, duration: 0.5, ease: "steps(3)", stagger: { grid: [ROWS, COLS], from: "center", amount: 0.5 } })
        // 2. o escudo vai ganhando cor por baixo, devagar (sem "estalo" no final)
        .fromTo(
          q("[data-hero-logo]"),
          { scale: 0.9, opacity: 0.35, filter: "saturate(0) brightness(0.55) blur(4px)" },
          { scale: 1, opacity: 1, filter: "saturate(1) brightness(1) blur(0px)", duration: 2.4, ease: "power2.inOut" },
          "-=0.1",
        )
        // 3. enquanto os pixels se desfazem em degraus e depois esmaecem
        .to(q(".px-cell"), { scale: 0, duration: 0.7, ease: "steps(4)", stagger: { grid: [ROWS, COLS], from: "random", amount: 1.1 } }, "<")
        .to(q(".px-cell"), { autoAlpha: 0, duration: 0.6, ease: "power1.out" }, "-=0.5")
        // 4. brilho final suave
        .fromTo(q("[data-hero-logo-glow]"), { opacity: 0 }, { opacity: 1, duration: 1.6, ease: "power2.out" }, "-=1")
        .from(q("[data-hw]"), { yPercent: 120, duration: 1.1, stagger: 0.07 }, "-=2.2")
        .from(q("[data-hero-fade]"), { autoAlpha: 0, y: 24, duration: 1, stagger: 0.08 }, "-=0.9")
        .from(q("[data-hero-hud]"), { autoAlpha: 0, duration: 0.6, stagger: 0.1, ease: "steps(3)" }, "-=0.8");

      // Parallax de saída no scroll
      gsap.to(q("[data-hero-logo-wrap]"), {
        yPercent: 22,
        scale: 0.9,
        autoAlpha: 0.15,
        ease: "none",
        scrollTrigger: { trigger: root.current, start: "top top", end: "bottom top", scrub: true },
      });

      // Brilho que segue o cursor + leve tilt do escudo
      const glowX = gsap.quickTo(q("[data-glow]")[0], "x", { duration: 0.8, ease: "power3" });
      const glowY = gsap.quickTo(q("[data-glow]")[0], "y", { duration: 0.8, ease: "power3" });
      const rotX = gsap.quickTo(q("[data-hero-logo]")[0], "rotationX", { duration: 1, ease: "power3" });
      const rotY = gsap.quickTo(q("[data-hero-logo]")[0], "rotationY", { duration: 1, ease: "power3" });
      const onMove = (e: PointerEvent) => {
        const r = root.current!.getBoundingClientRect();
        glowX(e.clientX - r.left);
        glowY(e.clientY - r.top);
        const nx = (e.clientX - r.left) / r.width - 0.5;
        const ny = (e.clientY - r.top) / r.height - 0.5;
        rotY(nx * 14);
        rotX(-ny * 10);
      };
      root.current!.addEventListener("pointermove", onMove);
      return () => root.current?.removeEventListener("pointermove", onMove);
    },
    { scope: root },
  );

  return (
    <section ref={root} className="relative flex min-h-[100svh] items-center overflow-hidden pb-24 pt-28 md:pb-28 lg:pb-16 lg:pt-16">
      {/* fundo: linhas verticais + varredura de luz */}
      <div className="pointer-events-none absolute inset-0 bg-lines" />
      <div className="pointer-events-none absolute inset-y-0 left-0 w-1/3 animate-[scan_7s_ease-in-out_infinite] bg-[linear-gradient(90deg,transparent,rgb(61_253_78/0.07),transparent)]" />
      <div
        data-glow
        className="pointer-events-none absolute -left-[300px] -top-[300px] size-[600px] rounded-full bg-[radial-gradient(circle,rgb(61_253_78/0.16),transparent_65%)]"
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-bg-1 to-transparent" />

      {/* HUD nos cantos */}
      <div data-hero data-hero-hud className="absolute left-[var(--gutter)] top-24 font-mono text-[0.68rem] uppercase tracking-[0.2em] text-gray-dim">
        INGEN <span className="text-green">{"//"}</span> BR1
      </div>
      <div data-hero data-hero-hud className="absolute right-[var(--gutter)] top-24 hidden text-right font-mono text-[0.68rem] uppercase leading-relaxed tracking-[0.2em] text-gray-dim md:block">
        <div>Black · elo médio <span className="text-white-dim">{blackAvg}</span></div>
        <div>Silver · elo médio <span className="text-white-dim">{silverAvg}</span></div>
      </div>

      <div className="wrap relative grid items-center gap-10 md:grid-cols-[1.1fr_0.9fr] lg:grid-cols-[1.05fr_1fr]">
        <div className="order-2 md:order-1">
          <p data-hero data-hero-fade className="label-mono mb-6 flex items-center gap-3">
            <span className="inline-block size-2 animate-[blink_1.2s_steps(1)_infinite] bg-green" />
            Organização de League of Legends
          </p>
          <h1
            data-hero
            aria-label="Dois elencos. Um só escudo."
            className="font-display text-[clamp(3.2rem,7.6vw,8.5rem)] font-black uppercase leading-[0.86] tracking-[-0.01em] text-white"
          >
            {TITLE.map((line, li) => (
              <span key={li} aria-hidden className="block">
                {line.map((w, wi) => (
                  // padding no topo: acentos (Ó, É) não são cortados pela máscara
                  <span key={wi} className="-mt-[0.2em] inline-block overflow-hidden pb-[0.04em] pt-[0.2em] align-top">
                    <span data-hw className={`inline-block ${li === 1 ? "grad-text" : ""}`}>{w}</span>
                    {wi < line.length - 1 && " "}
                  </span>
                ))}
              </span>
            ))}
          </h1>
          <p data-hero data-hero-fade className="mt-8 max-w-md text-base leading-relaxed text-gray md:text-lg">
            <span className="text-white-dim">INGEN Black</span> e <span className="text-white-dim">INGEN Silver</span>:
            elencos, estatísticas direto da Riot, comparação de jogadores e scouting em um só lugar.
          </p>
          <div data-hero data-hero-fade className="mt-10 flex flex-wrap gap-3">
            <ButtonLink href="/elenco">Conheça o elenco</ButtonLink>
            <ButtonLink href="/ranking" variant="ghost">
              Ranking interno
            </ButtonLink>
          </div>
        </div>

        <div data-hero-logo-wrap className="order-1 mx-auto w-full max-w-[300px] [perspective:900px] md:order-2 md:max-w-[520px]">
          <div data-hero className="relative aspect-[983/823]">
            <div data-hero-logo-glow className="absolute inset-[10%] rounded-full bg-[radial-gradient(circle,rgb(61_253_78/0.28),transparent_70%)] opacity-0 blur-2xl" />
            <div data-hero-logo className="absolute inset-0 [transform-style:preserve-3d]">
              <Image
                src="/brand/ingen-logo.webp"
                alt="Símbolo da INGEN"
                fill
                priority
                sizes="(min-width: 1024px) 520px, 90vw"
                className="object-contain"
              />
            </div>
            <div
              aria-hidden
              className="absolute -inset-[4%] grid"
              style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)`, gridTemplateRows: `repeat(${ROWS}, 1fr)` }}
            >
              {Array.from({ length: COLS * ROWS }, (_, i) => (
                <span key={i} className={`px-cell block ${greenCell(i) ? "bg-green" : "bg-bg-1"}`} style={{ margin: -0.5 }} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* indicador de scroll: a ponta do escudo */}
      <div data-hero data-hero-hud className="absolute bottom-8 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 lg:flex">
        <span className="font-mono text-[0.62rem] uppercase tracking-[0.3em] text-gray-dim">Role</span>
        <svg width="22" height="14" viewBox="0 0 22 14" className="animate-bounce">
          <path d="M1 1l10 11L21 1" stroke="#3dfd4e" strokeWidth="2" fill="none" />
        </svg>
      </div>
    </section>
  );
}
