import type { Metadata } from "next";
import { Suspense } from "react";
import { getSiteData } from "@/lib/data";
import { RevealScope } from "@/components/motion/RevealScope";
import { Split } from "@/components/motion/Split";
import { CompareView, type ComparePlayer } from "@/components/compare/CompareView";
import { riotId } from "@/lib/format";
import { mainChamps } from "@/lib/view";

export const metadata: Metadata = {
  title: "Comparar jogadores",
  description: "Compare jogadores da INGEN Black e da INGEN Silver, métrica por métrica.",
};

async function getComparePlayers(): Promise<{ version: string; players: ComparePlayer[] }> {
  const { players, version } = await getSiteData();
  return { version, players: players.map((p) => ({
    slug: p.slug,
    name: p.displayName,
    riotId: riotId(p),
    role: p.role,
    team: { slug: p.team.slug, name: p.team.name, accent: p.team.accent },
    tier: p.solo?.tier ?? null,
    division: p.solo?.division ?? null,
    lp: p.solo?.lp ?? null,
    score: p.solo?.score ?? 0,
    champs: mainChamps(p).slice(0, 4).map((c) => ({ key: c.key, name: c.name, games: c.games })),
    stats: p.stats
      ? {
          games: p.stats.games,
          winrate: p.stats.winrate,
          kda: p.stats.kda,
          csPerMin: p.stats.csPerMin,
          visionPerMin: p.stats.visionPerMin,
          goldPerMin: p.stats.goldPerMin,
          kp: p.stats.kp,
          damageShare: p.stats.damageShare,
          deaths: p.stats.deaths,
        }
      : null,
  })) };
}

async function CompareWithParams({ searchParams }: { searchParams: PageProps<"/comparar">["searchParams"] }) {
  const [sp, { players, version }] = await Promise.all([searchParams, getComparePlayers()]);
  const a = typeof sp.a === "string" ? sp.a : undefined;
  const b = typeof sp.b === "string" ? sp.b : undefined;
  return <CompareView players={players} version={version} initialA={a} initialB={b} />;
}

export default function CompararPage({ searchParams }: PageProps<"/comparar">) {
  return (
    <RevealScope>
      <section className="relative overflow-hidden pb-12 pt-36 md:pt-44">
        <div className="pointer-events-none absolute inset-0 bg-lines" />
        <div className="wrap relative">
          <p data-reveal="fade" className="label-mono">Comparar jogadores</p>
          <Split as="h1" className="mt-4 font-display text-[clamp(3.5rem,11vw,10rem)] font-black uppercase leading-[0.82] text-white">
            Lado a <span className="text-gray-dim">lado.</span>
          </Split>
          <p data-reveal="up" className="mt-6 max-w-lg text-gray">
            Escolha dois jogadores, do mesmo time ou de times diferentes, e veja onde cada um se destaca. Só ranqueada Solo/Duo.
          </p>
        </div>
      </section>
      <section className="wrap">
        <Suspense fallback={<div className="clip-step h-[480px] animate-pulse bg-bg-2" />}>
          <CompareWithParams searchParams={searchParams} />
        </Suspense>
      </section>
    </RevealScope>
  );
}
