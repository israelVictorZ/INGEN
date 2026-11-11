import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getPlayer, getSiteData, type Rank } from "@/lib/data";
import { RevealScope } from "@/components/motion/RevealScope";
import { Split } from "@/components/motion/Split";
import { LaneIcon } from "@/components/brand/LaneIcon";
import { ButtonLink, RankEmblem, TeamTag, WinrateBar } from "@/components/ui";
import { CopyButton } from "@/components/ui/CopyButton";
import { championIcon, championSplash, profileIcon } from "@/lib/ddragon-urls";
import { ROLE_META, TIER_META, fixed, opggUrl, pct, rankLabel, riotId } from "@/lib/format";
import { TimeAgo } from "@/components/ui/TimeAgo";
import { ROLES } from "@/db/schema";
import { mainChamps } from "@/lib/view";

export async function generateStaticParams() {
  const { players } = await getSiteData();
  return players.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/jogador/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const { player } = await getPlayer(slug);
  if (!player) return {};
  return {
    title: `${player.displayName} · ${player.team.name}`,
    description: `${ROLE_META[player.role].label} da ${player.team.name}. ${player.solo ? rankLabel(player.solo.tier, player.solo.division) : ""} · ${riotId(player)}`,
  };
}

function RankCard({ title, rank }: { title: string; rank: Rank | null }) {
  const color = rank ? TIER_META[rank.tier]?.color : undefined;
  return (
    <div className="clip-step relative overflow-hidden bg-bg-2 p-6">
      <div className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full opacity-20 blur-3xl" style={{ background: color }} />
      <p className="label-mono">{title}</p>
      {rank ? (
        <div className="mt-5 flex items-center gap-6">
          <div className="flex size-20 shrink-0 items-center justify-center">
            <RankEmblem tier={rank.tier} size={56} />
          </div>
          <div className="flex-1">
            <p data-reveal="scramble" className="font-display text-3xl font-black uppercase leading-none" style={{ color }}>
              {rankLabel(rank.tier, rank.division)}
            </p>
            <p className="mt-1 font-mono text-sm text-white-dim">{rank.lp} PDL</p>
            <div className="mt-4">
              <WinrateBar value={rank.winrate} wins={rank.wins} losses={rank.losses} />
            </div>
          </div>
        </div>
      ) : (
        <p className="mt-5 font-display text-3xl font-black uppercase text-gray-dim">Sem ranqueada</p>
      )}
    </div>
  );
}

export default async function PlayerPage({ params }: PageProps<"/jogador/[slug]">) {
  const { slug } = await params;
  const { data, player: p } = await getPlayer(slug);
  if (!p) notFound();
  const v = data.version;
  const lane = mainChamps(p);
  const main = lane[0];
  const others = p.champions.filter((c) => c.games > 0 && !p.laneChampions.some((l) => l.championId === c.championId)).slice(0, 6);
  const s = p.stats;
  const mates = data.players.filter((x) => x.team.slug === p.team.slug && x.slug !== p.slug);
  const totalRole = Object.values(p.roleDist).reduce((a, b) => a + (b ?? 0), 0);

  const metrics = s
    ? [
        { k: "KDA", v: fixed(s.kda, 2), to: s.kda, dec: 2, sub: `${fixed(s.kills)} / ${fixed(s.deaths)} / ${fixed(s.assists)}` },
        { k: "Winrate", v: pct(s.winrate), to: s.winrate * 100, dec: 0, suffix: "%", sub: `${s.wins}V ${s.games - s.wins}D` },
        { k: "CS / min", v: fixed(s.csPerMin), to: s.csPerMin, dec: 1 },
        { k: "Visão / min", v: fixed(s.visionPerMin, 2), to: s.visionPerMin, dec: 2 },
        { k: "Ouro / min", v: fixed(s.goldPerMin, 0), to: s.goldPerMin, dec: 0 },
        { k: "Part. em abates", v: pct(s.kp), to: s.kp * 100, dec: 0, suffix: "%" },
        { k: "Dano no time", v: pct(s.damageShare), to: s.damageShare * 100, dec: 0, suffix: "%" },
        { k: "Partidas", v: String(s.games), to: s.games, dec: 0, sub: "Solo/Duo recentes" },
      ]
    : [];

  return (
    <RevealScope>
      {/* HERO */}
      <section className="relative overflow-hidden pb-16 pt-32 md:pt-40">
        {main && (
          <div className="pointer-events-none absolute inset-0">
            <Image src={championSplash(main.key)} alt="" fill priority sizes="100vw" className="object-cover object-[70%_20%] opacity-40" />
            <div className="absolute inset-0 bg-gradient-to-r from-bg-1 via-bg-1/85 to-bg-1/30" />
            <div className="absolute inset-0 bg-gradient-to-t from-bg-1 via-transparent to-bg-1/60" />
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-lines" />
        <div className="wrap relative">
          <div data-reveal="fade" className="flex flex-wrap items-center gap-4">
            <Link href="/elenco" className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-gray hover:text-white">
              ← Elenco
            </Link>
            <span className="text-line">/</span>
            <TeamTag accent={p.team.accent} name={p.team.name} />
          </div>

          <div className="mt-10 flex items-center gap-4">
            <LaneIcon role={p.role} className="size-12" />
            <div>
              <p className="label-mono">{ROLE_META[p.role].label}</p>
              {p.level && <p className="font-mono text-[0.68rem] text-gray-dim">Nível {p.level}</p>}
            </div>
          </div>
          <Split as="h1" className="mt-4 font-display text-[clamp(4rem,14vw,12rem)] font-black uppercase leading-[0.8] text-white">
            {p.displayName}
          </Split>

          <div data-reveal="up" className="mt-8 flex flex-wrap items-center gap-3">
            {p.profileIconId && (
              <Image src={profileIcon(v, p.profileIconId)} alt="" width={44} height={44} className="clip-step-sm" />
            )}
            <span className="font-mono text-base text-white-dim">{riotId(p)}</span>
            <CopyButton text={riotId(p)} label="Copiar Riot ID" />
          </div>
          <div data-reveal="up" data-delay="0.1" className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href={opggUrl(p)} external>
              Ver no op.gg
            </ButtonLink>
            {mates[0] && (
              <ButtonLink href={`/comparar?a=${p.slug}&b=${mates[0].slug}`} variant="ghost">
                Comparar
              </ButtonLink>
            )}
            {p.socials.map((so) => (
              <ButtonLink key={so.url} href={so.url} variant="ghost" external>
                {so.platform}
              </ButtonLink>
            ))}
          </div>
        </div>
      </section>

      {/* ELO */}
      <section className="wrap grid gap-4 md:grid-cols-2">
        <div data-reveal="up">
          <RankCard title="Ranqueada Solo/Duo" rank={p.solo} />
        </div>
        <div data-reveal="up" data-delay="0.1">
          <RankCard title="Ranqueada Flex" rank={p.flex} />
        </div>
      </section>

      {/* MÉTRICAS */}
      {s && (
        <section className="wrap mt-24">
          <div className="flex items-end justify-between gap-6">
            <h2 data-reveal="up" className="font-display text-4xl font-extrabold uppercase text-white md:text-5xl">
              Desempenho <span className="text-gray-dim">recente</span>
            </h2>
            <p className="label-mono hidden md:block">Últimas {s.games} Solo/Duo · Flex não conta</p>
          </div>
          <div data-reveal="stagger" className="mt-8 grid grid-cols-2 gap-px bg-line md:grid-cols-4">
            {metrics.map((m) => (
              <div key={m.k} className="bg-bg-1 p-5 md:p-6">
                <p className="label-mono text-[0.6rem]">{m.k}</p>
                <p
                  data-reveal="count"
                  data-to={m.to}
                  data-decimals={m.dec}
                  data-suffix={m.suffix ?? ""}
                  className="mt-3 font-display text-4xl font-black leading-none text-white md:text-5xl"
                >
                  {m.v}
                </p>
                {m.sub && <p className="mt-2 font-mono text-[0.65rem] text-gray-dim">{m.sub}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* LANES + CAMPEÕES */}
      <section className="wrap mt-24 grid gap-12 lg:grid-cols-[1fr_2fr]">
        <div>
          <h2 data-reveal="up" className="font-display text-3xl font-extrabold uppercase text-white">Lanes jogadas</h2>
          <ul className="mt-6 space-y-4">
            {ROLES.map((r) => {
              const n = p.roleDist[r] ?? 0;
              const share = totalRole ? n / totalRole : 0;
              return (
                <li key={r} className="flex items-center gap-4">
                  <LaneIcon role={r} active={r === p.role} className="size-7 shrink-0 text-gray-dim" />
                  <div className="flex-1">
                    <div className="flex justify-between font-mono text-[0.68rem] uppercase tracking-wider">
                      <span className={r === p.role ? "text-white" : "text-gray"}>{ROLE_META[r].label}</span>
                      <span className="text-gray">{pct(share)}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 bg-bg-3">
                      <div data-reveal="bar" className={`h-full ${r === p.role ? "bg-[image:var(--grad-ingen-x)]" : "bg-gray-dim"}`} style={{ width: `${share * 100}%` }} />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div>
          <h2 data-reveal="up" className="font-display text-3xl font-extrabold uppercase text-white">
            Campeões de {ROLE_META[p.role].label.toLowerCase()}
          </h2>
          <p className="mt-1 font-mono text-[0.65rem] uppercase tracking-[0.16em] text-gray-dim">Melhores winrates na lane · Solo/Duo</p>
          <div data-reveal="stagger" className="mt-6 grid gap-3 sm:grid-cols-2">
            {lane.slice(0, 6).map((c) => (
              <div key={c.championId} className="border-run clip-step-sm group relative flex items-center gap-4 overflow-hidden bg-bg-2 p-3 pr-5">
                <Image src={championIcon(v, c.key)} alt={c.name} width={56} height={56} className="clip-step-sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-xl font-extrabold uppercase leading-none text-white">{c.name}</p>
                  <p className="mt-1 font-mono text-[0.65rem] text-gray">
                    {c.games
                      ? `${c.games} ${c.games === 1 ? "partida" : "partidas"} · KDA ${fixed(c.kda, 1)} · ${fixed(c.csPerMin)} CS/min`
                      : "só maestria"}
                  </p>
                </div>
                {c.games > 0 && (
                  <span className={`text-right font-display text-2xl font-black leading-none ${c.wins / c.games >= 0.5 ? "text-green" : "text-white-dim"}`}>
                    {pct(c.wins / c.games)}
                  </span>
                )}
              </div>
            ))}
          </div>
          {others.length > 0 && (
            <div className="mt-8">
              <p className="label-mono">Fora da lane</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {others.map((c) => (
                  <span key={c.championId} className="flex items-center gap-2 bg-bg-2 py-1 pl-1 pr-3" title={c.name}>
                    <Image src={championIcon(v, c.key)} alt="" width={28} height={28} />
                    <span className="font-mono text-[0.65rem] text-gray">
                      {c.name} · {c.games}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* PARTIDAS */}
      {p.recent.length > 0 && (
        <section className="wrap mt-24">
          <h2 data-reveal="up" className="font-display text-3xl font-extrabold uppercase text-white">Partidas recentes</h2>
          <div className="mt-6 flex gap-1" data-reveal="stagger" aria-label="Sequência de vitórias e derrotas">
            {p.recent.map((m) => (
              <span key={m.matchId} title={m.win ? "Vitória" : "Derrota"} className={`h-2 flex-1 ${m.win ? "bg-green" : "bg-loss/70"}`} />
            ))}
          </div>
          <ul data-reveal="stagger" className="mt-6 divide-y divide-line border-y border-line">
            {p.recent.map((m) => (
              <li key={m.matchId} className="grid grid-cols-[4px_48px_1fr_auto] items-center gap-4 py-3 md:grid-cols-[4px_48px_1fr_120px_130px_150px]">
                <span className={`h-10 ${m.win ? "bg-green" : "bg-loss"}`} />
                <Image src={championIcon(v, m.key)} alt={m.name} width={48} height={48} className="clip-step-sm" />
                <div className="min-w-0">
                  <p className="truncate font-display text-xl font-extrabold uppercase leading-none text-white">{m.name}</p>
                  <p className={`font-mono text-[0.65rem] uppercase tracking-wider ${m.win ? "text-green" : "text-loss"}`}>
                    {m.win ? "Vitória" : "Derrota"} · {m.queueId === 440 ? "Flex" : "Solo/Duo"}
                  </p>
                </div>
                <p className="font-mono text-sm text-white">
                  {m.kills}/<span className="text-loss">{m.deaths}</span>/{m.assists}
                </p>
                <p className="hidden font-mono text-xs text-gray md:block">
                  {m.cs} CS · {(m.cs / (m.durationSec / 60)).toFixed(1)}/min
                </p>
                <p className="hidden text-right font-mono text-xs text-gray-dim md:block">
                  {Math.floor(m.durationSec / 60)}min · <TimeAgo ts={m.gameStart} />
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* COMPANHEIROS */}
      <section className="wrap mt-24">
        <p className="label-mono">Também na {p.team.name}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {mates.map((m) => (
            <Link key={m.slug} href={`/jogador/${m.slug}`} className="clip-step-sm flex items-center gap-2 bg-bg-2 px-4 py-2.5 transition-colors hover:bg-bg-3">
              <LaneIcon role={m.role} className="size-5" />
              <span className="font-display text-lg font-extrabold uppercase text-white">{m.displayName}</span>
            </Link>
          ))}
        </div>
      </section>
    </RevealScope>
  );
}
