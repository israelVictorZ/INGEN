import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getSiteData, type Team } from "@/lib/data";
import { RevealScope } from "@/components/motion/RevealScope";
import { Split } from "@/components/motion/Split";
import { LaneIcon } from "@/components/brand/LaneIcon";
import { ButtonLink } from "@/components/ui";
import { CopyButton, PrintButton } from "@/components/ui/CopyButton";
import { championIcon } from "@/lib/ddragon-urls";
import { mainChamps } from "@/lib/view";
import { ROLE_META, TIER_META, fixed, opggMultiUrl, opggUrl, pct, rankLabel, riotId, scoreToLabel } from "@/lib/format";
import { ogFor } from "@/lib/site";

export async function generateStaticParams() {
  const { teams } = await getSiteData();
  return teams.map((t) => ({ time: t.slug }));
}

export async function generateMetadata({ params }: PageProps<"/scouting/[time]">): Promise<Metadata> {
  const { time } = await params;
  const { teams } = await getSiteData();
  const t = teams.find((x) => x.slug === time);
  return t
    ? {
        title: `Scouting · ${t.name}`,
        description: `Relatório de scouting da ${t.name}: elo, campeões e estatísticas de cada lane.`,
        alternates: { canonical: `/scouting/${t.slug}` },
        openGraph: ogFor(`/scouting/${t.slug}`),
      }
    : {};
}

function discordText(team: Team, url: string) {
  const lines = team.slots.map((s) => {
    const lane = ROLE_META[s.role].short.padEnd(3, " ");
    if (s.kind === "open") return `\`${lane}\` Vaga aberta`;
    const p = s.player;
    const elo = p.solo ? `${rankLabel(p.solo.tier, p.solo.division)} ${p.solo.lp} PDL` : "Sem ranqueada";
    const champs = mainChamps(p).slice(0, 3).map((c) => `${c.name}${c.games ? ` (${c.games}j, ${pct(c.wins / c.games)})` : ""}`).join(", ");
    return `\`${lane}\` **${p.displayName}** (${riotId(p)}): ${elo} · WR ${p.solo ? pct(p.solo.winrate) : "—"} · ${champs}`;
  });
  return [
    `**${team.name}: Relatório de scouting**`,
    `Elo médio: ${team.avgScore != null ? scoreToLabel(team.avgScore) : "—"} · Winrate recente: ${team.stats ? pct(team.stats.winrate) : "—"}`,
    "",
    ...lines,
    "",
    `op.gg: <${opggMultiUrl(team.players)}>`,
    `Relatório completo: <${url}>`,
  ].join("\n");
}

export default async function ScoutingPage({ params }: PageProps<"/scouting/[time]">) {
  const { time } = await params;
  const { teams, version } = await getSiteData();
  const team = teams.find((t) => t.slug === time);
  if (!team) notFound();
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  // Pool do time: campeões mais jogados somando todos os jogadores
  const pool = new Map<string, { key: string; name: string; games: number; wins: number }>();
  team.players.forEach((p) =>
    p.laneChampions.forEach((c) => {
      if (!c.games) return;
      const x = pool.get(c.key) ?? { key: c.key, name: c.name, games: 0, wins: 0 };
      x.games += c.games;
      x.wins += c.wins;
      pool.set(c.key, x);
    }),
  );
  const teamPool = [...pool.values()].sort((a, b) => b.games - a.games).slice(0, 12);

  return (
    <RevealScope>
      <section className="relative overflow-hidden pb-12 pt-36 md:pt-44">
        <div className="pointer-events-none absolute inset-0 bg-lines" />
        <div className="wrap relative">
          <nav data-reveal="fade" className="no-print flex gap-2">
            {teams.map((t) => (
              <Link
                key={t.slug}
                href={`/scouting/${t.slug}`}
                className={`clip-step-sm px-4 py-2 font-mono text-[0.7rem] uppercase tracking-[0.16em] transition-colors ${
                  t.slug === team.slug ? "bg-green text-bg-0" : "bg-bg-3 text-white hover:bg-white hover:text-bg-0"
                }`}
              >
                {t.name}
              </Link>
            ))}
          </nav>
          <p data-reveal="fade" className="label-mono mt-10">Relatório de scouting</p>
          <Split as="h1" className="mt-4 font-display text-[clamp(3.5rem,11vw,9rem)] font-black uppercase leading-[0.82] text-white">
            INGEN <span className={team.accent === "silver" ? "text-silver" : "grad-text"}>{team.shortName}</span>
          </Split>

          <dl data-reveal="stagger" className="mt-10 grid max-w-3xl grid-cols-2 gap-px bg-line md:grid-cols-4">
            {[
              { k: "Elo médio", v: team.avgScore != null ? scoreToLabel(team.avgScore) : "—" },
              { k: "Winrate recente", v: team.stats ? pct(team.stats.winrate) : "—" },
              { k: "Partidas", v: String(team.stats?.games ?? 0) },
              { k: "Escalação", v: `${team.players.length}/5` },
            ].map((s) => (
              <div key={s.k} className="bg-bg-1 p-4">
                <dt className="label-mono text-[0.6rem]">{s.k}</dt>
                <dd className="mt-2 font-display text-2xl font-extrabold uppercase leading-none text-white">{s.v}</dd>
              </div>
            ))}
          </dl>

          <div data-reveal="up" className="no-print mt-10 flex flex-wrap gap-3">
            <ButtonLink href={opggMultiUrl(team.players)} external>
              Abrir no op.gg multi-search
            </ButtonLink>
            <CopyButton text={discordText(team, `${site}/scouting/${team.slug}`)} label="Copiar para Discord" />
            <PrintButton />
          </div>
        </div>
      </section>

      <section className="wrap">
        <div data-reveal="stagger" className="space-y-3">
          {team.slots.map((s) => {
            if (s.kind === "open")
              return (
                <div key={s.role} className="clip-step flex items-center gap-5 border border-dashed border-green/25 bg-bg-1 p-5">
                  <LaneIcon role={s.role} className="size-10 opacity-60" />
                  <span className="w-12 font-mono text-xs uppercase tracking-widest text-gray-dim">{ROLE_META[s.role].short}</span>
                  <span className="font-display text-3xl font-black uppercase text-gray-dim">Vaga aberta</span>
                </div>
              );
            const p = s.player;
            const color = p.solo ? TIER_META[p.solo.tier]?.color : undefined;
            const roleShare = p.stats ? (p.roleDist[p.role] ?? 0) / p.stats.games : null;
            return (
              <div key={s.role} className="clip-step bg-bg-2 p-5 md:p-6">
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.6fr)] lg:items-center">
                  <div className="flex items-center gap-5">
                    <LaneIcon role={s.role} className="size-11 shrink-0" />
                    <div className="min-w-0">
                      <Link href={`/jogador/${p.slug}`} className="font-display text-4xl font-black uppercase leading-none text-white hover:text-green">
                        {p.displayName}
                      </Link>
                      <a href={opggUrl(p)} target="_blank" rel="noopener noreferrer" className="block truncate font-mono text-xs text-gray hover:text-green">
                        {riotId(p)} ↗
                      </a>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3 font-mono text-xs sm:grid-cols-4">
                    <div>
                      <p className="label-mono text-[0.55rem]">Solo/Duo</p>
                      <p className="mt-1 uppercase" style={{ color }}>{p.solo ? rankLabel(p.solo.tier, p.solo.division) : "—"}</p>
                      <p className="text-gray-dim">{p.solo ? `${p.solo.lp} PDL · ${pct(p.solo.winrate)} na temporada` : ""}</p>
                    </div>
                    <div>
                      <p className="label-mono text-[0.55rem]">KDA médio</p>
                      <p className="mt-1 text-white">{fixed(p.stats?.kda, 2)}</p>
                      <p className="text-gray-dim">{p.stats ? `${fixed(p.stats.kills)}/${fixed(p.stats.deaths)}/${fixed(p.stats.assists)}` : ""}</p>
                    </div>
                    <div>
                      <p className="label-mono text-[0.55rem]">Farm e visão</p>
                      <p className="mt-1 text-white">{p.stats ? `${fixed(p.stats.csPerMin)} CS/min` : "—"}</p>
                      <p className="text-gray-dim">{p.stats ? `${fixed(p.stats.visionPerMin, 2)} visão/min` : ""}</p>
                    </div>
                    <div>
                      <p className="label-mono text-[0.55rem]">Joga na lane</p>
                      <p className="mt-1 text-white">{pct(roleShare)}</p>
                      <p className="text-gray-dim">{p.stats ? `das últimas ${p.stats.games}` : ""}</p>
                    </div>
                  </div>
                </div>

                {p.laneChampions.length > 0 && (
                  <div className="mt-5 border-t border-line pt-5">
                    <p className="label-mono mb-3 text-[0.58rem]">Campeões de {ROLE_META[s.role].short} · melhores winrates</p>
                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                      {p.laneChampions.slice(0, 4).map((c) => {
                        const w = c.wins / c.games;
                        return (
                          <div key={c.championId} className="flex items-center gap-3 bg-bg-0 p-2.5 pr-4">
                            <Image src={championIcon(version, c.key)} alt="" width={48} height={48} className="clip-step-sm" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-display text-lg font-extrabold uppercase leading-none text-white">{c.name}</p>
                              <p className="mt-1 font-mono text-[0.62rem] text-gray">
                                {c.games} {c.games === 1 ? "partida" : "partidas"} · KDA {fixed(c.kda, 1)}
                              </p>
                              <div className="mt-1.5 flex items-center gap-2">
                                <span className="h-1 flex-1 bg-bg-3">
                                  <span className={`block h-full ${w >= 0.5 ? "bg-green" : "bg-gray-dim"}`} style={{ width: `${w * 100}%` }} />
                                </span>
                                <span className={`font-mono text-[0.62rem] ${w >= 0.5 ? "text-green" : "text-gray"}`}>{pct(w)} vitórias</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {teamPool.length > 0 && (
        <section className="wrap mt-20">
          <h2 data-reveal="up" className="font-display text-3xl font-extrabold uppercase text-white">
            Pool do time <span className="text-gray-dim">(nas lanes de cada um)</span>
          </h2>
          <div data-reveal="stagger" className="mt-6 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
            {teamPool.map((c) => (
              <div key={c.key} className="clip-step-sm relative overflow-hidden bg-bg-2 p-3 text-center">
                <Image src={championIcon(version, c.key)} alt={c.name} width={56} height={56} className="mx-auto" />
                <p className="mt-2 truncate font-display text-base font-extrabold uppercase text-white">{c.name}</p>
                <p className="font-mono text-[0.62rem] text-gray">
                  {c.games}j · <span className={c.wins / c.games >= 0.5 ? "text-green" : ""}>{pct(c.wins / c.games)}</span>
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </RevealScope>
  );
}
