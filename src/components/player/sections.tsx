import Image from "next/image";
import Link from "next/link";
import type { PerfSnap, Player, RecentMatch, SiteData, Stats, WinSplit } from "@/lib/data";
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
/* Métricas agrupadas: Combate · Farm e objetivos · Visão + ritmo      */
/* ------------------------------------------------------------------ */
type MetricDef = {
  k: string;
  get: (s: Stats) => number | null;
  fmt: (v: number) => string;
  /** "low": menor é melhor (mortes); "none": sem ranking (dano recebido depende da função) */
  better?: "high" | "low" | "none";
  sub?: string;
};

const GROUPS: { title: string; hint: string; rows: MetricDef[] }[] = [
  {
    title: "Combate",
    hint: "Médias por partida",
    rows: [
      { k: "Dano / min", get: (s) => s.damagePerMin, fmt: (v) => v.toFixed(0) },
      { k: "Dano no time", get: (s) => s.damageShare, fmt: pct },
      { k: "Part. em abates", get: (s) => s.kp, fmt: pct },
      { k: "Abates solo", get: (s) => s.soloKills, fmt: (v) => v.toFixed(1) },
      { k: "Mortes", get: (s) => s.deaths, fmt: (v) => v.toFixed(1), better: "low" },
      { k: "First blood", get: (s) => s.firstBloodRate, fmt: pct, sub: "participação" },
      { k: "Dano recebido", get: (s) => s.damageTaken, fmt: (v) => `${(v / 1000).toFixed(1)}k`, better: "none" },
    ],
  },
  {
    title: "Farm e objetivos",
    hint: "Economia e pressão de lane",
    rows: [
      { k: "Ouro / min", get: (s) => s.goldPerMin, fmt: (v) => v.toFixed(0) },
      { k: "CS aos 10 min", get: (s) => s.csAt10, fmt: (v) => v.toFixed(1) },
      { k: "Placas de torre", get: (s) => s.turretPlates, fmt: (v) => v.toFixed(1) },
    ],
  },
  {
    title: "Visão",
    hint: "Controle de mapa por partida",
    rows: [
      { k: "Wards colocadas", get: (s) => s.wardsPlaced, fmt: (v) => v.toFixed(1) },
      { k: "Wards destruídas", get: (s) => s.wardsKilled, fmt: (v) => v.toFixed(1) },
      { k: "Control wards", get: (s) => s.controlWards, fmt: (v) => v.toFixed(1) },
    ],
  },
];

function MetricLine({ m, s, peers }: { m: MetricDef; s: Stats; peers: Stats[] }) {
  const me = m.get(s);
  const vals = peers.map(m.get).filter((x): x is number => x != null);
  const better = m.better ?? "high";
  const pos = me == null || better === "none" ? null : 1 + vals.filter((x) => (better === "low" ? x < me : x > me)).length;
  // barra: quão perto do melhor da INGEN (para "low", o melhor é o menor valor)
  const best = better === "low" ? Math.min(...vals) : Math.max(...vals);
  const fill = me == null || !vals.length ? 0 : better === "low" ? (me ? best / me : 1) : best ? me / best : 0;
  return (
    <li className="py-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-mono text-[0.68rem] uppercase tracking-[0.12em] text-gray">
          {m.k}
          {m.sub && <span className="ml-1.5 normal-case tracking-normal text-gray-dim">{m.sub}</span>}
        </span>
        <span className="flex items-baseline gap-2.5">
          <span className="font-display text-xl font-black leading-none text-white">{me != null ? m.fmt(me) : "—"}</span>
          <span className={`w-7 text-right font-mono text-[0.6rem] ${pos === 1 ? "text-green" : pos != null && pos <= 3 ? "text-white-dim" : "text-gray-dim"}`}>
            {pos != null ? `${pos}º` : ""}
          </span>
        </span>
      </div>
      {better !== "none" && (
        <div className="mt-2 h-[3px] bg-bg-3">
          <div data-reveal="bar" className={`h-full ${pos === 1 ? "bg-green" : "bg-white/35"}`} style={{ width: `${Math.max(4, Math.min(1, fill) * 100)}%` }} />
        </div>
      )}
    </li>
  );
}

/** Painéis de métricas por tema. A barra e o "Nº" mostram a posição entre os jogadores da INGEN. */
export function ExtraMetrics({ p, peers }: { p: Player; peers: Stats[] }) {
  const s = p.stats;
  if (!s) return null;
  const ins = p.insights;
  const [combat, ...rest] = GROUPS;
  const panel = (g: (typeof GROUPS)[number]) => (
    <div key={g.title} className="clip-step bg-bg-2 px-6 pb-3 pt-5">
      <div className="flex items-baseline justify-between gap-4 border-b border-line pb-3">
        <p className="label-mono">{g.title}</p>
        <p className="font-mono text-[0.58rem] text-gray-dim">{g.hint}</p>
      </div>
      <ul className="divide-y divide-line/60">
        {g.rows.map((m) => (
          <MetricLine key={m.k} m={m} s={s} peers={peers} />
        ))}
      </ul>
    </div>
  );
  const pace = [
    { k: "Partidas", v: String(s.games), sub: "Solo/Duo analisadas" },
    { k: "Últimos 7 dias", v: ins ? String(ins.gamesLast7d) : "—", sub: "partidas" },
    { k: "Duração média", v: ins ? mmss(ins.avgDurationSec) : "—", sub: "por partida" },
    { k: "Pool", v: ins ? String(ins.uniqueChamps) : "—", sub: ins ? `${ins.comfortChamps} com 3+ jogos · ${pct(ins.oneTrickShare)} no principal` : "campeões" },
  ];
  return (
    <div className="space-y-4">
      <div data-reveal="stagger" className="grid gap-4 lg:grid-cols-2">
        {panel(combat)}
        <div className="grid gap-4">{rest.map(panel)}</div>
      </div>
      <dl data-reveal="stagger" className="grid grid-cols-2 gap-px bg-line md:grid-cols-4">
        {pace.map((m) => (
          <div key={m.k} className="flex items-baseline gap-3 bg-bg-1 px-5 py-4">
            <dd className="font-display text-2xl font-black leading-none text-white">{m.v}</dd>
            <div className="min-w-0">
              <dt className="label-mono text-[0.58rem]">{m.k}</dt>
              <dd className="truncate font-mono text-[0.6rem] text-gray-dim">{m.sub}</dd>
            </div>
          </div>
        ))}
      </dl>
    </div>
  );
}

const mmss = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, "0")}`;

/* ------------------------------------------------------------------ */
/* Leitura do jogador: vitórias × derrotas, tendência, contexto, runas */
/* ------------------------------------------------------------------ */
const PERF_ROWS: { k: keyof PerfSnap; label: string; fmt: (v: number) => string; better: "high" | "low" }[] = [
  { k: "kda", label: "KDA", fmt: (v) => v.toFixed(2), better: "high" },
  { k: "kills", label: "Abates", fmt: (v) => v.toFixed(1), better: "high" },
  { k: "deaths", label: "Mortes", fmt: (v) => v.toFixed(1), better: "low" },
  { k: "kp", label: "Part. abates", fmt: (v) => pct(v), better: "high" },
  { k: "csPerMin", label: "CS/min", fmt: (v) => v.toFixed(1), better: "high" },
  { k: "damagePerMin", label: "Dano/min", fmt: (v) => v.toFixed(0), better: "high" },
  { k: "goldPerMin", label: "Ouro/min", fmt: (v) => v.toFixed(0), better: "high" },
  { k: "visionPerMin", label: "Visão/min", fmt: (v) => v.toFixed(2), better: "high" },
];

function SplitBar({ label, s, hint }: { label: string; s: WinSplit; hint?: string }) {
  const wr = s.games ? s.wins / s.games : 0;
  return (
    <li>
      <div className="flex justify-between font-mono text-[0.66rem] uppercase tracking-wider">
        <span className="text-gray">
          {label}
          {hint && <span className="ml-1.5 normal-case tracking-normal text-gray-dim">{hint}</span>}
        </span>
        <span className={!s.games ? "text-gray-dim" : wr >= 0.5 ? "text-green" : "text-loss"}>
          {s.games ? pct(wr) : "—"} <span className="text-gray-dim">· {s.games}</span>
        </span>
      </div>
      <div className="mt-1.5 h-1.5 bg-bg-3">
        <div data-reveal="bar" className={`h-full ${wr >= 0.5 ? "bg-[image:var(--grad-ingen-x)]" : "bg-loss/70"}`} style={{ width: `${s.games ? wr * 100 : 0}%` }} />
      </div>
    </li>
  );
}

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const PERIODS = ["Madrugada", "Manhã", "Tarde", "Noite"];

export function PlayerInsights({ p, data }: { p: Player; data: Pick<SiteData, "runes" | "runeNames"> }) {
  const ins = p.insights;
  if (!ins) return null;
  const { win, loss } = ins.winLoss;
  const maxCell = Math.max(1, ...ins.schedule.flat());
  // período favorito
  const byPeriod = PERIODS.map((_, pi) => ins.schedule.reduce((s, d) => s + d[pi], 0));
  const favPeriod = byPeriod.indexOf(Math.max(...byPeriod));
  const byDay = ins.schedule.map((d) => d.reduce((a, b) => a + b, 0));
  const favDay = byDay.indexOf(Math.max(...byDay));

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
      {/* Vitórias × derrotas */}
      <div className="clip-step bg-bg-2 p-6">
        <p className="label-mono">Nas vitórias × nas derrotas</p>
        <p className="mt-1 font-mono text-[0.6rem] text-gray-dim">O que muda no jogo dele quando ganha e quando perde</p>
        <table className="mt-5 w-full font-mono text-xs">
          <thead>
            <tr className="text-[0.58rem] uppercase tracking-[0.16em] text-gray-dim">
              <th className="pb-2 text-left font-normal">Média</th>
              <th className="pb-2 text-right font-normal text-green">Vitórias ({win?.games ?? 0})</th>
              <th className="pb-2 text-right font-normal text-loss">Derrotas ({loss?.games ?? 0})</th>
              <th className="pb-2 text-right font-normal">Δ</th>
            </tr>
          </thead>
          <tbody>
            {PERF_ROWS.map((r) => {
              const w = win?.[r.k];
              const l = loss?.[r.k];
              const diff = w != null && l != null && l !== 0 ? (w - l) / Math.abs(l) : null;
              return (
                <tr key={r.k} className="border-t border-line/60">
                  <td className="py-2 text-gray">{r.label}</td>
                  <td className="py-2 text-right text-white">{w != null ? r.fmt(w) : "—"}</td>
                  <td className="py-2 text-right text-white-dim">{l != null ? r.fmt(l) : "—"}</td>
                  <td className="py-2 text-right text-gray-dim">{diff != null ? `${diff > 0 ? "+" : ""}${Math.round(diff * 100)}%` : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Tendência */}
      <div className="clip-step bg-bg-2 p-6">
        <p className="label-mono">Tendência</p>
        <p className="mt-1 font-mono text-[0.6rem] text-gray-dim">Últimas 10 partidas comparadas com as anteriores</p>
        {ins.trend ? (
          <ul className="mt-5 grid grid-cols-2 gap-px bg-line">
            {[{ k: "winrate" as const, label: "Winrate", fmt: (v: number) => pct(v), better: "high" as const }, ...PERF_ROWS.filter((r) => r.k !== "kills")].map((r) => {
              const now = ins.trend!.recent[r.k];
              const before = ins.trend!.previous[r.k];
              const up = now > before;
              const good = now === before ? null : r.better === "low" ? !up : up;
              return (
                <li key={r.k} className="bg-bg-2 p-3">
                  <p className="font-mono text-[0.58rem] uppercase tracking-[0.16em] text-gray-dim">{r.label}</p>
                  <p className="mt-1.5 flex items-baseline gap-2">
                    <span className="font-display text-2xl font-black leading-none text-white">{r.fmt(now)}</span>
                    <span className={`font-mono text-[0.65rem] ${good == null ? "text-gray-dim" : good ? "text-green" : "text-loss"}`}>
                      {now === before ? "=" : up ? "▲" : "▼"} {r.fmt(before)}
                    </span>
                  </p>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-5 text-sm text-gray">Ainda não há partidas suficientes para comparar períodos.</p>
        )}
      </div>

      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-12">
        {/* Contexto: lado e duração */}
        <div className="clip-step bg-bg-2 p-6 xl:col-span-4">
          <p className="label-mono">Contexto de jogo</p>
          <p className="mt-1 font-mono text-[0.6rem] text-gray-dim">Winrate por lado do mapa e por duração</p>
          <div className="mt-5 grid grid-cols-2 gap-2">
            {[
              { label: "Lado azul", s: ins.sides.blue, color: "#4a90e2" },
              { label: "Lado vermelho", s: ins.sides.red, color: "#e2544a" },
            ].map((x) => {
              const wr = x.s.games ? x.s.wins / x.s.games : null;
              return (
                <div key={x.label} className="relative overflow-hidden bg-bg-0 p-3">
                  <span className="absolute inset-y-0 left-0 w-0.5" style={{ background: x.color }} />
                  <p className="font-mono text-[0.58rem] uppercase tracking-[0.16em] text-gray-dim">{x.label}</p>
                  <p className={`mt-1.5 font-display text-2xl font-black leading-none ${wr == null ? "text-gray-dim" : wr >= 0.5 ? "text-green" : "text-loss"}`}>
                    {wr == null ? "—" : pct(wr)}
                  </p>
                  <p className="mt-1 font-mono text-[0.58rem] text-gray-dim">{x.s.games} jogos</p>
                </div>
              );
            })}
          </div>
          <ul className="mt-5 space-y-3.5">
            <SplitBar label="Curtos" hint="até 25 min" s={ins.duration.short} />
            <SplitBar label="Médios" hint="25 a 35 min" s={ins.duration.mid} />
            <SplitBar label="Longos" hint="35+ min" s={ins.duration.long} />
          </ul>
        </div>

        {/* Runas */}
        <div className="clip-step bg-bg-2 p-6 xl:col-span-3">
          <p className="label-mono">Runas principais</p>
          <p className="mt-1 font-mono text-[0.6rem] text-gray-dim">Runa-chave mais usada e o resultado</p>
          {ins.keystones.length ? (
            <ul className="mt-5 space-y-2">
              {ins.keystones.map((k) => {
                const wr = k.wins / k.games;
                return (
                  <li key={k.id} className="flex items-center gap-3 bg-bg-0 p-2.5">
                    {data.runes[k.id] ? (
                      <Image src={runeIcon(data.runes[k.id])} alt="" width={32} height={32} className="rounded-full bg-bg-3" />
                    ) : (
                      <span className="size-8 rounded-full bg-bg-3" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-mono text-[0.7rem] text-white">{data.runeNames[k.id] ?? `Runa ${k.id}`}</span>
                      <span className="mt-1.5 block h-[3px] bg-bg-3">
                        <span className={`block h-full ${wr >= 0.5 ? "bg-green" : "bg-loss/70"}`} style={{ width: `${wr * 100}%` }} />
                      </span>
                    </span>
                    <span className="text-right font-mono text-[0.6rem] leading-tight">
                      <span className={`block ${wr >= 0.5 ? "text-green" : "text-loss"}`}>{pct(wr)}</span>
                      <span className="text-gray-dim">{k.games}j</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-5 text-sm text-gray">Sem dados de runas ainda.</p>
          )}
        </div>

      {/* Quando joga */}
      <div className="clip-step flex flex-col bg-bg-2 p-6 md:col-span-2 xl:col-span-5">
        <p className="label-mono">Quando joga</p>
        <p className="mt-1 font-mono text-[0.6rem] text-gray-dim">
          Horário de Brasília · mais ativo {PERIODS[favPeriod].toLowerCase()}, {WEEKDAYS[favDay].toLowerCase()}
        </p>
        <div className="mt-5 grid flex-1 grid-cols-[auto_repeat(7,minmax(0,1fr))] grid-rows-[auto_repeat(4,minmax(2.25rem,1fr))] gap-1">
          <span />
          {WEEKDAYS.map((d) => (
            <span key={d} className="pb-1 text-center font-mono text-[0.56rem] uppercase tracking-wider text-gray-dim">
              {d}
            </span>
          ))}
          {PERIODS.map((label, pi) => (
            <div key={label} className="contents">
              <span className="flex items-center pr-2 font-mono text-[0.56rem] uppercase tracking-wider text-gray-dim">{label}</span>
              {ins.schedule.map((day, di) => {
                const n = day[pi];
                return (
                  <span
                    key={di}
                    title={`${WEEKDAYS[di]} · ${label}: ${n} ${n === 1 ? "partida" : "partidas"}`}
                    className="flex items-center justify-center font-mono text-[0.6rem] text-bg-0"
                    style={{ background: n ? `rgb(61 253 78 / ${0.15 + (n / maxCell) * 0.85})` : "#1b1f25" }}
                  >
                    {n || ""}
                  </span>
                );
              })}
            </div>
          ))}
        </div>
        <p className="mt-4 font-mono text-[0.6rem] text-gray-dim">Madrugada 0h–6h · manhã 6h–12h · tarde 12h–18h · noite 18h–24h</p>
      </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Forma recente + recordes                                            */
/* ------------------------------------------------------------------ */
export function FormAndRecords({ p, version }: { p: Player; version: string }) {
  const { mostKills, bestKda, mostDamage, mostCs, multiKills } = p.records;
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
      <div className="clip-step grid grid-cols-2 gap-x-4 gap-y-6 bg-bg-2 p-6 sm:grid-cols-3">
        {[
          { label: "Mais abates", m: mostKills, value: mostKills ? `${mostKills.kills} abates` : "—" },
          { label: "Melhor KDA", m: bestKda, value: bestKda ? `${bestKda.kills}/${bestKda.deaths}/${bestKda.assists}` : "—" },
          { label: "Mais dano", m: mostDamage, value: mostDamage ? `${(mostDamage.damage / 1000).toFixed(1)}k` : "—" },
          { label: "Melhor farm", m: mostCs, value: mostCs ? `${(mostCs.cs / (mostCs.durationSec / 60)).toFixed(1)} CS/min` : "—" },
        ].map((r) => (
          <div key={r.label}>
            <p className="label-mono text-[0.6rem]">{r.label}</p>
            {r.m ? (
              <div className="mt-3 flex items-center gap-3">
                <Image src={championIcon(version, r.m.key)} alt={r.m.name} width={40} height={40} className="clip-step-sm" />
                <div className="min-w-0">
                  <p className="font-display text-xl font-black uppercase leading-none text-white">{r.value}</p>
                  <p className="truncate font-mono text-[0.62rem] text-gray-dim">
                    {r.m.name} · {r.m.win ? <span className="text-green">V</span> : <span className="text-loss">D</span>}
                  </p>
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
