import type { Metadata } from "next";
import { Suspense } from "react";
import { getSiteData } from "@/lib/data";
import { rankLabel } from "@/lib/format";
import { RevealScope } from "@/components/motion/RevealScope";
import { Split } from "@/components/motion/Split";
import { StreamKit, type StreamPlayer } from "@/components/stream/StreamKit";
import { ButtonLink } from "@/components/ui";

/**
 * Kit de stream dos jogadores (overlays em public/stream).
 * Página interna: sem link no site, fora do sitemap e com noindex (aqui e no header de /stream/*, em next.config.ts).
 */
export const metadata: Metadata = { title: "Kit de stream" };

async function Kit() {
  const { players } = await getSiteData();
  const list: StreamPlayer[] = players.map((p) => ({
    slug: p.slug,
    name: p.displayName,
    team: p.team.name,
    accent: p.team.accent,
    role: p.role,
    tier: p.solo?.tier ?? null,
    elo: p.solo ? `${rankLabel(p.solo.tier, p.solo.division)} · ${p.solo.lp} PDL` : null,
    canal: p.live?.channel ?? null,
  }));
  return <StreamKit players={list} />;
}

export default function StreamPage() {
  return (
    <RevealScope>
      <section className="relative overflow-hidden pb-12 pt-36 md:pt-44">
        <div className="pointer-events-none absolute inset-0 bg-lines" />
        <div className="wrap relative">
          <p data-reveal="fade" className="label-mono">Uso interno · jogadores</p>
          <Split as="h1" className="mt-4 font-display text-[clamp(3.5rem,11vw,10rem)] font-black uppercase leading-[0.82] text-white">
            Kit de <span className="text-gray-dim">stream.</span>
          </Split>
          <p data-reveal="up" className="mt-6 max-w-xl text-gray">
            Overlays animados da INGEN para o OBS e o Streamlabs. Escolha seu nome, confira as prévias e copie o link de cada peça para uma Fonte de
            navegador.
          </p>
          <div data-reveal="up" className="mt-8">
            <ButtonLink href="/stream/ajuda" variant="ghost">
              Primeira vez? Veja como usar
            </ButtonLink>
          </div>
        </div>
      </section>
      <section className="wrap pb-24">
        <Suspense fallback={<div className="clip-step h-[480px] animate-pulse bg-bg-2" />}>
          <Kit />
        </Suspense>
      </section>
    </RevealScope>
  );
}
