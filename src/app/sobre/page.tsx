import type { Metadata } from "next";
import Image from "next/image";
import { getSiteData } from "@/lib/data";
import { LINKS } from "@/lib/features";
import { EXTERNAL_LINK } from "@/lib/links";
import { MOTTO, ORG_LD, SITE_URL, abs, ogFor } from "@/lib/site";
import { TEAM_DISPLAY } from "@/lib/teams";
import { RevealScope } from "@/components/motion/RevealScope";
import { Split } from "@/components/motion/Split";
import { JsonLd } from "@/components/seo/JsonLd";
import { DiscordIcon } from "@/components/brand/SocialIcons";
import { ButtonLink, SectionHead } from "@/components/ui";
import { MottoStairs, OneIsFive } from "@/components/about/About";

const DESCRIPTION =
  "Na INGEN, ninguém melhora sozinho. Somos um time amador de League of Legends que acredita que a melhora do individual passa pela melhora do coletivo. Lema: Sic Parvis Magna.";

export const metadata: Metadata = {
  title: "Sobre a organização",
  description: DESCRIPTION,
  alternates: { canonical: "/sobre" },
  openGraph: ogFor("/sobre", { title: "Sobre a INGEN", description: DESCRIPTION }),
};

const VALUES = [
  {
    title: "Subir quem joga ao lado",
    text: "Dividir o que aprendeu, revisar a partida junto, dar a call que o outro não viu. O seu progresso vale mais quando puxa o time inteiro para cima.",
  },
  {
    title: "Errar faz parte",
    text: "Erro não tem dono. A gente conversa, ajusta e volta para a próxima como time. Aqui é lugar de aprender, não de apontar o dedo.",
  },
  {
    title: "Porta aberta",
    text: "Titulares, reservas e jogadores em teste fazem parte do mesmo grupo desde o primeiro dia. Todo mundo começa de algum lugar.",
  },
  {
    title: "Evolução no dia a dia",
    text: "Scrims, drafts, treinos e muita conversa no Discord. A melhora não aparece só no dia do jogo: ela é construída partida após partida.",
  },
];

export default async function SobrePage() {
  const { teams, players, reserves } = await getSiteData();

  const stats = [
    { k: "Elencos", v: teams.length, caption: `${TEAM_DISPLAY.black.name} e ${TEAM_DISPLAY.silver.name}` },
    { k: "Titulares", v: players.length, caption: "Cinco lanes em cada elenco" },
    { k: "Reservas e em teste", v: reserves.length, caption: "Também fazem parte do grupo" },
  ];

  return (
    <RevealScope>
      <JsonLd
        data={{
          "@graph": [
            { ...ORG_LD, description: DESCRIPTION },
            {
              "@type": "AboutPage",
              "@id": abs("/sobre"),
              url: abs("/sobre"),
              name: "Sobre a INGEN",
              description: DESCRIPTION,
              inLanguage: "pt-BR",
              about: { "@id": ORG_LD["@id"] },
              isPartOf: { "@id": `${SITE_URL}/#site` },
            },
          ],
        }}
      />

      {/* Abertura */}
      <section className="relative overflow-hidden pb-20 pt-36 md:pb-28 md:pt-44">
        <div className="pointer-events-none absolute inset-0 bg-lines" />
        <div className="pointer-events-none absolute inset-y-0 left-0 w-1/3 animate-[scan_7s_ease-in-out_infinite] bg-[linear-gradient(90deg,transparent,rgb(61_253_78/0.07),transparent)]" />
        <div className="wrap relative grid items-center gap-12 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <p data-reveal="fade" className="label-mono flex items-center gap-3">
              <span className="inline-block size-2 animate-[blink_1.2s_steps(1)_infinite] bg-green" />
              Sobre a organização
            </p>
            <Split as="h1" className="mt-4 font-display text-[clamp(3.5rem,11vw,9rem)] font-black uppercase leading-[0.82] text-white">
              Ninguém <br /> melhora <br />
              <span className="grad-text">sozinho.</span>
            </Split>
            <p data-reveal="up" data-delay="0.2" className="mt-10 max-w-xl text-lg leading-relaxed text-gray md:text-xl">
              Somos um time amador de League of Legends construído em cima de uma ideia:{" "}
              <span className="text-white">a melhora do individual passa pela melhora do coletivo.</span>
            </p>
            <p data-reveal="up" data-delay="0.3" className="mt-6 font-mono text-[0.7rem] uppercase tracking-[0.2em] text-gray-dim">
              Lema <span className="text-green">{"//"}</span> <span lang="la" className="text-white-dim">{MOTTO.latin}</span>
            </p>
          </div>
          <div data-reveal="scale" data-delay="0.15" className="relative mx-auto w-full max-w-[220px] sm:max-w-[300px] lg:max-w-[420px]">
            <div className="absolute inset-[8%] rounded-full bg-[radial-gradient(circle,rgb(61_253_78/0.22),transparent_70%)] blur-2xl" />
            <Image
              src="/brand/ingen-logo.webp"
              alt="Escudo da INGEN"
              width={983}
              height={823}
              sizes="(min-width: 1024px) 420px, 300px"
              className="relative h-auto w-full"
            />
          </div>
        </div>
      </section>

      {/* 01: a ideia */}
      <section className="wrap py-20 md:py-32">
        <SectionHead n="01" label="A ideia" title="Um por cinco," muted="cinco por um.">
          <div className="mt-6 max-w-2xl space-y-4 text-gray md:text-lg">
            <p data-reveal="up">
              Na prática, isso significa que <span className="text-white-dim">o acerto de um é mérito de cinco</span>, e{" "}
              <span className="text-white-dim">o erro de um é problema de cinco</span>. Ninguém carrega o jogo sozinho nas costas, e ninguém
              perde sozinho: a gente ganha junto, perde junto e aprende junto.
            </p>
            <p data-reveal="up">
              Quem entra aqui não vem só para subir o próprio nível, vem para subir o nível de quem joga ao lado. E é justamente assim que
              cada um acaba indo mais longe do que iria por conta própria.
            </p>
          </div>
        </SectionHead>
        <div className="mt-14 md:ml-[220px]">
          <OneIsFive />
        </div>
      </section>

      {/* 02: no dia a dia */}
      <section className="relative overflow-hidden border-y border-line bg-bg-0 py-20 md:py-32">
        <div className="pointer-events-none absolute inset-0 bg-lines" />
        <div className="wrap relative">
          <SectionHead n="02" label="No dia a dia" title="Mais que um time," muted="um grupo que escolheu evoluir junto.">
            <p data-reveal="up" className="mt-6 max-w-xl text-gray">
              É isso que nos trouxe até aqui, e é isso que nos leva adiante. Na rotina, a ideia vira atitude:
            </p>
          </SectionHead>

          <ol data-reveal="stagger" className="mt-14 grid gap-3 md:ml-[220px] md:grid-cols-2">
            {VALUES.map((v, i) => (
              <li key={v.title} className="border-run clip-step group relative overflow-hidden bg-bg-2 p-6 md:p-8">
                <span className="font-pixel text-4xl leading-none text-white/15 transition-colors duration-300 group-hover:text-green">
                  0{i + 1}
                </span>
                <h3 className="mt-5 font-display text-3xl font-extrabold uppercase leading-none text-white">{v.title}</h3>
                <p className="mt-3 text-gray">{v.text}</p>
              </li>
            ))}
          </ol>

          <dl data-reveal="stagger" className="mt-3 grid gap-px bg-line sm:grid-cols-3 md:ml-[220px]">
            {stats.map((s) => (
              <div key={s.k} className="bg-bg-0 p-6 md:p-5 lg:p-8">
                <dt className="label-mono text-[0.62rem]">{s.k}</dt>
                <dd data-reveal="count" data-to={s.v} className="mt-4 font-display text-5xl font-black leading-none text-white lg:text-6xl">
                  {s.v}
                </dd>
                <dd className="mt-3 text-sm text-gray">{s.caption}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* 03: o lema */}
      <section aria-labelledby="lema" className="relative overflow-hidden py-24 md:py-40">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_100%,rgb(61_253_78/0.12),transparent_60%)]" />
        <div className="wrap relative flex flex-col items-center text-center">
          <p data-reveal="fade" className="label-mono flex items-center gap-2">
            <span className="inline-block size-0 border-y-[4px] border-l-[6px] border-y-transparent border-l-green" />
            03 · Nosso lema
          </p>
          <div className="mt-10">
            <MottoStairs cell="size-4 md:size-6" />
          </div>
          <Split as="h2" className="mt-10 font-display text-[clamp(3.5rem,12vw,10rem)] font-black uppercase leading-[0.85] text-white">
            <span lang="la">
              Sic Parvis <span className="grad-text">Magna.</span>
            </span>
          </Split>
          <p data-reveal="up" className="mt-6 font-mono text-sm uppercase tracking-[0.18em] text-white-dim md:text-base">
            “{MOTTO.pt}”
          </p>
          <p data-reveal="up" data-delay="0.1" className="mt-10 max-w-2xl text-gray md:text-lg">
            Toda grande jogada começa num detalhe: uma ward no lugar certo, uma call no tempo certo, uma partida revisada a mais. Ninguém
            chega lá de uma vez. Chega um passo de cada vez, e de preferência acompanhado.
          </p>
        </div>
      </section>

      {/* 04: chegue junto */}
      <section className="wrap pb-10">
        <div data-reveal="scale" className="clip-step relative overflow-hidden bg-[image:var(--grad-ingen)] p-8 text-bg-0 md:p-16">
          <div className="pointer-events-none absolute inset-0 bg-dots opacity-30 mix-blend-multiply" />
          <div className="relative grid gap-10 md:grid-cols-[1.3fr_1fr] md:items-end">
            <div>
              <p className="font-mono text-[0.7rem] uppercase tracking-[0.2em]">04 · Chegue junto</p>
              <h2 className="mt-4 font-display text-[clamp(3rem,8vw,6.5rem)] font-black uppercase leading-[0.95]">
                Vem evoluir <br /> com a gente.
              </h2>
              <p className="mt-6 max-w-md text-base font-medium">
                Quer disputar uma vaga, treinar com o grupo ou só acompanhar de perto? Entre no Discord e se apresente. Tem lugar para você.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <a
                href={LINKS.discord}
                {...EXTERNAL_LINK}
                className="clip-step-sm group inline-flex items-center justify-center gap-3 bg-bg-0 px-6 py-4 font-mono text-[0.78rem] font-semibold uppercase tracking-[0.16em] text-white transition-all duration-300 hover:bg-[#5865f2] hover:shadow-[0_12px_40px_-8px_rgb(88_101_242/0.8)]"
              >
                <DiscordIcon className="size-5" /> Entrar no Discord
                <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">↗</span>
              </a>
              <ButtonLink href="/elenco" variant="ghost" className="justify-center !py-4">
                Conheça o elenco
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>
    </RevealScope>
  );
}
