import type { Metadata } from "next";
import { Suspense } from "react";
import { getSiteData } from "@/lib/data";
import { RevealScope } from "@/components/motion/RevealScope";
import { Split } from "@/components/motion/Split";
import { CompareView, type ComparePlayer } from "@/components/compare/CompareView";
import { opggUrl, riotId } from "@/lib/format";
import { mainChamps } from "@/lib/view";
import slugRedirects from "@/lib/slug-redirects.json";
import { ogFor } from "@/lib/site";

export const metadata: Metadata = {
  title: "Comparar jogadores",
  description: "Compare jogadores da INGEN Black e da INGEN Silver lado a lado: KDA, farm, visão, dano, forma, elo e pool de campeões.",
  // ?a=…&b=… gera infinitas combinações: todas apontam para a mesma página canônica
  alternates: { canonical: "/comparar" },
  openGraph: ogFor("/comparar"),
};

async function getComparePlayers(): Promise<{ version: string; until: number | null; players: ComparePlayer[] }> {
  const { players, reserves, version, lastSync } = await getSiteData();
  return {
    version,
    until: lastSync ? new Date(lastSync).getTime() : null,
    // reservas entram no fim (grupo próprio no select); não têm página, então o nome leva ao op.gg
    players: [...players, ...reserves].map((p) => ({
      slug: p.slug,
      reserve: p.reserve,
      href: p.reserve ? opggUrl(p) : `/jogador/${p.slug}`,
      name: p.displayName,
      riotId: riotId(p),
      role: p.role,
      team: { slug: p.team.slug, name: p.team.name, accent: p.team.accent },
      tier: p.solo?.tier ?? null,
      division: p.solo?.division ?? null,
      lp: p.solo?.lp ?? null,
      score: p.solo?.score ?? 0,
      ranked: p.solo ? { wins: p.solo.wins, losses: p.solo.losses, winrate: p.solo.winrate } : null,
      champs: mainChamps(p)
        .filter((c) => c.games > 0)
        .slice(0, 5)
        .map((c) => ({ key: c.key, name: c.name, games: c.games, wins: c.wins, kda: c.kda })),
      pool: p.champions.filter((c) => c.games > 0).map((c) => ({ key: c.key, name: c.name, games: c.games, wins: c.wins })),
      stats: p.stats,
      insights: p.insights,
      form: p.form,
      streak: p.streak,
      lpToday: p.lpToday,
      history: p.rankHistory.map((h) => ({ t: h.t, score: h.score })),
      duos: p.duos.map((d) => ({ slug: d.slug, games: d.games, wins: d.wins })),
    })),
  };
}

async function CompareWithParams({ searchParams }: { searchParams: PageProps<"/comparar">["searchParams"] }) {
  const [sp, { players, version, until }] = await Promise.all([searchParams, getComparePlayers()]);
  // links antigos (?a=bonnie) seguem funcionando depois de um player:rename
  const slug = (v: string | string[] | undefined) => (typeof v === "string" ? ((slugRedirects as Record<string, string>)[v] ?? v) : undefined);
  const a = slug(sp.a);
  const b = slug(sp.b);
  return <CompareView players={players} version={version} until={until} initialA={a} initialB={b} />;
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
            Escolha dois jogadores, do mesmo time ou de times diferentes, e veja onde cada um se destaca: combate, farm, visão,
            forma, elo, pool de campeões e contexto de jogo. Só ranqueada Solo/Duo.
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
