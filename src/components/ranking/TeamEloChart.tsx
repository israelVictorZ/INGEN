"use client";

import { useMemo, useRef, useState } from "react";
import { scoreToLabel } from "@/lib/format";

export type EloSeries = {
  slug: string;
  name: string;
  team: string;
  color: string;
  /** reservas: linha tracejada */
  dashed?: boolean;
  /** mudanças de elo (score = tier*400 + divisão*100 + PDL) */
  pts: { t: number; score: number }[];
};

const RANGES = [
  { k: "7d", label: "7 dias", ms: 7 * 86_400_000 },
  { k: "30d", label: "30 dias", ms: 30 * 86_400_000 },
  { k: "all", label: "Tudo", ms: Infinity },
] as const;

const W = 1000;
const H = 320;
const fmt = (t: number) =>
  new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(t);

/** Valor da série no instante t (gráfico em degraus: vale o último ponto até t). */
const valueAt = (pts: EloSeries["pts"], t: number) => {
  let v: number | null = null;
  for (const p of pts) {
    if (p.t <= t) v = p.score;
    else break;
  }
  return v;
};

/**
 * Evolução de elo de todos os jogadores juntos.
 * Linhas em degraus, cor fixa por jogador, nome no fim de cada linha; passar o mouse destaca um jogador
 * e mostra o elo de todos naquele momento.
 */
export function TeamEloChart({ series, until }: { series: EloSeries[]; until: number }) {
  const [range, setRange] = useState<(typeof RANGES)[number]["k"]>("all");
  const [focus, setFocus] = useState<string | null>(null);
  const [hoverT, setHoverT] = useState<number | null>(null);
  const box = useRef<HTMLDivElement>(null);

  const withData = series.filter((s) => s.pts.length);
  const first = Math.min(...withData.map((s) => s.pts[0].t));
  const r = RANGES.find((x) => x.k === range)!;
  const t0 = Math.max(first, until - r.ms);
  // fim do eixo: o último sync completo OU o registro mais recente, o que vier depois. Um jogador
  // sincronizado sozinho (ex.: recém-cadastrado) tem registros depois do último sync completo, e a
  // linha dele sairia do gráfico, por cima dos nomes.
  const last = Math.max(...withData.map((s) => s.pts.at(-1)!.t));
  const t1 = Math.max(until, last, t0 + 60_000);

  const { min, max, ticks } = useMemo(() => {
    const vals = withData.flatMap((s) => [...s.pts.filter((p) => p.t >= t0).map((p) => p.score), valueAt(s.pts, t0)].filter((v): v is number => v != null));
    const lo = Math.floor((Math.min(...vals) - 40) / 100) * 100;
    const hi = Math.ceil((Math.max(...vals) + 40) / 100) * 100;
    const step = hi - lo > 1200 ? 400 : hi - lo > 600 ? 200 : 100;
    const tk: number[] = [];
    for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) tk.push(v);
    return { min: lo, max: hi, ticks: tk };
  }, [withData, t0]);

  const x = (t: number) => ((Math.min(Math.max(t, t0), t1) - t0) / (t1 - t0)) * W;
  const y = (v: number) => H - ((v - min) / (max - min)) * H;

  const paths = withData.map((s) => {
    const start = valueAt(s.pts, t0);
    const inRange = s.pts.filter((p) => p.t > t0);
    const seq = start != null ? [{ t: t0, score: start }, ...inRange] : inRange;
    if (!seq.length) return { s, d: "", end: null as number | null, begin: null as { x: number; y: number } | null };
    // quem começou a ser acompanhado dentro do período (ex.: jogador novo) ganha um ponto no início
    // da linha; sem ele, uma linha que começou há pouco vira só um risquinho no canto direito
    const bx = (x(s.pts[0].t) / W) * 100;
    const begin = bx > 3 ? { x: bx, y: (y(s.pts[0].score) / H) * 100 } : null;
    let d = `M${x(seq[0].t).toFixed(1)},${y(seq[0].score).toFixed(1)}`;
    for (let i = 1; i < seq.length; i++) d += ` H${x(seq[i].t).toFixed(1)} V${y(seq[i].score).toFixed(1)}`;
    d += ` H${W}`;
    return { s, d, end: seq.at(-1)!.score, begin };
  });

  // rótulos no fim das linhas sem sobreposição: nomes que se encostam viram um bloco centrado na
  // média das suas linhas (em vez de só empurrar para baixo, o que afastava o nome da linha)
  const labels = paths
    .filter((p) => p.end != null)
    .map((p) => ({ slug: p.s.slug, name: p.s.name, color: p.s.color, target: (y(p.end!) / H) * 100, y: 0 }))
    .sort((a, b) => a.target - b.target);
  const gap = 3.5; // % da altura (~15px nos 440px do desktop)
  const place = (g: typeof labels) => {
    const mean = g.reduce((acc, l) => acc + l.target, 0) / g.length;
    return Math.min(Math.max(mean - ((g.length - 1) * gap) / 2, 0), 100 - (g.length - 1) * gap);
  };
  let groups = labels.map((l) => ({ items: [l], top: l.target }));
  for (let merged = true; merged; ) {
    merged = false;
    for (let i = 0; i < groups.length - 1; i++) {
      const a = groups[i];
      const b = groups[i + 1];
      if (a.top + a.items.length * gap > b.top) {
        const items = [...a.items, ...b.items];
        groups = [...groups.slice(0, i), { items, top: place(items) }, ...groups.slice(i + 2)];
        merged = true;
        break;
      }
    }
  }
  for (const g of groups) g.items.forEach((l, k) => (l.y = g.top + k * gap));

  const onMove = (e: React.PointerEvent) => {
    const rect = box.current!.getBoundingClientRect();
    const f = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    setHoverT(t0 + f * (t1 - t0));
  };
  const at = hoverT != null ? withData.map((s) => ({ s, v: valueAt(s.pts, hoverT) })).filter((r): r is { s: EloSeries; v: number } => r.v != null).sort((a, b) => b.v - a.v) : [];

  if (!withData.length) return <p className="text-sm text-gray">Ainda não há histórico de elo suficiente.</p>;

  return (
    <div className="clip-step bg-bg-2 p-5 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="label-mono">Evolução de elo · Solo/Duo</p>
          <p className="mt-1 font-mono text-[0.62rem] text-gray-dim">Cada degrau é uma mudança de elo registrada pelo sync</p>
        </div>
        <div role="group" aria-label="Período" className="flex gap-1">
          {RANGES.map((x) => (
            <button
              key={x.k}
              type="button"
              aria-pressed={range === x.k}
              onClick={() => setRange(x.k)}
              className={`min-h-9 px-3 py-1.5 font-mono text-[0.62rem] uppercase md:min-h-0 tracking-[0.14em] transition-colors ${range === x.k ? "bg-green text-bg-0" : "bg-bg-3 text-white hover:bg-[#232831]"}`}
            >
              {x.label}
            </button>
          ))}
        </div>
      </div>

      {/* legenda: passar o mouse destaca; no toque, tocar liga e desliga o destaque */}
      <ul className="mt-4 flex flex-wrap gap-x-4 md:mt-5 md:gap-y-2">
        {series.map((s) => (
          <li key={s.slug}>
            <button
              type="button"
              aria-pressed={focus === s.slug}
              onPointerEnter={(e) => e.pointerType === "mouse" && setFocus(s.slug)}
              onPointerLeave={(e) => e.pointerType === "mouse" && setFocus(null)}
              onClick={(e) => {
                const t = (e.nativeEvent as PointerEvent).pointerType;
                if (t === "touch" || t === "pen") setFocus((f) => (f === s.slug ? null : s.slug));
              }}
              onFocus={(e) => e.currentTarget.matches(":focus-visible") && setFocus(s.slug)}
              onBlur={() => setFocus(null)}
              className={`flex min-h-9 items-center gap-2 font-mono text-[0.68rem] transition-opacity md:min-h-0 ${focus && focus !== s.slug ? "opacity-40" : ""} ${s.pts.length ? "text-white-dim" : "text-gray-dim"}`}
            >
              <span className="h-0 w-4 border-t-2" style={{ borderColor: s.color, borderStyle: s.dashed ? "dashed" : "solid" }} />
              {s.name}
              <span className="text-gray-dim">{s.team}</span>
            </button>
          </li>
        ))}
      </ul>

      {/* à direita: espaço para os nomes no fim das linhas (nomes longos, ex.: "Galo Soviético") */}
      <div className="relative mt-5 pl-[62px] md:pl-[86px] md:pr-[148px]">
        <div ref={box} className="relative" onPointerMove={onMove} onPointerLeave={() => setHoverT(null)}>
          {/* elos do eixo: medidos só pela altura do gráfico (antes incluíam a linha das datas e o último descia para ela) */}
          <div className="pointer-events-none absolute inset-y-0 right-full mr-[6px] w-[56px] md:w-[80px]">
            {ticks.map((v) => (
              <span key={v} className="absolute right-0 -translate-y-1/2 text-right font-mono text-[0.5rem] uppercase leading-tight tracking-wider text-gray-dim md:text-[0.56rem]" style={{ top: `${(y(v) / H) * 100}%` }}>
                {scoreToLabel(v)}
              </span>
            ))}
          </div>
          <svg viewBox={`0 0 ${W} ${H}`} className="h-[260px] w-full overflow-visible md:h-[440px]" preserveAspectRatio="none" role="img" aria-label="Evolução de elo dos jogadores da INGEN">
            {ticks.map((v) => (
              <line key={v} x1="0" x2={W} y1={y(v)} y2={y(v)} stroke="rgb(255 255 255 / .06)" vectorEffect="non-scaling-stroke" />
            ))}
            {paths.map(({ s, d }) =>
              d ? (
                <path
                  key={s.slug}
                  d={d}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={focus === s.slug ? 3 : 2}
                  strokeDasharray={s.dashed ? "6 5" : undefined}
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                  style={{ opacity: focus && focus !== s.slug ? 0.15 : 1, transition: "opacity .2s" }}
                />
              ) : null,
            )}
            {hoverT != null && <line x1={x(hoverT)} x2={x(hoverT)} y1="0" y2={H} stroke="rgb(255 255 255 / .35)" vectorEffect="non-scaling-stroke" />}
          </svg>
          {/* início das linhas que começaram dentro do período */}
          {paths.map(({ s, begin }) =>
            begin ? (
              <span
                key={`ini-${s.slug}`}
                aria-hidden
                className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 bg-bg-2 transition-opacity"
                style={{ left: `${begin.x}%`, top: `${begin.y}%`, borderColor: s.color, opacity: focus && focus !== s.slug ? 0.15 : 1 }}
              />
            ) : null,
          )}
          {/* fios ligando o fim de cada linha ao seu nome (quando os nomes se afastam das linhas) */}
          <svg
            aria-hidden
            viewBox="0 0 12 100"
            preserveAspectRatio="none"
            className="pointer-events-none absolute left-full top-0 hidden h-full w-3 overflow-visible md:block"
          >
            {labels.map((l) => {
              const ly = focus === l.slug ? l.target : l.y;
              return Math.abs(ly - l.target) > 0.3 ? (
                <polyline
                  key={l.slug}
                  points={`0,${l.target} 4,${l.target} 12,${ly}`}
                  fill="none"
                  stroke={l.color}
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                  style={{ opacity: focus && focus !== l.slug ? 0.15 : 0.6 }}
                />
              ) : null;
            })}
          </svg>
          {/* nomes no fim das linhas; o destacado vai exatamente para a altura da sua linha */}
          {labels.map((l) => (
            <span
              key={l.slug}
              className={`pointer-events-none absolute left-full ml-3.5 hidden -translate-y-1/2 whitespace-nowrap md:block font-mono text-[0.6rem] uppercase tracking-wider transition-[opacity,top] duration-200 ${focus && focus !== l.slug ? "opacity-25" : ""} ${focus === l.slug ? "z-10 bg-bg-2 pr-1" : ""}`}
              style={{ top: `${focus === l.slug ? l.target : l.y}%` }}
            >
              <span className="mr-1 inline-block size-1.5 rounded-full align-middle" style={{ background: l.color }} />
              <span className="text-white-dim">{l.name}</span>
            </span>
          ))}
          {hoverT != null && at.length > 0 && (
            <div
              className="pointer-events-none absolute top-2 z-10 min-w-[180px] border border-line bg-bg-0/95 p-3 shadow-xl backdrop-blur"
              style={x(hoverT) / W > 0.6 ? { right: `${(1 - x(hoverT) / W) * 100 + 2}%` } : { left: `${(x(hoverT) / W) * 100 + 2}%` }}
            >
              <p className="mb-2 font-mono text-[0.58rem] uppercase tracking-wider text-gray">{fmt(hoverT)}</p>
              <ul className="space-y-1">
                {at.map(({ s, v }) => (
                  <li key={s.slug} className="flex items-center justify-between gap-4 font-mono text-[0.62rem]">
                    <span className="flex items-center gap-1.5 text-white">
                      <span className="size-1.5 rounded-full" style={{ background: s.color }} />
                      {s.name}
                    </span>
                    <span className="text-white-dim">
                      {scoreToLabel(v)} · {v % 100} PDL
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="mt-2 flex justify-between font-mono text-[0.58rem] uppercase tracking-wider text-gray-dim">
          <span>{fmt(t0)}</span>
          <span>Atualizado {fmt(t1)}</span>
        </div>
      </div>
    </div>
  );
}
