/** Lanes do seletor, na ordem do cliente do LoL (seguro para o navegador). */
export const DRAFT_LANES = ["TOP", "JUNGLE", "MID", "ADC", "SUPPORT"] as const;
export type DraftLane = (typeof DRAFT_LANES)[number];

export type DraftChampion = {
  /** id do Data Dragon (ex.: "MonkeyKing"), usado nas imagens e no estado do draft */
  id: string;
  /** nome em português (ex.: "Wukong") */
  name: string;
  /** lanes em que o campeão é jogado hoje */
  lanes: DraftLane[];
  /** lançado há pouco: ainda sem estatística de lane (aparece em todas as lanes) */
  isNew: boolean;
};

export type DraftChampionData = { version: string; champions: DraftChampion[] };
