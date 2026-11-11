import { cacheLife } from "next/cache";

export type ChampionInfo = { id: string; name: string };

/** Mapa championId numérico -> { id (ex.: "MonkeyKing"), name (pt-BR) } */
export async function getChampionMap(version: string): Promise<Record<number, ChampionInfo>> {
  "use cache";
  cacheLife("days");
  const res = await fetch(`https://ddragon.leagueoflegends.com/cdn/${version}/data/pt_BR/champion.json`);
  const json = (await res.json()) as { data: Record<string, { id: string; key: string; name: string }> };
  const map: Record<number, ChampionInfo> = {};
  for (const c of Object.values(json.data)) map[Number(c.key)] = { id: c.id, name: c.name };
  return map;
}

export * from "./ddragon-urls";
