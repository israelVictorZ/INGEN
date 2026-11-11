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

/** Feitiços de invocador: id -> chave da imagem (ex.: 4 -> "SummonerFlash") */
export async function getSpellMap(version: string): Promise<Record<number, string>> {
  "use cache";
  cacheLife("days");
  const res = await fetch(`https://ddragon.leagueoflegends.com/cdn/${version}/data/pt_BR/summoner.json`);
  const json = (await res.json()) as { data: Record<string, { id: string; key: string }> };
  const map: Record<number, string> = {};
  for (const sp of Object.values(json.data)) map[Number(sp.key)] = sp.id;
  return map;
}

/** Runas (keystones e árvores): id -> caminho do ícone */
export async function getRuneMap(version: string): Promise<Record<number, string>> {
  "use cache";
  cacheLife("days");
  const res = await fetch(`https://ddragon.leagueoflegends.com/cdn/${version}/data/pt_BR/runesReforged.json`);
  const trees = (await res.json()) as { id: number; icon: string; slots: { runes: { id: number; icon: string }[] }[] }[];
  const map: Record<number, string> = {};
  for (const t of trees) {
    map[t.id] = t.icon;
    for (const slot of t.slots) for (const r of slot.runes) map[r.id] = r.icon;
  }
  return map;
}

/** Runas: id -> nome em português (para legendas e tooltips) */
export async function getRuneNames(version: string): Promise<Record<number, string>> {
  "use cache";
  cacheLife("days");
  const res = await fetch(`https://ddragon.leagueoflegends.com/cdn/${version}/data/pt_BR/runesReforged.json`);
  const trees = (await res.json()) as { id: number; name: string; slots: { runes: { id: number; name: string }[] }[] }[];
  const map: Record<number, string> = {};
  for (const t of trees) {
    map[t.id] = t.name;
    for (const slot of t.slots) for (const r of slot.runes) map[r.id] = r.name;
  }
  return map;
}

export * from "./ddragon-urls";
