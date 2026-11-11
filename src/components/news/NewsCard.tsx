import Link from "next/link";
import type { NewsItem } from "@/lib/data";
import { NEWS_CATEGORY_LABEL, dateBR } from "@/lib/format";

/** Capa gerada (quando a notícia não tem imagem): padrão de pixels + categoria. */
function GeneratedCover({ seed, category }: { seed: number; category: string }) {
  const cells = Array.from({ length: 96 }, (_, i) => ((i * 7 + seed * 13) % 11 === 0 ? 2 : (i * 5 + seed) % 7 === 0 ? 1 : 0));
  return (
    <div className="absolute inset-0 overflow-hidden bg-bg-0">
      <div className="absolute inset-0 grid grid-cols-12 grid-rows-8 gap-px p-px opacity-90">
        {cells.map((c, i) => (
          <span
            key={i}
            className={`transition-colors duration-500 ${c === 2 ? "bg-green/70 group-hover:bg-lime" : c === 1 ? "bg-white/[0.06] group-hover:bg-mint/30" : "bg-transparent"}`}
            style={{ transitionDelay: `${(i % 12) * 25}ms` }}
          />
        ))}
      </div>
      <span className="absolute bottom-4 left-4 font-display text-5xl font-black uppercase leading-none text-white/10">
        {NEWS_CATEGORY_LABEL[category]}
      </span>
    </div>
  );
}

export function NewsCard({ n, large = false }: { n: NewsItem; large?: boolean }) {
  return (
    <Link href={`/noticias/${n.slug}`} className="border-run clip-step group flex h-full flex-col bg-bg-2 transition-colors hover:bg-bg-3">
      <div className={`relative ${large ? "aspect-[16/9]" : "aspect-[16/10]"}`}>
        {n.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={n.coverUrl} alt="" className="absolute inset-0 size-full object-cover" />
        ) : (
          <GeneratedCover seed={n.id} category={n.category} />
        )}
        {n.pinned && (
          <span className="absolute right-3 top-3 bg-green px-2 py-1 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-bg-0">
            Fixada
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-6">
        <div className="flex items-center justify-between gap-4">
          <span className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-green">{NEWS_CATEGORY_LABEL[n.category]}</span>
          <time className="font-mono text-[0.65rem] uppercase tracking-[0.12em] text-gray-dim">{dateBR(n.publishedAt)}</time>
        </div>
        <h3 className={`mt-4 font-display font-extrabold uppercase leading-[0.95] text-white ${large ? "text-4xl" : "text-2xl"}`}>
          {n.title}
        </h3>
        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-gray">{n.excerpt}</p>
        <span className="mt-auto pt-6 font-mono text-[0.68rem] uppercase tracking-[0.18em] text-white-dim transition-colors group-hover:text-green">
          Ler notícia →
        </span>
      </div>
    </Link>
  );
}
