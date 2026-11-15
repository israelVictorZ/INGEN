import { cacheLife } from "next/cache";

import { DRAFT_LANES, type DraftChampion, type DraftChampionData, type DraftLane } from "./lanes";

export { DRAFT_LANES, type DraftChampion, type DraftChampionData, type DraftLane };

/** Posições da estatística (nomes da Riot) → lanes do seletor. */
const POSITION: Record<string, DraftLane> = { TOP: "TOP", JUNGLE: "JUNGLE", MIDDLE: "MID", BOTTOM: "ADC", UTILITY: "SUPPORT" };
/** Uma lane conta se tiver pelo menos esta fatia das partidas do campeão. */
const MIN_SHARE = 0.1;

/**
 * Campeões do draft, sempre do patch mais novo (lista e nomes do Data Dragon) com as lanes em que
 * cada um é jogado hoje (estatística por posição da Meraki Analytics, atualizada a cada patch).
 * Campeão novo, que ainda não tem estatística, aparece em todas as lanes com o selo "Novo".
 * Fica guardado por 1 h: um campeão lançado hoje aparece em até uma hora.
 */
export async function getDraftChampions(): Promise<DraftChampionData> {
  "use cache";
  cacheLife("hours");

  const versions = (await fetch("https://ddragon.leagueoflegends.com/api/versions.json").then((r) => r.json())) as string[];
  const version = versions[0];
  const [champJson, rates] = await Promise.all([
    fetch(`https://ddragon.leagueoflegends.com/cdn/${version}/data/pt_BR/champion.json`).then((r) => r.json()) as Promise<{
      data: Record<string, { id: string; key: string; name: string; tags: string[] }>;
    }>,
    fetch("https://cdn.merakianalytics.com/riot/lol/resources/latest/en-US/championrates.json")
      .then((r) => (r.ok ? r.json() : { data: {} }))
      .catch(() => ({ data: {} })) as Promise<{ data: Record<string, Record<string, { playRate: number }>> }>,
  ]);

  const champions = Object.values(champJson.data).map((c): DraftChampion => {
    const byPos = rates.data[c.key];
    const entries = byPos
      ? Object.entries(byPos)
          .filter(([pos]) => POSITION[pos])
          .map(([pos, v]) => [POSITION[pos], v.playRate ?? 0] as const)
      : [];
    const total = entries.reduce((a, [, v]) => a + v, 0);
    if (!total) return { id: c.id, name: c.name, lanes: [...DRAFT_LANES], isNew: true };
    const lanes = entries
      .filter(([, v]) => v / total >= MIN_SHARE)
      .sort((a, b) => b[1] - a[1])
      .map(([l]) => l);
    return { id: c.id, name: c.name, lanes, isNew: false };
  });
  champions.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  return { version, champions };
}
