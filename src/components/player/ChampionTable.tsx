"use client";

import Image from "next/image";
import { useState } from "react";
import type { ChampStat } from "@/lib/data";
import { championIcon } from "@/lib/ddragon-urls";
import { fixed, pct } from "@/lib/format";
import { InfoTip } from "@/components/ui/InfoTip";
import { GLOSSARY, type Term } from "@/lib/glossary";

export type ChampionRow = ChampStat & { inLane: boolean };

type SortKey = "name" | "games" | "winrate" | "kda" | "csPerMin" | "masteryPoints";
const COLS: { k: SortKey; label: string; term?: Term }[] = [
  { k: "name", label: "Campeão" },
  { k: "games", label: "Partidas" },
  { k: "winrate", label: "Winrate", term: "winrate" },
  { k: "kda", label: "KDA", term: "kda" },
  { k: "csPerMin", label: "CS/min", term: "csPerMin" },
  { k: "masteryPoints", label: "Maestria", term: "mastery" },
];

const value = (c: ChampionRow, k: SortKey) => (k === "winrate" ? c.wins / c.games : k === "name" ? 0 : c[k]);

/**
 * Tabela completa de campeões (#33): clique no cabeçalho para ordenar (de novo inverte)
 * e filtro "só da lane" para esconder os campeões jogados fora da posição principal.
 */
export function ChampionTable({ rows, version, laneLabel }: { rows: ChampionRow[]; version: string; laneLabel: string }) {
  const [sort, setSort] = useState<{ k: SortKey; desc: boolean }>({ k: "games", desc: true });
  const [laneOnly, setLaneOnly] = useState(false);
  if (!rows.length) return null;

  const outOfLane = rows.filter((c) => !c.inLane).length;
  const list = (laneOnly ? rows.filter((c) => c.inLane) : [...rows]).sort((a, b) => {
    const d = sort.k === "name" ? a.name.localeCompare(b.name, "pt-BR") : value(a, sort.k) - value(b, sort.k);
    // empate: mais partidas primeiro
    return (sort.desc ? -d : d) || b.games - a.games;
  });
  const toggle = (k: SortKey) => setSort((s) => (s.k === k ? { k, desc: !s.desc } : { k, desc: k !== "name" }));

  return (
    <div>
      {outOfLane > 0 && (
        <div className="no-print mb-3 flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar campeões">
          {[
            { on: false, label: `Todos (${rows.length})` },
            { on: true, label: `Só de ${laneLabel} (${rows.length - outOfLane})` },
          ].map((f) => (
            <button
              key={f.label}
              type="button"
              aria-pressed={laneOnly === f.on}
              onClick={() => setLaneOnly(f.on)}
              className={`clip-step-sm px-3.5 py-1.5 font-mono text-[0.65rem] uppercase tracking-[0.14em] transition-colors ${
                laneOnly === f.on ? "bg-green text-bg-0" : "bg-bg-3 text-white hover:bg-white hover:text-bg-0"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}
      <div className="clip-step overflow-x-auto bg-bg-2">
        <table className="w-full min-w-[560px] text-left">
          <thead>
            <tr className="border-b border-line">
              {COLS.map((c) => {
                const active = sort.k === c.k;
                return (
                  <th key={c.k} aria-sort={active ? (sort.desc ? "descending" : "ascending") : "none"} className="px-4 py-3 font-normal">
                    <span className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => toggle(c.k)}
                        className={`label-mono inline-flex items-center gap-1 text-[0.6rem] transition-colors hover:text-white ${active ? "text-green" : ""}`}
                      >
                        {c.label}
                        <span aria-hidden className={active ? "" : "opacity-30"}>
                          {active && !sort.desc ? "▲" : "▼"}
                        </span>
                      </button>
                      {c.term && <InfoTip text={GLOSSARY[c.term]} label={c.label} />}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {list.map((c) => {
              const wr = c.wins / c.games;
              return (
                <tr key={c.championId} className="border-b border-line/60 last:border-0">
                  <td className="px-4 py-2.5">
                    <span className="flex items-center gap-3">
                      <Image src={championIcon(version, c.key)} alt="" width={32} height={32} />
                      <span className="font-display text-lg font-extrabold uppercase text-white">{c.name}</span>
                      {!c.inLane && <span className="font-mono text-[0.58rem] uppercase tracking-wider text-gray-dim">fora da lane</span>}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-sm text-white-dim">{c.games}</td>
                  <td className="px-4 py-2.5">
                    <span className="flex items-center gap-2">
                      <span className="h-1 w-16 bg-bg-3">
                        <span className={`block h-full ${c.games < 3 ? "bg-white/25" : wr >= 0.5 ? "bg-green" : "bg-gray-dim"}`} style={{ width: `${wr * 100}%` }} />
                      </span>
                      <span
                        className={`font-mono text-sm ${c.games < 3 ? "text-gray-dim" : wr >= 0.5 ? "text-green" : "text-gray"}`}
                        title={c.games < 3 ? "Poucos jogos: ainda não diz muito" : undefined}
                      >
                        {pct(wr)}
                        {c.games < 3 && <span className="ml-1 text-[0.55rem]">*</span>}
                      </span>
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
    </div>
  );
}
