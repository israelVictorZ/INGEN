import type { Metadata } from "next";
import { Suspense } from "react";
import { RevealScope } from "@/components/motion/RevealScope";
import { Split } from "@/components/motion/Split";
import { DraftCreator } from "@/components/draft/DraftCreator";
import { getDraftChampions } from "@/lib/draft/champions";
import { getSiteData } from "@/lib/data";
import { ROLES } from "@/db/schema";
import { ogFor } from "@/lib/site";

export const metadata: Metadata = {
  title: "Draft para scrims",
  description:
    "Sala de pick & ban para scrims de League of Legends no formato de campeonato: um link para a série inteira, fearless, drafter por time, espectadores e a tela com as cores e o escudo de cada time.",
  alternates: { canonical: "/draft" },
  openGraph: ogFor("/draft"),
};

/** Nomes dos titulares de cada line da INGEN, na ordem Topo → Suporte (vazio onde há vaga). */
async function getRosters() {
  const { players } = await getSiteData();
  const byTeam = (id: "black" | "silver") => ROLES.map((r) => players.find((p) => p.team.id === id && p.role === r)?.displayName ?? "");
  return { aces: byTeam("black"), jokers: byTeam("silver") };
}

async function Creator() {
  const [data, roster] = await Promise.all([getDraftChampions(), getRosters()]);
  return <DraftCreator data={data} roster={roster} />;
}

export default function DraftPage() {
  return (
    <RevealScope>
      <section className="relative overflow-hidden pb-12 pt-36 md:pt-44">
        <div className="pointer-events-none absolute inset-0 bg-lines" />
        <div className="wrap relative">
          <p data-reveal="fade" className="label-mono">Draft para scrims</p>
          <Split as="h1" className="mt-4 font-display text-[clamp(3.5rem,11vw,10rem)] font-black uppercase leading-[0.82] text-white">
            Pick &amp; ban <span className="text-gray-dim">da série.</span>
          </Split>
          <p data-reveal="up" className="mt-6 max-w-xl text-gray">
            Monte a sala, envie o link e cada time entra com o próprio drafter. Formato de campeonato, fearless opcional, até 5 jogos
            no mesmo link, que vale por 32 horas.
          </p>
        </div>
      </section>
      <section className="wrap">
        <Suspense fallback={<div className="clip-step h-[640px] animate-pulse bg-bg-2" />}>
          <Creator />
        </Suspense>
      </section>
    </RevealScope>
  );
}
