import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FEATURES } from "@/lib/features";
import { getSiteData } from "@/lib/data";
import { RevealScope } from "@/components/motion/RevealScope";
import { Split } from "@/components/motion/Split";
import { NewsCard } from "@/components/news/NewsCard";
import { NewsGrid } from "@/components/news/NewsGrid";

export const metadata: Metadata = {
  title: "Notícias",
  description: "Novidades da INGEN: elenco, campeonatos, recrutamento e comunicados.",
};

export default async function NoticiasPage() {
  if (!FEATURES.news) notFound();
  const { news } = await getSiteData();
  return (
    <RevealScope>
      <section className="relative overflow-hidden pb-12 pt-36 md:pt-44">
        <div className="pointer-events-none absolute inset-0 bg-lines" />
        <div className="wrap relative">
          <p data-reveal="fade" className="label-mono">Notícias</p>
          <Split as="h1" className="mt-4 font-display text-[clamp(3.5rem,11vw,10rem)] font-black uppercase leading-[0.82] text-white">
            Direto da <span className="text-gray-dim">base.</span>
          </Split>
        </div>
      </section>
      <section className="wrap">
        <NewsGrid items={news.map((n) => ({ key: n.slug, category: n.category, node: <NewsCard n={n} /> }))} />
      </section>
    </RevealScope>
  );
}
