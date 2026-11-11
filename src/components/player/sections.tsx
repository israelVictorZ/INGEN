import Image from "next/image";
import Link from "next/link";
import type { Player, RecentMatch, SiteData } from "@/lib/data";
import { championIcon, itemIcon, runeIcon, spellIcon } from "@/lib/ddragon-urls";
import { TIER_META, fixed, pct, rankLabel, scoreToLabel, scoreToTier } from "@/lib/format";
import { TimeAgo } from "@/components/ui/TimeAgo";

/* ------------------------------------------------------------------ */
/* Gráfico de elo                                                      */
/* ------------------------------------------------------------------ */
const fmtDate = (t: number) =>
  new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(t);

/**
 * Gráfico em degraus: cada ponto é uma MUDANÇA real de elo (com a data em que o sync a detectou).
 * Entre mudanças a linha fica parada; ela se estende até a última atualização (`until`).
 */
export function EloChart({ p, until }: { p: Player; until: number | null }) {
  const pts = p.rankHistory;
  if (pts.length === 0) {
    return (
      <div className="clip-step flex min-h-[160px] flex-col justify-center bg-bg-2 p-6">
        <p className="label-mono">Evolução de elo · Solo/Duo</p>
        <p className="mt-3 max-w-md text-sm text-gray">Ainda não há registros de elo para este jogador.</p>
      </div>
    );
  }
  const W = 1000;
  const H = 200;
  const t0 = pts[0].t;
  const t1 = Math.max(until ?? 0, pts.at(-1)!.t, t0 + 60_000);
  const scores = pts.map((x) => x.score);
  const min = Math.floor((Math.min(...scores) - 30) / 100) * 100;
  const max = Math.ceil((Math.max(...scores) + 30) / 100) * 100;
  const x = (t: number) => ((t - t0) / (t1 - t0)) * W;
  const y = (sc: number) => H - ((sc - min) / (max - min)) * H;

  // degraus: horizontal até a próxima mudança, depois vertical
  let d = `M0,${y(pts[0].score).toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) d += ` H${x(pts[i].t).toFixed(1)} V${y(pts[i].score).toFixed(1)}`;
  d += ` H${W}`;

  const ticks: number[] = [];
  for (let sc = min; sc <= max; sc += 100) ticks.push(sc);
  const last = pts.at(-1)!;
  const color = TIER_META[last.tier]?.color ?? "#3dfd4e";
  const delta = last.score - pts[0].score;

  return (
    <div className="clip-step bg-bg-2 p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-mono">Evolução de elo · Solo/Duo</p>
          <p className="mt-2 font-mono text-xs text-gray">
            {pts.length === 1 ? "1 registro" : `${pts.length} mudanças registradas`} desde {fmtDate(t0)}
            {pts.length > 1 && (
              <span className={delta >= 0 ? "text-green" : "text-loss"}>
                {" "}
                · {delta >= 0 ? "+" : ""}
                {delta} PDL no período
              </span>
            )}
          </p>
        </div>
        <p className="font-mono text-xs uppercase tracking-wider" style={{ color }}>
          Agora: {rankLabel(last.tier, last.division)} · {last.lp} PDL
        </p>
      </div>

      <div className="relative mt-6 pl-[92px]">
        {/* rótulos de elo no eixo Y */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-[86px]">
          {ticks.map((sc) => (
            <span
              key={sc}
              className="absolute right-0 -translate-y-1/2 font-mono text-[0.58rem] uppercase tracking-wider text-gray-dim"
              style={{ top: `${(y(sc) / H) * 100}%` }}
            >
              {scoreToLabel(sc)}
            </span>
          ))}
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} className="h-[200px] w-full overflow-visible" preserveAspectRatio="none" data-reveal="draw">
          {ticks.map((sc) => (
            <line key={sc} x1="0" x2={W} y1={y(sc)} y2={y(sc)} stroke="rgb(255 255 255 / .06)" vectorEffect="non-scaling-stroke" />
          ))}
          <path d={`${d} V${H} H0 Z`} fill={`${color}12`} />
          <path data-draw d={d} fill="none" stroke={color} strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
        </svg>
        {/* pontos de mudança (HTML para não distorcer com o preserveAspectRatio) */}
        {pts.map((pt, i) => {
          const diff = i ? pt.score - pts[i - 1].score : null;
          return (
            <span
              key={pt.t}
              title={`${fmtDate(pt.t)} · ${rankLabel(pt.tier, pt.division)} ${pt.lp} PDL${diff != null ? ` (${diff >= 0 ? "+" : ""}${diff})` : ""}`}
              className="group absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-bg-2"
              style={{ left: `calc(92px + (100% - 92px) * ${x(pt.t) / W})`, top: `${(y(pt.score) / H) * 100}%`, background: color }}
            />
          );
        })}
      </div>
      <div className="mt-3 flex justify-between pl-[92px] font-mono text-[0.6rem] uppercase tracking-wider text-gray-dim">
        <span>{fmtDate(t0)}</span>
        <span>Atualizado {fmtDate(t1)}</span>
      </div>
    </div>
  );
}

function rankLabelFromScore(score: number) {
  const tier = scoreToTier(score);
  return TIER_META[tier]?.label ?? tier;
}

/* ------------------------------------------------------------------ */
/* Métricas extras                                                     */
/* ------------------------------------------------------------------ */
export function ExtraMetrics({ p }: { p: Player }) {
  const s = p.stats;
  if (!s) return null;
  const items = [
    { k: "Dano / min", v: fixed(s.damagePerMin, 0) },
    { k: "Dano recebido", v: s.damageTaken != null ? `${(s.damageTaken / 1000).toFixed(1)}k` : "—", sub: "por partida" },
    { k: "CS aos 10 min", v: fixed(s.csAt10, 1) },
    { k: "Abates solo", v: fixed(s.soloKills, 1), sub: "por partida" },
    { k: "Wards colocadas", v: fixed(s.wardsPlaced, 1), sub: "por partida" },
    { k: "Wards destruídas", v: fixed(s.wardsKilled, 1), sub: "por partida" },
    { k: "Control wards", v: fixed(s.controlWards, 1), sub: "compradas por partida" },
    { k: "First blood", v: pct(s.firstBloodRate), sub: "participação" },
  ];
  return (
    <div data-reveal="stagger" className="grid grid-cols-2 gap-px bg-line md:grid-cols-4">
      {items.map((m) => (
        <div key={m.k} className="bg-bg-1 p-5">
          <p className="label-mono text-[0.6rem]">{m.k}</p>
          <p className="mt-2 font-display text-3xl font-black leading-none text-white">{m.v}</p>
          {m.sub && <p className="mt-1 font-mono text-[0.62rem] text-gray-dim">{m.sub}</p>}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Forma recente + recordes                                            */
/* ------------------------------------------------------------------ */
export function FormAndRecords({ p, version }: { p: Player; version: string }) {
  const { mostKills, bestKda, multiKills } = p.records;
  const multiLabel: Record<number, string> = { 2: "Double", 3: "Triple", 4: "Quadra", 5: "Penta" };
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
      <div className="clip-step bg-bg-2 p-6">
        <p className="label-mono">Forma · últimas 10</p>
        <div className="mt-4 flex gap-1.5">
          {p.form.map((w, i) => (
            <span
              key={i}
              className={`flex h-9 flex-1 items-center justify-center font-display text-sm font-black ${w ? "bg-green text-bg-0" : "bg-loss/80 text-white"}`}
            >
              {w ? "V" : "D"}
            </span>
          ))}
        </div>
        <p className="mt-4 font-mono text-xs text-gray">
          {p.streak > 1 && <span className="text-green">{p.streak} vitórias seguidas</span>}
          {p.streak < -1 && <span className="text-loss">{-p.streak} derrotas seguidas</span>}
          {Math.abs(p.streak) <= 1 && <span>Sem sequência no momento</span>}
          {" · "}
          {p.form.filter(Boolean).length} de {p.form.length} vencidas
        </p>
      </div>
      <div className="clip-step grid gap-4 bg-bg-2 p-6 sm:grid-cols-3">
        {[
          { label: "Mais abates", m: mostKills, value: mostKills ? `${mostKills.kills} abates` : "—" },
          { label: "Melhor KDA", m: bestKda, value: bestKda ? `${bestKda.kills}/${bestKda.deaths}/${bestKda.assists}` : "—" },
        ].map((r) => (
          <div key={r.label}>
            <p className="label-mono text-[0.6rem]">{r.label}</p>
            {r.m ? (
              <div className="mt-3 flex items-center gap-3">
                <Image src={championIcon(version, r.m.key)} alt={r.m.name} width={40} height={40} className="clip-step-sm" />
                <div>
                  <p className="font-display text-xl font-black uppercase leading-none text-white">{r.value}</p>
                  <p className="font-mono text-[0.62rem] text-gray-dim">{r.m.name}</p>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-gray">—</p>
            )}
          </div>
        ))}
        <div>
          <p className="label-mono text-[0.6rem]">Multikills</p>
          <ul className="mt-3 space-y-1 font-mono text-xs">
            {[5, 4, 3, 2].map((n) => (
              <li key={n} className="flex justify-between">
                <span className={n >= 4 && multiKills[n] ? "text-green" : "text-gray"}>{multiLabel[n]} kill</span>
                <span className="text-white">{multiKills[n] ?? 0}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tabela completa de campeões                                         */
/* ------------------------------------------------------------------ */
export function ChampionTable({ p, version }: { p: Player; version: string }) {
  const rows = p.champions.filter((c) => c.games > 0);
  if (!rows.length) return null;
  return (
    <div className="clip-step overflow-x-auto bg-bg-2">
      <table className="w-full min-w-[560px] text-left">
        <thead>
          <tr className="border-b border-line">
            {["Campeão", "Partidas", "Winrate", "KDA", "CS/min", "Maestria"].map((h) => (
              <th key={h} className="label-mono px-4 py-3 text-[0.6rem] font-normal">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => {
            const wr = c.wins / c.games;
            const inLane = p.laneChampions.some((l) => l.championId === c.championId);
            return (
              <tr key={c.championId} className="border-b border-line/60 last:border-0">
                <td className="px-4 py-2.5">
                  <span className="flex items-center gap-3">
                    <Image src={championIcon(version, c.key)} alt="" width={32} height={32} />
                    <span className="font-display text-lg font-extrabold uppercase text-white">{c.name}</span>
                    {!inLane && <span className="font-mono text-[0.58rem] uppercase tracking-wider text-gray-dim">fora da lane</span>}
                  </span>
                </td>
                <td className="px-4 py-2.5 font-mono text-sm text-white-dim">{c.games}</td>
                <td className="px-4 py-2.5">
                  <span className="flex items-center gap-2">
                    <span className="h-1 w-16 bg-bg-3">
                      <span className={`block h-full ${wr >= 0.5 ? "bg-green" : "bg-gray-dim"}`} style={{ width: `${wr * 100}%` }} />
                    </span>
                    <span className={`font-mono text-sm ${wr >= 0.5 ? "text-green" : "text-gray"}`}>{pct(wr)}</span>
                  </span>
                </td>
                <td className="px-4 py-2.5 font-mono text-sm text-white-dim">
                  {fixed(c.kda, 2)} <span className="text-gray-dim">({fixed(c.kills)}/{fixed(c.deaths)}/{fixed(c.assists)})</span>
                </td>
                <td className="px-4 py-2.5 font-mono text-sm text-white-dim">{fixed(c.csPerMin)}</td>
                <td className="px-4 py-2.5 font-mono text-sm text-gray">{c.masteryPoints ? `${Math.round(c.masteryPoints / 1000)}k` : "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Confrontos de lane e duo                                            */
/* ------------------------------------------------------------------ */
export function MatchupsAndDuos({ p, version }: { p: Player; version: string }) {
  const mus = p.matchups.slice(0, 8);
  return (
    <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
      <div className="clip-step bg-bg-2 p-6">
        <p className="label-mono">Confrontos de lane · adversário direto</p>
        {mus.length ? (
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {mus.map((m) => {
              const wr = m.wins / m.games;
              return (
                <li key={m.key} className="flex items-center gap-3 bg-bg-0 p-2 pr-4">
                  <Image src={championIcon(version, m.key)} alt="" width={36} height={36} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display text-base font-extrabold uppercase text-white">vs {m.name}</span>
                    <span className="font-mono text-[0.62rem] text-gray">
                      {m.games} {m.games === 1 ? "partida" : "partidas"}
                    </span>
                  </span>
                  <span className={`font-mono text-sm ${wr >= 0.5 ? "text-green" : "text-loss"}`}>{pct(wr)}</span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-gray">Sem dados de confronto ainda.</p>
        )}
      </div>
      <div className="clip-step bg-bg-2 p-6">
        <p className="label-mono">Joga junto com</p>
        {p.duos.length ? (
          <ul className="mt-4 space-y-2">
            {p.duos.map((d) => {
              const wr = d.wins / d.games;
              return (
                <li key={d.slug}>
                  <Link href={`/jogador/${d.slug}`} className="flex items-center justify-between bg-bg-0 px-4 py-3 transition-colors hover:bg-bg-3">
                    <span className="font-display text-xl font-extrabold uppercase text-white">{d.name}</span>
                    <span className="text-right font-mono text-xs">
                      <span className="block text-white-dim">{d.games} partidas juntos</span>
                      <span className={wr >= 0.5 ? "text-green" : "text-loss"}>{pct(wr)} de vitórias</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-gray">Nenhuma partida recente com outros jogadores da INGEN.</p>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Linha de partida detalhada                                          */
/* ------------------------------------------------------------------ */
export function MatchRow({ m, data }: { m: RecentMatch; data: Pick<SiteData, "version" | "spells" | "runes"> }) {
  const v = data.version;
  const mins = m.durationSec / 60;
  const kda = m.deaths === 0 ? m.kills + m.assists : (m.kills + m.assists) / m.deaths;
  return (
    <li className={`relative grid items-center gap-x-4 gap-y-2 border-l-4 bg-bg-2 py-3 pl-4 pr-4 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1.4fr)_auto] ${m.win ? "border-green" : "border-loss"}`}>
      {/* campeão + feitiços + runas */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <Image src={championIcon(v, m.key)} alt={m.name} width={52} height={52} className="clip-step-sm" />
          {m.champLevel && (
            <span className="absolute -bottom-1 -right-1 bg-bg-0 px-1 font-mono text-[0.58rem] text-white-dim">{m.champLevel}</span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-0.5">
          {[m.spell1, m.spell2].map((sp, i) =>
            sp && data.spells[sp] ? (
              <Image key={i} src={spellIcon(v, data.spells[sp])} alt="" width={22} height={22} />
            ) : (
              <span key={i} className="size-[22px] bg-bg-3" />
            ),
          )}
          {m.keystone && data.runes[m.keystone] ? (
            <Image src={runeIcon(data.runes[m.keystone])} alt="" width={22} height={22} className="rounded-full bg-bg-0" />
          ) : (
            <span className="size-[22px] bg-bg-3" />
          )}
          {m.subStyle && data.runes[m.subStyle] ? (
            <Image src={runeIcon(data.runes[m.subStyle])} alt="" width={22} height={22} className="p-0.5" />
          ) : (
            <span className="size-[22px] bg-bg-3" />
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate font-display text-xl font-extrabold uppercase leading-none text-white">{m.name}</p>
          <p className={`font-mono text-[0.62rem] uppercase tracking-wider ${m.win ? "text-green" : "text-loss"}`}>
            {m.win ? "Vitória" : "Derrota"} · {Math.floor(mins)}min
          </p>
          <p className="font-mono text-[0.6rem] text-gray-dim">
            <TimeAgo ts={m.gameStart} />
          </p>
        </div>
      </div>

      {/* KDA */}
      <div>
        <p className="font-mono text-base text-white">
          {m.kills} / <span className="text-loss">{m.deaths}</span> / {m.assists}
        </p>
        <p className="font-mono text-[0.65rem] text-gray">
          KDA {kda.toFixed(2)}
          {m.kp != null && ` · ${pct(m.kp)} part.`}
          {(m.largestMultiKill ?? 0) >= 3 && (
            <span className="ml-1 text-green">{{ 3: "TRIPLE", 4: "QUADRA", 5: "PENTA" }[m.largestMultiKill!]}</span>
          )}
        </p>
      </div>

      {/* itens */}
      <div className="flex flex-wrap items-center gap-1">
        {m.items.length
          ? m.items.map((it, i) =>
              it ? (
                <Image key={i} src={itemIcon(v, it)} alt="" width={28} height={28} className={i === 6 ? "ml-1 rounded-full" : ""} />
              ) : (
                <span key={i} className={`size-7 bg-bg-3 ${i === 6 ? "ml-1 rounded-full" : ""}`} />
              ),
            )
          : null}
        <span className="ml-2 font-mono text-[0.65rem] text-gray">
          {m.cs} CS ({(m.cs / mins).toFixed(1)}) · {(m.damage / 1000).toFixed(1)}k dano
        </span>
      </div>

      {/* adversário */}
      <div className="flex items-center gap-2 md:justify-end">
        {m.opponent && (
          <>
            <span className="font-mono text-[0.6rem] uppercase tracking-wider text-gray-dim">vs</span>
            <Image src={championIcon(v, m.opponent.key)} alt={m.opponent.name} title={m.opponent.name} width={32} height={32} className="opacity-80" />
          </>
        )}
      </div>
    </li>
  );
}

export { rankLabelFromScore };
