import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FEATURES } from "@/lib/features";
import Link from "next/link";
import { Marked, Renderer } from "marked";
import { EXTERNAL_LINK, isExternal } from "@/lib/links";
import { getSiteData } from "@/lib/data";
import { RevealScope } from "@/components/motion/RevealScope";
import { Split } from "@/components/motion/Split";
import { NewsCard } from "@/components/news/NewsCard";
import { NEWS_CATEGORY_LABEL, dateBR } from "@/lib/format";

/** Markdown das notícias: links externos abrem em nova aba (regra do site, ver src/lib/links.ts). */
const md = new Marked({
  renderer: {
    link(token) {
      const html = Renderer.prototype.link.call(this, token);
      return isExternal(token.href) ? html.replace(/^<a /, `<a target="${EXTERNAL_LINK.target}" rel="${EXTERNAL_LINK.rel}" `) : html;
    },
  },
});

export async function generateStaticParams() {
  const { news } = await getSiteData();
  return news.map((n) => ({ slug: n.slug }));
}

export async function generateMetadata({ params }: PageProps<"/noticias/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const { news } = await getSiteData();
  const n = news.find((x) => x.slug === slug);
  return n ? { title: n.title, description: n.excerpt, openGraph: { title: n.title, description: n.excerpt, type: "article" } } : {};
}

export default async function NoticiaPage({ params }: PageProps<"/noticias/[slug]">) {
  if (!FEATURES.news) notFound();
  const { slug } = await params;
  const { news } = await getSiteData();
  const n = news.find((x) => x.slug === slug);
  if (!n) notFound();
  const html = await md.parse(n.body);
  const more = news.filter((x) => x.slug !== n.slug).slice(0, 3);

  return (
    <RevealScope>
      <article>
        <header className="relative overflow-hidden pb-12 pt-36 md:pt-44">
          <div className="pointer-events-none absolute inset-0 bg-lines" />
          <div className="wrap relative max-w-5xl">
            <div data-reveal="fade" className="flex flex-wrap items-center gap-4">
              <Link href="/noticias" className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-gray hover:text-white">
                ← Notícias
              </Link>
              <span className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-green">{NEWS_CATEGORY_LABEL[n.category]}</span>
              <time className="font-mono text-[0.7rem] uppercase tracking-[0.12em] text-gray-dim">{dateBR(n.publishedAt)}</time>
            </div>
            <Split as="h1" className="mt-8 font-display text-[clamp(2.8rem,7vw,6rem)] font-black uppercase leading-[0.88] text-white">
              {n.title}
            </Split>
            <p data-reveal="up" className="mt-8 max-w-2xl text-xl leading-relaxed text-gray">
              {n.excerpt}
            </p>
          </div>
        </header>
        <div className="wrap max-w-5xl">
          <div className="h-px bg-[image:var(--grad-ingen-x)]" data-reveal="bar" />
          <div
            data-reveal="up"
            className="mt-12 max-w-3xl text-lg leading-relaxed text-white-dim [&_h2]:mb-4 [&_h2]:mt-12 [&_h2]:font-display [&_h2]:text-4xl [&_h2]:font-extrabold [&_h2]:uppercase [&_h2]:text-white [&_li]:mt-2 [&_li]:pl-2 [&_li::marker]:text-green [&_p]:mt-5 [&_strong]:text-white [&_ul]:mt-5 [&_ul]:list-['▪'] [&_ul]:pl-6 [&_a]:text-green [&_a]:underline"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </article>

      {more.length > 0 && (
        <section className="wrap mt-28">
          <p className="label-mono">Mais notícias</p>
          <div data-reveal="stagger" className="mt-6 grid gap-4 md:grid-cols-3">
            {more.map((m) => (
              <NewsCard key={m.slug} n={m} />
            ))}
          </div>
        </section>
      )}
    </RevealScope>
  );
}
