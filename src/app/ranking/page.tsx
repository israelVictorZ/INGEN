import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getSiteData } from "@/lib/data";
import { RevealScope } from "@/components/motion/RevealScope";
import { Split } from "@/components/motion/Split";
import { LaneIcon } from "@/components/brand/LaneIcon";
import { RankEmblem, TeamTag } from "@/components/ui";
import { championIcon, profileIcon } from "@/lib/ddragon-urls";
import { TeamEloChart, type EloSeries } from "@/components/ranking/TeamEloChart";
import { TIER_META, fixed, pct, rankLabel } from "@/lib/format";
import { ogFor } from "@/lib/site";

export const metadata: Metadata = {
  title: "Ranking interno",
  description: "Ranking interno da INGEN: todos os jogadores da Black e da Silver ordenados por elo na ranqueada Solo/Duo, com PDL e winrate.",
  alternates: { canonical: "/ranking" },
  openGraph: ogFor("/ranking"),
};

export default async function RankingPage() {
  const { players, version, lastSync } = await getSiteData();
  // Ranking: única exceção à regra "Black primeiro". Aqui vale só o elo.
  const ranked = [...players].sort((a, b) => (b.solo?.score ?? -1) - (a.solo?.score ?? -1));
  const top = ranked[0]?.solo?.score ?? 1;
  const until = lastSync ? new Date(lastSync).getTime() : Math.max(0, ...players.flatMap((p) => p.rankHistory.map((h) => h.t)));

  // cor fixa por jogador (ordem do elenco: Black antes da Silver), validada para daltonismo no fundo escuro
  const PALETTE = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300", "#9085e9", "#e66767"];
  const series: EloSeries[] = players.map((p, i) => ({
    slug: p.slug,
    name: p.displayName,
    team: p.team.shortName,
    color: PALETTE[i % PALETTE.length],
    pts: p.rankHistory.map((h) => ({ t: h.t, score: h.score })),
  }));

  // Destaques da semana (últimos 7 dias em relação ao último sync)
  const kda = (w: { kills: number; deaths: number; assists: number }) => (w.kills + w.assists) / Math.max(1, w.deaths);
  // cada jogador aparece em um destaque só (o primeiro da lista de prioridade em que ele ganha)
  const used = new Set<string>();
  const pick = (list: typeof players, score: (p: (typeof players)[number]) => number) => {
    const winner = [...list].filter((p) => !used.has(p.slug)).sort((a, b) => score(b) - score(a))[0] ?? null;
    if (winner) used.add(winner.slug);
    return winner;
  };
  const climber = pick(players.filter((p) => (p.week.lpDelta ?? 0) > 0), (p) => p.week.lpDelta!);
  const gameOfWeek = pick(
    players.filter((p) => p.week.best?.win),
    (p) => kda(p.week.best!) * 10 + p.week.best!.kills,
  );
  const winner = pick(players.filter((p) => p.week.wins > 0), (p) => p.week.wins * 100 + p.week.wins / p.week.games);
  const sharp = pick(players.filter((p) => p.week.games >= 5), (p) => kda(p.week));
  const streaker = pick(players.filter((p) => p.streak >= 2), (p) => p.streak);
  const grinder = pick(players.filter((p) => p.week.games > 0), (p) => p.week.games);
  const highlights = [
    climber && { k: "Maior subida", p: climber, v: `+${climber.week.lpDelta} PDL`, sub: climber.solo ? `agora ${rankLabel(climber.solo.tier, climber.solo.division)}` : "" },
    winner && { k: "Mais vitórias", p: winner, v: `${winner.week.wins} vitórias`, sub: `em ${winner.week.games} partidas · ${pct(winner.week.wins / winner.week.games)}` },
    sharp && { k: "Melhor KDA", p: sharp, v: fixed(kda(sharp.week), 2), sub: `${sharp.week.games} partidas · mín. 5` },
    gameOfWeek && {
      k: "Partida da semana",
      p: gameOfWeek,
      v: `${gameOfWeek.week.best!.kills}/${gameOfWeek.week.best!.deaths}/${gameOfWeek.week.best!.assists}`,
      sub: `${gameOfWeek.week.best!.name} · ${gameOfWeek.week.best!.win ? "vitória" : "derrota"}`,
      champ: gameOfWeek.week.best!.key,
    },
    streaker && { k: "Em sequência", p: streaker, v: `${streaker.streak} vitórias`, sub: "seguidas, sem perder" },
    grinder && { k: "Mais ativo", p: grinder, v: `${grinder.week.games} partidas`, sub: "na semana" },
  ].filter((x): x is { k: string; p: (typeof players)[number]; v: string; sub: string; champ?: string } => !!x);

  return (
    <RevealScope>
      <section className="relative overflow-hidden pb-12 pt-36 md:pt-44">
        <div className="pointer-events-none absolute inset-0 bg-lines" />
        <div className="wrap relative">
          <p data-reveal="fade" className="label-mono">Ranking interno · Solo/Duo</p>
          <Split as="h1" className="mt-4 font-display text-[clamp(3.5rem,11vw,10rem)] font-black uppercase leading-[0.82] text-white">
            Quem está <br />
            <span className="text-gray-dim">no topo.</span>
          </Split>
        </div>
      </section>

      {/* pódio */}
      <section className="wrap grid gap-4 md:grid-cols-3">
        {ranked.slice(0, 3).map((p, i) => {
          const color = p.solo ? TIER_META[p.solo.tier]?.color : undefined;
          return (
            <Link
              key={p.slug}
              href={`/jogador/${p.slug}`}
              data-reveal="up"
              data-delay={i * 0.1}
              className={`border-run clip-step group relative overflow-hidden bg-bg-2 p-6 ${i === 0 ? "md:-translate-y-6" : ""}`}
            >
              <span className="absolute right-4 top-2 font-pixel text-7xl leading-none text-white/[0.06]">{i + 1}</span>
              <div className="pointer-events-none absolute -bottom-16 -left-10 size-48 rounded-full opacity-25 blur-3xl" style={{ background: color }} />
              <div className="relative flex items-center gap-5">
                {p.solo && (
                  <div className="flex size-16 items-center justify-center">
                    <RankEmblem tier={p.solo.tier} size={44} />
                  </div>
                )}
                <div>
                  <TeamTag accent={p.team.accent} name={p.team.shortName} />
                  <p className="mt-1 font-display text-4xl font-black uppercase leading-none text-white group-hover:text-green">{p.displayName}</p>
                  {p.solo && (
                    <p className="mt-1 font-mono text-xs uppercase tracking-wider" style={{ color }}>
                      {rankLabel(p.solo.tier, p.solo.division)} · {p.solo.lp} PDL
                    </p>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </section>

      {highlights.length > 0 && (
        <section className="wrap mt-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 data-reveal="up" className="font-display text-3xl font-extrabold uppercase text-white md:text-4xl">
              Destaques <span className="text-gray-dim">da semana</span>
            </h2>
            <p className="label-mono">Últimos 7 dias · Solo/Duo</p>
          </div>
          <div data-reveal="stagger" className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {highlights.map((h) => {
              const icon = h.champ ? championIcon(version, h.champ) : h.p.profileIconId ? profileIcon(version, h.p.profileIconId) : null;
              return (
                <Link key={h.k} href={`/jogador/${h.p.slug}`} className="border-run clip-step group relative flex items-center gap-4 overflow-hidden bg-bg-2 p-5">
                  {icon && <Image src={icon} alt="" width={52} height={52} className="clip-step-sm shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-green">{h.k}</p>
                    <p className="mt-1 truncate font-display text-2xl font-black uppercase leading-none text-white group-hover:text-green">{h.p.displayName}</p>
                    <p className="mt-1 truncate font-mono text-[0.65rem] text-gray">{h.sub}</p>
                  </div>
                  <p className="shrink-0 text-right font-display text-2xl font-black leading-none text-white">{h.v}</p>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <section data-reveal="up" className="wrap mt-20">
        <TeamEloChart series={series} until={until} />
      </section>

      <section className="wrap mt-16">
        <div className="hidden grid-cols-[48px_1.4fr_1fr_1.2fr_90px] gap-4 border-b border-line pb-3 md:grid">
          {["#", "Jogador", "Time", "Elo", "Winrate"].map((h) => (
            <span key={h} className="label-mono text-[0.6rem]">{h}</span>
          ))}
        </div>
        <ol data-reveal="stagger">
          {ranked.map((p, i) => {
            const color = p.solo ? TIER_META[p.solo.tier]?.color : "#5a606a";
            return (
              <li key={p.slug} className="border-b border-line">
                <Link
                  href={`/jogador/${p.slug}`}
                  className="group grid grid-cols-[36px_1fr_auto] items-center gap-4 py-4 transition-colors hover:bg-bg-2 md:grid-cols-[48px_1.4fr_1fr_1.2fr_90px]"
                >
                  <span className="font-pixel text-lg text-gray-dim group-hover:text-green">{String(i + 1).padStart(2, "0")}</span>
                  <span className="flex items-center gap-3">
                    {p.champions[0] && (
                      <Image src={championIcon(version, p.champions[0].key)} alt="" width={40} height={40} className="clip-step-sm" />
                    )}
                    <span>
                      <span className="block font-display text-2xl font-extrabold uppercase leading-none text-white">{p.displayName}</span>
                      <span className="flex items-center gap-1.5 font-mono text-[0.65rem] text-gray">
                        <LaneIcon role={p.role} className="size-3.5" /> {p.gameName}#{p.tagLine}
                      </span>
                    </span>
                  </span>
                  <span className="hidden md:block">
                    <TeamTag accent={p.team.accent} name={p.team.name} />
                  </span>
                  <span className="hidden md:block">
                    <span className="font-mono text-xs uppercase tracking-wider" style={{ color }}>
                      {p.solo ? `${rankLabel(p.solo.tier, p.solo.division)} · ${p.solo.lp} PDL` : "Sem ranqueada"}
                    </span>
                    <span className="mt-1.5 block h-1 bg-bg-3">
                      <span data-reveal="bar" className="block h-full" style={{ width: `${((p.solo?.score ?? 0) / top) * 100}%`, background: color }} />
                    </span>
                  </span>
                  <span className={`text-right font-mono text-sm ${p.solo && p.solo.winrate >= 0.5 ? "text-green" : "text-gray"}`}>
                    <span className="md:hidden block text-[0.62rem] uppercase" style={{ color }}>
                      {p.solo ? rankLabel(p.solo.tier, p.solo.division) : "—"}
                    </span>
                    {p.solo ? pct(p.solo.winrate) : "—"}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
        <p className="mt-6 font-mono text-[0.62rem] uppercase tracking-[0.18em] text-gray-dim">
          Ordenado por elo na ranqueada Solo/Duo · Winrate da temporada
        </p>
      </section>
    </RevealScope>
  );
}
