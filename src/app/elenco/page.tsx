import type { Metadata } from "next";
import Link from "next/link";
import { getSiteData } from "@/lib/data";
import { ogFor } from "@/lib/site";
import { RevealScope } from "@/components/motion/RevealScope";
import { Split } from "@/components/motion/Split";
import { TeamBlock } from "@/components/roster/TeamBlock";

export const metadata: Metadata = {
  title: "Elenco",
  description: "Elenco da INGEN Black e da INGEN Silver: jogadores de cada lane, elo na Solo/Duo, winrate e campeões mais jogados.",
  alternates: { canonical: "/elenco" },
  openGraph: ogFor("/elenco"),
};

export default async function ElencoPage() {
  const { teams, version } = await getSiteData();
  return (
    <RevealScope>
      <section className="relative overflow-hidden pb-6 pt-36 md:pt-44">
        <div className="pointer-events-none absolute inset-0 bg-lines" />
        <div className="wrap relative">
          <p data-reveal="fade" className="label-mono">Elenco · Mapa do Rift</p>
          <Split as="h1" className="mt-4 font-display text-[clamp(3.5rem,11vw,10rem)] font-black uppercase leading-[0.82] text-white">
            Cada um <br />
            <span className="text-gray-dim">na sua lane.</span>
          </Split>
          <nav data-reveal="up" className="mt-10 flex gap-2">
            {teams.map((t) => (
              <Link
                key={t.slug}
                href={`#${t.slug}`}
                className="clip-step-sm bg-bg-3 px-4 py-2 font-mono text-[0.7rem] uppercase tracking-[0.16em] text-white transition-colors hover:bg-green hover:text-bg-0"
              >
                {t.name}
              </Link>
            ))}
          </nav>
        </div>
      </section>
      {teams.map((t, i) => (
        <div key={t.slug} className={i % 2 ? "border-t border-line bg-bg-0" : ""}>
          <TeamBlock team={t} version={version} index={i} />
        </div>
      ))}
    </RevealScope>
  );
}
