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
import { ROLE_META, TIER_META, sampleLabel, fixed, opggMultiUrl, opggUrl, pct, rankLabel, riotId, scoreToLabel } from "@/lib/format";
import { SITE_URL, ogFor } from "@/lib/site";
import { scoutRead, teamPool, teamSummary } from "@/lib/scouting";

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
  const data = await getSiteData();
  const { teams, version } = data;
  const team = teams.find((t) => t.slug === time);
  if (!team) notFound();
  const site = SITE_URL;

  const pool = teamPool(team);
  const summary = teamSummary(team);
  const generatedAt = data.lastSync
    ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(data.lastSync))
    : null;

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

          <p data-reveal="fade" className="mt-4 font-mono text-[0.68rem] uppercase tracking-[0.16em] text-gray">
            {generatedAt ? `Dados de ${generatedAt}` : "Dados recentes"} · Patch {version.split(".").slice(0, 2).join(".")} · Solo/Duo
          </p>

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

      {/* RESUMO */}
      <section className="wrap mb-12">
        <h2 data-reveal="up" className="font-display text-3xl font-extrabold uppercase text-white md:text-4xl">
          Resumo <span className="text-gray-dim">do time</span>
        </h2>
        <div data-reveal="stagger" className="mt-6 grid grid-cols-2 gap-px bg-line lg:grid-cols-4">
          {[
            summary.strongest && {
              k: "Lane mais forte",
              v: summary.strongest.displayName,
              sub: `${ROLE_META[summary.strongest.role].label} · ${rankLabel(summary.strongest.solo!.tier, summary.strongest.solo!.division)}`,
              tone: "text-green",
            },
            summary.hot && { k: "Em melhor fase", v: summary.hot.p.displayName, sub: `${summary.hot.wins} vitórias nas últimas ${summary.hot.of}`, tone: "text-green" },
            summary.weakest && {
              k: "Lane mais vulnerável",
              v: summary.weakest.displayName,
              sub: `${ROLE_META[summary.weakest.role].label} · ${rankLabel(summary.weakest.solo!.tier, summary.weakest.solo!.division)}`,
              tone: "text-loss",
            },
            summary.cold
              ? { k: "Fase ruim", v: summary.cold.p.displayName, sub: `${summary.cold.wins} vitórias nas últimas ${summary.cold.of}`, tone: "text-loss" }
              : summary.open.length
                ? { k: "Vaga aberta", v: summary.open.join(", "), sub: "Escalação incompleta", tone: "text-loss" }
                : null,
          ]
            .filter((x): x is { k: string; v: string; sub: string; tone: string } => !!x)
            .map((x) => (
              <div key={x.k} className="min-w-0 bg-bg-1 p-4 sm:p-5">
                <p className={`font-mono text-[0.56rem] uppercase tracking-[0.16em] sm:text-[0.6rem] ${x.tone}`}>{x.k}</p>
                <p className="mt-2 truncate font-display text-2xl font-black uppercase leading-none text-white sm:text-3xl">{x.v}</p>
                <p className="mt-1.5 font-mono text-[0.65rem] text-gray">{x.sub}</p>
              </div>
            ))}
        </div>
        {summary.bans.length > 0 && (
          <div data-reveal="up" className="clip-step mt-3 bg-bg-2 p-5">
            <p className="label-mono">Bans sugeridos contra a {team.name}</p>
            <p className="mt-1 font-mono text-[0.6rem] text-gray-dim">Os campeões mais fortes do time, pesando winrate e quantidade de partidas</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {summary.bans.map((b) => (
                <div key={b.champ.key} className="flex items-center gap-3 bg-bg-0 p-2.5">
                  <Image src={championIcon(version, b.champ.key)} alt="" width={44} height={44} className="clip-step-sm" />
                  <div className="min-w-0">
                    <p className="truncate font-display text-lg font-extrabold uppercase leading-none text-white">{b.champ.name}</p>
                    <p className="mt-1 truncate font-mono text-[0.62rem] text-gray">
                      {b.player.displayName} · {b.champ.reason}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="wrap">
        <h2 data-reveal="up" className="mb-6 font-display text-3xl font-extrabold uppercase text-white md:text-4xl">
          Lane <span className="text-gray-dim">por lane</span>
        </h2>
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
            const read = scoutRead(p);
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

                <div className="mt-5 grid gap-5 border-t border-line pt-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
                  <div>
                    <p className="label-mono mb-1 text-[0.58rem]">Picks mais fortes de {ROLE_META[s.role].short}</p>
                    <p className="mb-3 font-mono text-[0.58rem] text-gray-dim">Ordem pelo winrate ajustado ao nº de partidas: poucos jogos pesam menos</p>
                    {p.laneChampions.length ? (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {p.laneChampions.slice(0, 4).map((c) => {
                          const w = c.wins / c.games;
                          const conf = sampleLabel(c.games);
                          const isBan = read.ban?.championId === c.championId;
                          return (
                            <div key={c.championId} className="relative flex items-center gap-3 bg-bg-0 p-2.5 pr-3">
                              <Image src={championIcon(version, c.key)} alt="" width={44} height={44} className="clip-step-sm" />
                              <div className="min-w-0 flex-1">
                                <p className="flex items-center gap-2">
                                  <span className="truncate font-display text-lg font-extrabold uppercase leading-none text-white">{c.name}</span>
                                  {isBan && <span className="shrink-0 bg-loss px-1.5 py-0.5 font-mono text-[0.5rem] font-semibold uppercase tracking-wider text-white">Ban</span>}
                                </p>
                                <p className="mt-1 font-mono text-[0.62rem] text-gray">
                                  {c.games} {c.games === 1 ? "partida" : "partidas"} · KDA {fixed(c.kda, 1)}
                                </p>
                                <div className="mt-1.5 flex items-center gap-2">
                                  <span className="h-1 flex-1 bg-bg-3">
                                    <span className={`block h-full ${conf === "baixa" ? "bg-gray-dim" : w >= 0.5 ? "bg-green" : "bg-loss/70"}`} style={{ width: `${w * 100}%` }} />
                                  </span>
                                  <span className={`font-mono text-[0.62rem] ${conf === "baixa" ? "text-gray" : w >= 0.5 ? "text-green" : "text-loss"}`}>{pct(w)}</span>
                                </div>
                                <p className="mt-1 flex items-center gap-1 font-mono text-[0.55rem] uppercase tracking-wider text-gray-dim" title="Confiança da amostra">
                                  {[1, 2, 3].map((n) => (
                                    <span key={n} className={`size-1.5 ${n <= (conf === "alta" ? 3 : conf === "média" ? 2 : 1) ? "bg-white/70" : "bg-bg-3"}`} />
                                  ))}
                                  <span className="ml-1">{conf === "baixa" ? "poucos jogos" : `confiança ${conf}`}</span>
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-gray">Sem partidas na lane ainda.</p>
                    )}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                    <div>
                      <p className="label-mono mb-2 text-[0.58rem] !text-green">Pontos fortes</p>
                      {read.strengths.length ? (
                        <ul className="space-y-1.5">
                          {read.strengths.map((x) => (
                            <li key={x.text} className="flex gap-2 text-sm leading-snug text-white">
                              <span aria-hidden className="font-mono text-green">+</span>
                              <span>
                                {x.text}
                                {x.detail && <span className="ml-1.5 font-mono text-[0.62rem] text-gray">{x.detail}</span>}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-gray">Nada que se destaque nas últimas partidas.</p>
                      )}
                    </div>
                    <div>
                      <p className="label-mono mb-2 text-[0.58rem] !text-loss">Fraquezas</p>
                      {read.weaknesses.length ? (
                        <ul className="space-y-1.5">
                          {read.weaknesses.map((x) => (
                            <li key={x.text} className="flex gap-2 text-sm leading-snug text-white">
                              <span aria-hidden className="font-mono text-loss">−</span>
                              <span>
                                {x.text}
                                {x.detail && <span className="ml-1.5 font-mono text-[0.62rem] text-gray">{x.detail}</span>}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-gray">Nenhuma fraqueza clara nas últimas partidas.</p>
                      )}
                      {read.tough.length > 0 && (
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <span className="font-mono text-[0.58rem] uppercase tracking-wider text-gray-dim">Confrontos difíceis</span>
                          {read.tough.map((m) => (
                            <span key={m.key} className="flex items-center gap-1.5 bg-bg-0 py-1 pl-1 pr-2" title={`${m.name}: ${m.wins}V ${m.games - m.wins}D`}>
                              <Image src={championIcon(version, m.key)} alt={m.name} width={22} height={22} />
                              <span className="font-mono text-[0.6rem] text-loss">
                                {m.wins}-{m.games - m.wins}
                              </span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {pool.top.length > 0 && (
        <section className="wrap mt-20 grid gap-10 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <div>
            <h2 data-reveal="up" className="font-display text-3xl font-extrabold uppercase text-white">
              Pool <span className="text-gray-dim">do time</span>
            </h2>
            <p className="mt-2 font-mono text-[0.65rem] text-gray">
              {pool.unique} campeões diferentes nas Solo/Duo recentes · os mais jogados somando todos
            </p>
            <div data-reveal="stagger" className="mt-6 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {pool.top.map((c) => (
                <div key={c.key} className="clip-step-sm relative overflow-hidden bg-bg-2 p-3 text-center">
                  <Image src={championIcon(version, c.key)} alt={c.name} width={52} height={52} className="mx-auto" />
                  <p className="mt-2 truncate font-display text-base font-extrabold uppercase text-white">{c.name}</p>
                  <p className="font-mono text-[0.62rem] text-gray">
                    {c.games}j · <span className={c.wins / c.games >= 0.5 ? "text-green" : "text-loss"}>{pct(c.wins / c.games)}</span>
                  </p>
                  <p className="mt-0.5 truncate font-mono text-[0.55rem] uppercase tracking-wider text-gray-dim">{c.by.map((b) => b.name).join(" · ")}</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h2 data-reveal="up" className="font-display text-3xl font-extrabold uppercase text-white">
              Picks <span className="text-gray-dim">compartilhados</span>
            </h2>
            <p className="mt-2 font-mono text-[0.65rem] text-gray">Campeões que mais de um jogador usa: dá flexibilidade no draft</p>
            {pool.shared.length ? (
              <ul data-reveal="stagger" className="mt-6 space-y-2">
                {pool.shared.slice(0, 8).map((c) => (
                  <li key={c.key} className="flex items-center gap-3 bg-bg-2 p-2.5">
                    <Image src={championIcon(version, c.key)} alt="" width={40} height={40} className="clip-step-sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-lg font-extrabold uppercase leading-none text-white">{c.name}</p>
                      <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                        {c.by.map((b) => (
                          <span key={b.slug} className="flex items-center gap-1 font-mono text-[0.6rem] text-gray">
                            <LaneIcon role={b.role} className="size-3.5" /> {b.name} <span className="text-gray-dim">{b.games}j</span>
                          </span>
                        ))}
                      </p>
                    </div>
                    <span className={`font-mono text-xs ${c.wins / c.games >= 0.5 ? "text-green" : "text-loss"}`}>{pct(c.wins / c.games)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-6 text-sm text-gray">Nenhum campeão é jogado por mais de um jogador.</p>
            )}
          </div>
        </section>
      )}
    </RevealScope>
  );
}
