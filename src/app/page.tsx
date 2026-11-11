import Link from "next/link";
import { getSiteData } from "@/lib/data";
import { RevealScope } from "@/components/motion/RevealScope";
import { Hero } from "@/components/home/Hero";
import { Marquee } from "@/components/home/Marquee";
import { NewsCard } from "@/components/news/NewsCard";
import { LaneIcon } from "@/components/brand/LaneIcon";
import { SectionHead, ButtonLink, RankLine, TeamTag } from "@/components/ui";
import { ROLE_META, TIER_META, rankLabel, scoreToLabel } from "@/lib/format";

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
      <Hero
        blackAvg={black?.avgScore != null ? scoreToLabel(black.avgScore) : "—"}
        silverAvg={silver?.avgScore != null ? scoreToLabel(silver.avgScore) : "—"}
      />

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
                      <Link href="/noticias/recrutamento-top-e-mid" className="group flex items-center gap-4 py-3.5">
                        <LaneIcon role={s.role} className="size-6 shrink-0 opacity-40" />
                        <span className="w-10 font-mono text-[0.65rem] uppercase tracking-widest text-gray-dim">{ROLE_META[s.role].short}</span>
                        <span className="flex-1 font-display text-2xl font-extrabold uppercase leading-none text-gray-dim">Vaga aberta</span>
                        <span className="font-mono text-[0.65rem] uppercase tracking-widest text-green group-hover:underline">Candidatar →</span>
                      </Link>
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

          <ol data-reveal="stagger" className="mt-14 grid gap-3 md:ml-[220px] md:grid-cols-3">
            {podium.map((p, i) => {
              const color = TIER_META[p.solo!.tier]?.color;
              return (
                <li key={p.slug}>
                  <Link href={`/jogador/${p.slug}`} className="border-run clip-step group relative flex h-full items-center gap-4 overflow-hidden bg-bg-2 p-5">
                    <span className="font-pixel text-5xl leading-none text-white/15 group-hover:text-green">{i + 1}</span>
                    <span className="min-w-0 flex-1">
                      <TeamTag accent={p.team.accent} name={p.team.name} />
                      <span className="mt-1 block truncate font-display text-3xl font-black uppercase leading-none text-white">{p.displayName}</span>
                      <span className="mt-1 block font-mono text-xs uppercase tracking-wider" style={{ color }}>
                        {rankLabel(p.solo!.tier, p.solo!.division)} · {p.solo!.lp} PDL
                      </span>
                    </span>
                    <LaneIcon role={p.role} className="size-8 shrink-0" />
                  </Link>
                </li>
              );
            })}
          </ol>

          <dl data-reveal="stagger" className="mt-3 grid gap-px bg-line md:ml-[220px] md:grid-cols-3">
            {[
              { k: "Partidas analisadas", v: String(totalGames), caption: `Últimas ${PER_PLAYER} Solo/Duo de cada jogador` },
              { k: "Winrate da organização", v: totalGames ? ((totalWins / totalGames) * 100).toFixed(0) : "0", suffix: "%", caption: "Vitórias somadas nessas partidas" },
              { k: "Campeões diferentes", v: String(champsPlayed), caption: "Tamanho do pool somando os dois times" },
            ].map((s) => (
              <div key={s.k} className="bg-bg-0 p-6 md:p-8">
                <dt className="label-mono text-[0.62rem]">{s.k}</dt>
                <dd data-reveal="count" data-to={s.v} data-suffix={s.suffix ?? ""} className="mt-4 font-display text-5xl font-black leading-none text-white md:text-6xl">
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

      {/* 03: Notícias */}
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

      {/* 04: Recrutamento */}
      {openSlots.length > 0 && (
        <section className="wrap pb-10">
          <div data-reveal="scale" className="clip-step relative overflow-hidden bg-[image:var(--grad-ingen)] p-8 text-bg-0 md:p-16">
            <div className="pointer-events-none absolute inset-0 bg-dots opacity-30 mix-blend-multiply" />
            <div className="relative grid gap-10 md:grid-cols-[1.3fr_1fr] md:items-end">
              <div>
                <p className="font-mono text-[0.7rem] uppercase tracking-[0.2em]">04 · Recrutamento</p>
                <h2 className="mt-4 font-display text-[clamp(3rem,8vw,6.5rem)] font-black uppercase leading-[0.85]">
                  Sua lane está <br /> esperando.
                </h2>
              </div>
              <div className="space-y-3">
                {openSlots.map((o) => (
                  <Link
                    key={`${o.team.slug}-${o.role}`}
                    href="/noticias/recrutamento-top-e-mid"
                    className="group flex items-center justify-between bg-bg-0 px-5 py-4 text-white transition-transform duration-300 hover:-translate-y-0.5"
                  >
                    <span className="flex items-center gap-3">
                      <LaneIcon role={o.role} className="size-7" />
                      <span className="font-display text-2xl font-extrabold uppercase">{ROLE_META[o.role].label}</span>
                    </span>
                    <span className="font-mono text-[0.68rem] uppercase tracking-[0.16em] text-gray group-hover:text-green">{o.team.name} →</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}
    </RevealScope>
  );
}
