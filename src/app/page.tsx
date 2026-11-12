import type { Metadata } from "next";
import Link from "next/link";
import { getSiteData } from "@/lib/data";
import { RevealScope } from "@/components/motion/RevealScope";
import { Hero } from "@/components/home/Hero";
import { Marquee } from "@/components/home/Marquee";
import { LiveNowStrip, TeamTwitchPanel } from "@/components/live/Live";
import { DiscordIcon } from "@/components/brand/SocialIcons";
import { NewsCard } from "@/components/news/NewsCard";
import { FEATURES, LINKS, RECRUIT_HREF } from "@/lib/features";
import { JsonLd } from "@/components/seo/JsonLd";
import { ORG_LD, SITE_DESCRIPTION, SITE_URL, abs, ogFor } from "@/lib/site";
import { LaneIcon } from "@/components/brand/LaneIcon";
import { SectionHead, ButtonLink, RankLine, TeamTag } from "@/components/ui";
import { ROLE_META, TIER_META, rankLabel, scoreToLabel } from "@/lib/format";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: ogFor("/"),
};

export default async function Home() {
  const data = await getSiteData();
  const { teams, players, news } = data;
  const black = teams.find((t) => t.slug === "black");
  const silver = teams.find((t) => t.slug === "silver");
  const openSlots = teams.flatMap((t) => t.slots.filter((s) => s.kind === "open").map((s) => ({ team: t, role: s.role })));

  const totalGames = players.reduce((s, p) => s + (p.stats?.games ?? 0), 0);
  const totalWins = players.reduce((s, p) => s + (p.stats?.wins ?? 0), 0);
  const podium = [...players].filter((p) => p.solo).sort((a, b) => b.solo!.score - a.solo!.score).slice(0, 3);
  const PER_PLAYER = Math.max(0, ...players.map((p) => p.stats?.games ?? 0));
  const champsPlayed = new Set(players.flatMap((p) => p.recent.map((m) => m.championId))).size;

  return (
    <RevealScope>
      <JsonLd
        data={{
          "@graph": [
            { ...ORG_LD, description: SITE_DESCRIPTION, subOrganization: teams.map((t) => ({ "@id": abs(`/elenco#${t.slug}`) })) },
            { "@type": "WebSite", "@id": `${SITE_URL}/#site`, url: SITE_URL, name: "INGEN", inLanguage: "pt-BR", publisher: { "@id": ORG_LD["@id"] } },
            ...teams.map((t) => ({
              "@type": "SportsTeam",
              "@id": abs(`/elenco#${t.slug}`),
              name: t.name,
              sport: "League of Legends",
              url: abs(`/elenco#${t.slug}`),
              parentOrganization: { "@id": ORG_LD["@id"] },
              athlete: t.players.map((p) => ({ "@type": "Person", name: p.displayName, alternateName: `${p.gameName}#${p.tagLine}`, url: abs(`/jogador/${p.slug}`) })),
            })),
          ],
        }}
      />
      <Hero
        blackAvg={black?.avgScore != null ? scoreToLabel(black.avgScore) : "—"}
        silverAvg={silver?.avgScore != null ? scoreToLabel(silver.avgScore) : "—"}
      />

      <LiveNowStrip names={Object.fromEntries(players.map((p) => [p.slug, p.displayName]))} />

      <Marquee items={["INGEN Black", "INGEN Silver", ...openSlots.map((o) => `Vaga aberta ${ROLE_META[o.role].short}`)]} />

      {/* 01: Elenco */}
      <section className="wrap py-28 md:py-40">
        <SectionHead n="01" label="Elenco" title="Quem defende" muted="o escudo.">
          <p data-reveal="up" className="mt-6 max-w-xl text-gray">
            Cinco lanes, dois elencos. Passe o mouse em um jogador para ver o elo; clique para abrir o perfil completo.
          </p>
        </SectionHead>

        <div className="mt-16 grid gap-6 md:ml-[220px] lg:grid-cols-2">
          {teams.map((t) => (
            <div key={t.slug} data-reveal="up" className="clip-step bg-bg-2 p-6 md:p-8">
              <div className="flex items-end justify-between gap-4">
                <h3 className="font-display text-4xl font-black uppercase leading-none text-white">
                  INGEN <span className={t.accent === "silver" ? "text-silver" : "grad-text"}>{t.shortName}</span>
                </h3>
                <TeamTag accent={t.accent} name={t.avgScore != null ? scoreToLabel(t.avgScore) : "—"} />
              </div>
              <ul className="mt-8 divide-y divide-line border-y border-line">
                {t.slots.map((s) => (
                  <li key={s.role}>
                    {s.kind === "player" ? (
                      <Link href={`/jogador/${s.player.slug}`} className="group flex items-center gap-4 py-3.5 transition-colors hover:bg-bg-3">
                        <LaneIcon role={s.role} className="size-6 shrink-0" />
                        <span className="w-10 font-mono text-[0.65rem] uppercase tracking-widest text-gray-dim">{ROLE_META[s.role].short}</span>
                        <span className="flex-1 font-display text-2xl font-extrabold uppercase leading-none text-white transition-transform duration-300 group-hover:translate-x-1 group-hover:text-green">
                          {s.player.displayName}
                        </span>
                        <RankLine rank={s.player.solo} compact />
                      </Link>
                    ) : (
                      <a
                        href={RECRUIT_HREF}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center gap-4 py-3.5 transition-colors hover:bg-bg-3"
                      >
                        <LaneIcon role={s.role} className="size-6 shrink-0 opacity-40" />
                        <span className="w-10 font-mono text-[0.65rem] uppercase tracking-widest text-gray-dim">{ROLE_META[s.role].short}</span>
                        <span className="flex-1 font-display text-2xl font-extrabold uppercase leading-none text-gray-dim transition-colors group-hover:text-white">
                          Vaga aberta
                        </span>
                        <span className="flex items-center gap-2 font-mono text-[0.65rem] uppercase tracking-widest text-green">
                          <span className="size-1.5 animate-[blink_1.2s_steps(1)_infinite] bg-green" />
                          <span className="group-hover:hidden">Recrutando</span>
                          <span className="hidden group-hover:inline">Chamar no Discord ↗</span>
                        </span>
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div data-reveal="up" className="mt-10 md:ml-[220px]">
          <ButtonLink href="/elenco">Ver o Mapa do Rift</ButtonLink>
        </div>
      </section>

      {/* 02: Ranking da casa */}
      <section className="relative overflow-hidden border-y border-line bg-bg-0 py-28 md:py-36">
        <div className="pointer-events-none absolute inset-0 bg-lines" />
        <div className="wrap relative">
          <SectionHead n="02" label="Ranking interno" title="Quem lidera" muted="a INGEN.">
            <p data-reveal="up" className="mt-6 max-w-xl text-gray">
              Os três jogadores com o maior elo na ranqueada <span className="text-white-dim">Solo/Duo</span>, somando os dois
              times. Abaixo, um resumo de como a organização está jogando.
            </p>
          </SectionHead>

          {/* Pódio: linhas empilhadas até xl (3 colunas espremiam os nomes no tablet); 3 cards lado a lado no desktop largo */}
          <ol data-reveal="stagger" className="mt-14 grid gap-3 md:ml-[220px] xl:grid-cols-3">
            {podium.map((p, i) => {
              const color = TIER_META[p.solo!.tier]?.color;
              const elo = `${rankLabel(p.solo!.tier, p.solo!.division)} · ${p.solo!.lp} PDL`;
              return (
                <li key={p.slug}>
                  <Link href={`/jogador/${p.slug}`} className="border-run clip-step group relative flex h-full items-center gap-4 overflow-hidden bg-bg-2 p-5 lg:gap-6 lg:px-7 xl:gap-4 xl:px-5">
                    <span className="w-8 shrink-0 font-pixel text-5xl leading-none text-white/15 group-hover:text-green lg:w-10">{i + 1}</span>
                    <span className="min-w-0 flex-1">
                      <TeamTag accent={p.team.accent} name={p.team.name} />
                      <span className="mt-1 block truncate font-display text-3xl font-black uppercase leading-none text-white lg:text-4xl xl:text-3xl">{p.displayName}</span>
                      <span className="mt-1 block font-mono text-xs uppercase tracking-wider lg:max-xl:hidden" style={{ color }}>
                        {elo}
                      </span>
                    </span>
                    <span className="hidden shrink-0 text-right font-mono text-xs uppercase tracking-wider lg:max-xl:block" style={{ color }}>
                      {elo}
                    </span>
                    <LaneIcon role={p.role} className="size-8 shrink-0" />
                  </Link>
                </li>
              );
            })}
          </ol>

          <dl data-reveal="stagger" className="mt-3 grid gap-px bg-line sm:grid-cols-3 md:ml-[220px]">
            {[
              { k: "Partidas analisadas", v: String(totalGames), caption: `Últimas ${PER_PLAYER} Solo/Duo de cada jogador` },
              { k: "Winrate da organização", v: totalGames ? ((totalWins / totalGames) * 100).toFixed(0) : "0", suffix: "%", caption: "Vitórias somadas nessas partidas" },
              { k: "Campeões diferentes", v: String(champsPlayed), caption: "Tamanho do pool somando os dois times" },
            ].map((s) => (
              <div key={s.k} className="bg-bg-0 p-6 md:p-5 lg:p-8">
                <dt className="label-mono text-[0.62rem]">{s.k}</dt>
                <dd data-reveal="count" data-to={s.v} data-suffix={s.suffix ?? ""} className="mt-4 font-display text-5xl font-black leading-none text-white lg:text-6xl">
                  {s.v}
                  {s.suffix}
                </dd>
                <dd className="mt-3 text-sm text-gray">{s.caption}</dd>
              </div>
            ))}
          </dl>

          <div data-reveal="up" className="mt-10 flex flex-wrap items-center gap-6 md:ml-[220px]">
            <ButtonLink href="/ranking">Ver ranking completo</ButtonLink>
            {data.lastSync && (
              <span className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-gray-dim">
                Atualizado em{" "}
                {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(data.lastSync))}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Notícias (oculto por enquanto: FEATURES.news) */}
      {FEATURES.news && (
      <section className="wrap py-28 md:py-40">
        <SectionHead n="03" label="Notícias" title="O que está" muted="acontecendo." />
        <div data-reveal="stagger" className="mt-16 grid gap-4 md:ml-[220px] md:grid-cols-2 lg:grid-cols-3">
          {news.slice(0, 3).map((n) => (
            <NewsCard key={n.id} n={n} />
          ))}
        </div>
        <div data-reveal="up" className="mt-10 md:ml-[220px]">
          <ButtonLink href="/noticias" variant="ghost">
            Todas as notícias
          </ButtonLink>
        </div>
      </section>
      )}

      {/* 03: Comunidade (Twitch + Discord) */}
      <section className="wrap py-28 md:py-40">
        <SectionHead n="03" label="Comunidade" title="Assista e" muted="chegue junto.">
          <p data-reveal="up" className="mt-6 max-w-xl text-gray">
            A INGEN transmite na Twitch. Quando o canal estiver ao vivo, a partida aparece aqui e um aviso fica fixo no canto da tela em
            qualquer página.
          </p>
        </SectionHead>
        <div className="mt-14 grid gap-4 md:ml-[220px] lg:grid-cols-[1.6fr_1fr]">
          <div data-reveal="up">
            <TeamTwitchPanel />
          </div>
          <a
            data-reveal="up"
            data-delay="0.1"
            href={LINKS.discord}
            target="_blank"
            rel="noopener noreferrer"
            className="border-run clip-step group relative flex flex-col justify-between overflow-hidden bg-[#5865f2] p-6 text-white md:p-8"
          >
            <span className="pointer-events-none absolute inset-0 bg-dots opacity-40" />
            <DiscordIcon className="pointer-events-none absolute -bottom-10 -right-10 size-56 text-white/10 transition-transform duration-700 group-hover:-rotate-12 group-hover:scale-110" />
            <span className="relative">
              <span className="font-mono text-[0.68rem] uppercase tracking-[0.2em] text-white/75">Discord oficial</span>
              <span className="mt-4 block font-display text-5xl font-black uppercase leading-[0.9]">
                Entre no <br /> servidor.
              </span>
              <span className="mt-4 block max-w-xs text-sm text-white/85">
                Treinos, avisos de live, resultados e recrutamento. É por lá que a staff conversa com quem quer jogar.
              </span>
            </span>
            <span className="clip-step-sm relative mt-8 inline-flex w-fit items-center gap-3 bg-white px-5 py-3 font-mono text-[0.75rem] font-semibold uppercase tracking-[0.16em] text-[#3a43c4] transition-transform duration-300 group-hover:-translate-y-0.5">
              <DiscordIcon /> Entrar no Discord <span aria-hidden>↗</span>
            </span>
          </a>
        </div>
      </section>

      {/* 04: Recrutamento */}
      {openSlots.length > 0 && (
        <section className="wrap pb-10">
          <div data-reveal="scale" className="clip-step relative overflow-hidden bg-[image:var(--grad-ingen)] p-8 text-bg-0 md:p-16">
            <div className="pointer-events-none absolute inset-0 bg-dots opacity-30 mix-blend-multiply" />
            <div className="relative grid gap-10 md:grid-cols-[1.3fr_1fr] md:items-end">
              <div>
                <p className="font-mono text-[0.7rem] uppercase tracking-[0.2em]">04 · Recrutamento</p>
                <h2 className="mt-4 font-display text-[clamp(3rem,8vw,6.5rem)] font-black uppercase leading-[0.95]">
                  Sua lane está <br /> esperando.
                </h2>
                <p className="mt-6 max-w-md text-base font-medium">
                  Quer defender o escudo? Entre no Discord e chame a staff com seu Riot ID, lane, elo e disponibilidade.
                </p>
                <a
                  href={LINKS.discord}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="clip-step-sm group mt-8 inline-flex items-center gap-3 bg-bg-0 px-6 py-4 font-mono text-[0.78rem] font-semibold uppercase tracking-[0.16em] text-white transition-all duration-300 hover:bg-[#5865f2] hover:shadow-[0_12px_40px_-8px_rgb(88_101_242/0.8)]"
                >
                  <DiscordIcon className="size-5" /> Candidatar-se no Discord
                  <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">↗</span>
                </a>
              </div>
              <div className="space-y-3">
                {openSlots.map((o) => (
                  <a
                    key={`${o.team.slug}-${o.role}`}
                    href={RECRUIT_HREF}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center justify-between bg-bg-0 px-5 py-4 text-white transition-transform duration-300 hover:-translate-y-0.5"
                  >
                    <span className="flex items-center gap-3">
                      <LaneIcon role={o.role} className="size-7" />
                      <span className="font-display text-2xl font-extrabold uppercase">{ROLE_META[o.role].label}</span>
                    </span>
                    <span className="font-mono text-[0.68rem] uppercase tracking-[0.16em] text-gray group-hover:text-green">
                      {o.team.name} <span aria-hidden>↗</span>
                    </span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}
    </RevealScope>
  );
}
