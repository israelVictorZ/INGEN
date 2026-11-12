import Image from "next/image";
import type { Player } from "@/lib/data";
import { LaneIcon } from "@/components/brand/LaneIcon";
import { ROLE_META, TIER_META, opggUrl, pct, rankLabel } from "@/lib/format";
import { championIcon } from "@/lib/ddragon-urls";

/**
 * Reservas do time: bloco discreto abaixo dos titulares (sem splash, sem tilt, tons apagados).
 * Reserva não tem página própria, então o card leva ao op.gg.
 * Sem reservas, o componente não renderiza nada (nem título nem espaçamento).
 */
export function ReserveList({ reserves, version }: { reserves: Player[]; version: string }) {
  if (!reserves.length) return null;
  return (
    <div data-reveal="up" className="mt-10 border-t border-line pt-6 md:mt-12">
      <p className="label-mono flex items-center gap-3 text-[0.62rem]">
        Reservas <span className="font-pixel text-xs text-white/25">{String(reserves.length).padStart(2, "0")}</span>
      </p>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {reserves.map((r) => (
          <li key={r.slug}>
            <ReserveCard r={r} version={version} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function ReserveCard({ r, version }: { r: Player; version: string }) {
  const color = r.solo ? TIER_META[r.solo.tier]?.color : undefined;
  const champs = r.champions.slice(0, 3);
  return (
    <a
      href={opggUrl(r)}
      target="_blank"
      rel="noopener noreferrer"
      title={`Ver ${r.gameName}#${r.tagLine} no op.gg`}
      className="group block border border-line bg-bg-1 transition-colors hover:border-white/15 hover:bg-bg-2"
    >
      <div className="flex items-center gap-3 px-4 pb-3 pt-3.5">
        <span className="flex w-9 shrink-0 flex-col items-center gap-1">
          <LaneIcon role={r.role} className="size-5 opacity-60 transition-opacity group-hover:opacity-100" />
          <span className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-gray-dim">{ROLE_META[r.role].short}</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-xl font-extrabold uppercase leading-none text-white-dim transition-colors group-hover:text-white">
            {r.displayName}
          </span>
          <span className="mt-1 block truncate font-mono text-[0.62rem] text-gray-dim">
            {r.gameName}#{r.tagLine}
          </span>
        </span>
        {champs.length > 0 && (
          <span className="flex shrink-0 -space-x-1.5" aria-label={`Mais jogados: ${champs.map((c) => c.name).join(", ")}`}>
            {champs.map((c) => (
              <Image
                key={c.key}
                src={championIcon(version, c.key)}
                alt=""
                title={c.name}
                width={24}
                height={24}
                className="size-6 rounded-full opacity-70 ring-2 ring-bg-1 grayscale-[0.3] transition group-hover:opacity-100 group-hover:grayscale-0 group-hover:ring-bg-2"
              />
            ))}
          </span>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-line px-4 py-2 font-mono text-[0.6rem] uppercase tracking-wider">
        <span className="flex min-w-0 items-center gap-2" style={{ color }}>
          <span className="size-1.5 shrink-0 rotate-45 bg-current opacity-80" />
          <span className="truncate">{r.solo ? `${rankLabel(r.solo.tier, r.solo.division)} · ${r.solo.lp} PDL` : "Sem ranqueada"}</span>
        </span>
        <span className="flex shrink-0 items-center gap-2 text-gray-dim">
          {r.solo && <span className={r.solo.winrate >= 0.5 ? "text-green/80" : undefined}>{pct(r.solo.winrate)}</span>}
          <span aria-hidden className="transition-colors group-hover:text-white">op.gg ↗</span>
        </span>
      </div>
    </a>
  );
}
