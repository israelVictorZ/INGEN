import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getSiteData } from "@/lib/data";
import { RevealScope } from "@/components/motion/RevealScope";
import { Split } from "@/components/motion/Split";
import { LaneIcon } from "@/components/brand/LaneIcon";
import { RankEmblem, TeamTag } from "@/components/ui";
import { championIcon } from "@/lib/ddragon-urls";
import { TIER_META, pct, rankLabel } from "@/lib/format";
import { ogFor } from "@/lib/site";

export const metadata: Metadata = {
  title: "Ranking interno",
  description: "Ranking interno da INGEN: todos os jogadores da Black e da Silver ordenados por elo na ranqueada Solo/Duo, com PDL e winrate.",
  alternates: { canonical: "/ranking" },
  openGraph: ogFor("/ranking"),
};

export default async function RankingPage() {
  const { players, version } = await getSiteData();
  // Ranking: única exceção à regra "Black primeiro". Aqui vale só o elo.
  const ranked = [...players].sort((a, b) => (b.solo?.score ?? -1) - (a.solo?.score ?? -1));
  const top = ranked[0]?.solo?.score ?? 1;

  return (
    <RevealScope>
      <section className="relative overflow-hidden pb-12 pt-36 md:pt-44">
        <div className="pointer-events-none absolute inset-0 bg-lines" />
        <div className="wrap relative">
          <p data-reveal="fade" className="label-mono">Ranking interno · Solo/Duo</p>
          <Split as="h1" className="mt-4 font-display text-[clamp(3.5rem,11vw,10rem)] font-black uppercase leading-[0.82] text-white">
            Quem está <br />
            <span className="text-gray-dim">no topo.</span>
          </Split>
        </div>
      </section>

      {/* pódio */}
      <section className="wrap grid gap-4 md:grid-cols-3">
        {ranked.slice(0, 3).map((p, i) => {
          const color = p.solo ? TIER_META[p.solo.tier]?.color : undefined;
          return (
            <Link
              key={p.slug}
              href={`/jogador/${p.slug}`}
              data-reveal="up"
              data-delay={i * 0.1}
              className={`border-run clip-step group relative overflow-hidden bg-bg-2 p-6 ${i === 0 ? "md:-translate-y-6" : ""}`}
            >
              <span className="absolute right-4 top-2 font-pixel text-7xl leading-none text-white/[0.06]">{i + 1}</span>
              <div className="pointer-events-none absolute -bottom-16 -left-10 size-48 rounded-full opacity-25 blur-3xl" style={{ background: color }} />
              <div className="relative flex items-center gap-5">
                {p.solo && (
                  <div className="flex size-16 items-center justify-center">
                    <RankEmblem tier={p.solo.tier} size={44} />
                  </div>
                )}
                <div>
                  <TeamTag accent={p.team.accent} name={p.team.shortName} />
                  <p className="mt-1 font-display text-4xl font-black uppercase leading-none text-white group-hover:text-green">{p.displayName}</p>
                  {p.solo && (
                    <p className="mt-1 font-mono text-xs uppercase tracking-wider" style={{ color }}>
                      {rankLabel(p.solo.tier, p.solo.division)} · {p.solo.lp} PDL
                    </p>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </section>

      <section className="wrap mt-16">
        <div className="hidden grid-cols-[48px_1.4fr_1fr_1.2fr_90px] gap-4 border-b border-line pb-3 md:grid">
          {["#", "Jogador", "Time", "Elo", "Winrate"].map((h) => (
            <span key={h} className="label-mono text-[0.6rem]">{h}</span>
          ))}
        </div>
        <ol data-reveal="stagger">
          {ranked.map((p, i) => {
            const color = p.solo ? TIER_META[p.solo.tier]?.color : "#5a606a";
            return (
              <li key={p.slug} className="border-b border-line">
                <Link
                  href={`/jogador/${p.slug}`}
                  className="group grid grid-cols-[36px_1fr_auto] items-center gap-4 py-4 transition-colors hover:bg-bg-2 md:grid-cols-[48px_1.4fr_1fr_1.2fr_90px]"
                >
                  <span className="font-pixel text-lg text-gray-dim group-hover:text-green">{String(i + 1).padStart(2, "0")}</span>
                  <span className="flex items-center gap-3">
                    {p.champions[0] && (
                      <Image src={championIcon(version, p.champions[0].key)} alt="" width={40} height={40} className="clip-step-sm" />
                    )}
                    <span>
                      <span className="block font-display text-2xl font-extrabold uppercase leading-none text-white">{p.displayName}</span>
                      <span className="flex items-center gap-1.5 font-mono text-[0.65rem] text-gray">
                        <LaneIcon role={p.role} className="size-3.5" /> {p.gameName}#{p.tagLine}
                      </span>
                    </span>
                  </span>
                  <span className="hidden md:block">
                    <TeamTag accent={p.team.accent} name={p.team.name} />
                  </span>
                  <span className="hidden md:block">
                    <span className="font-mono text-xs uppercase tracking-wider" style={{ color }}>
                      {p.solo ? `${rankLabel(p.solo.tier, p.solo.division)} · ${p.solo.lp} PDL` : "Sem ranqueada"}
                    </span>
                    <span className="mt-1.5 block h-1 bg-bg-3">
                      <span data-reveal="bar" className="block h-full" style={{ width: `${((p.solo?.score ?? 0) / top) * 100}%`, background: color }} />
                    </span>
                  </span>
                  <span className={`text-right font-mono text-sm ${p.solo && p.solo.winrate >= 0.5 ? "text-green" : "text-gray"}`}>
                    <span className="md:hidden block text-[0.62rem] uppercase" style={{ color }}>
                      {p.solo ? rankLabel(p.solo.tier, p.solo.division) : "—"}
                    </span>
                    {p.solo ? pct(p.solo.winrate) : "—"}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
        <p className="mt-6 font-mono text-[0.62rem] uppercase tracking-[0.18em] text-gray-dim">
          Ordenado por elo na ranqueada Solo/Duo · Winrate da temporada
        </p>
      </section>
    </RevealScope>
  );
}
