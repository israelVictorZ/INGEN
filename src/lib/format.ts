import type { Role } from "@/db/schema";

export const ROLE_META: Record<Role, { short: string; label: string; order: number }> = {
  TOP: { short: "TOP", label: "Top", order: 0 },
  JUNGLE: { short: "JG", label: "Jungle", order: 1 },
  MID: { short: "MID", label: "Mid", order: 2 },
  ADC: { short: "ADC", label: "Atirador", order: 3 },
  SUPPORT: { short: "SUP", label: "Suporte", order: 4 },
};

/** teamPosition da Riot -> nossa Role */
export const POSITION_TO_ROLE: Record<string, Role> = {
  TOP: "TOP",
  JUNGLE: "JUNGLE",
  MIDDLE: "MID",
  BOTTOM: "ADC",
  UTILITY: "SUPPORT",
};

const TIERS = ["IRON", "BRONZE", "SILVER", "GOLD", "PLATINUM", "EMERALD", "DIAMOND", "MASTER", "GRANDMASTER", "CHALLENGER"] as const;
const DIVISIONS = ["IV", "III", "II", "I"];

export const TIER_META: Record<string, { label: string; color: string }> = {
  IRON: { label: "Ferro", color: "#8b7d77" },
  BRONZE: { label: "Bronze", color: "#b97452" },
  SILVER: { label: "Prata", color: "#a7b4c0" },
  GOLD: { label: "Ouro", color: "#e4b55a" },
  PLATINUM: { label: "Platina", color: "#4fd1c5" },
  EMERALD: { label: "Esmeralda", color: "#2fd67b" },
  DIAMOND: { label: "Diamante", color: "#7aa7ff" },
  MASTER: { label: "Mestre", color: "#c66bff" },
  GRANDMASTER: { label: "Grão-Mestre", color: "#ff5f6d" },
  CHALLENGER: { label: "Desafiante", color: "#ffd86b" },
};

export function rankScore(tier: string, division: string, lp: number) {
  const t = TIERS.indexOf(tier as (typeof TIERS)[number]);
  if (t < 0) return 0;
  if (t >= 7) return 7 * 400 + lp; // Mestre+ só usa PDL
  return t * 400 + DIVISIONS.indexOf(division) * 100 + lp;
}

export function rankLabel(tier: string, division: string) {
  const t = TIER_META[tier]?.label ?? tier;
  return ["MASTER", "GRANDMASTER", "CHALLENGER"].includes(tier) ? t : `${t} ${division}`;
}

/** Converte um score médio de volta em elo legível (para "elo médio do time"). */
export function scoreToLabel(score: number) {
  const t = Math.min(Math.floor(score / 400), 7);
  if (t >= 7) return `${TIER_META[TIERS[7]].label}+`;
  const d = Math.min(Math.floor((score - t * 400) / 100), 3);
  return `${TIER_META[TIERS[t]].label} ${DIVISIONS[d]}`;
}
export function scoreToTier(score: number) {
  return TIERS[Math.min(Math.floor(score / 400), 7)];
}

export const emblemUrl = (tier: string) =>
  `https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-emblem/emblem-${tier.toLowerCase()}.png`;

export const riotId = (p: { gameName: string; tagLine: string }) => `${p.gameName}#${p.tagLine}`;

export const opggUrl = (p: { gameName: string; tagLine: string }) =>
  `https://op.gg/lol/summoners/br/${encodeURIComponent(`${p.gameName}-${p.tagLine}`)}`;

export const opggMultiUrl = (ps: { gameName: string; tagLine: string }[]) =>
  `https://op.gg/lol/multisearch/br?summoners=${encodeURIComponent(ps.map(riotId).join(","))}`;

/**
 * Winrate "com confiança": puxa amostras pequenas para 50% (média bayesiana com 5 jogos fictícios).
 * 2 jogos 100% → 64%; 32 jogos 56% → 55%; 10 jogos 80% → 70%. Serve para ORDENAR, não para exibir.
 */
export const confidentWr = (wins: number, games: number, prior = 0.5, weight = 5) => (wins + prior * weight) / (games + weight);

/** Rótulo de confiança de uma amostra de partidas. */
export const sampleLabel = (games: number) => (games >= 8 ? "alta" : games >= 3 ? "média" : "baixa");

export const pct = (n: number | null | undefined, digits = 0) =>
  n == null || Number.isNaN(n) ? "—" : `${(n * 100).toFixed(digits)}%`;

export const fixed = (n: number | null | undefined, digits = 1) =>
  n == null || Number.isNaN(n) || !Number.isFinite(n) ? "—" : n.toFixed(digits);

export function timeAgo(ts: number | Date) {
  const diff = Date.now() - (typeof ts === "number" ? ts : ts.getTime());
  const m = Math.round(diff / 60000);
  if (m < 60) return `há ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? "ontem" : `há ${d} dias`;
}

export const dateBR = (d: Date) =>
  new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(d);

export const NEWS_CATEGORY_LABEL: Record<string, string> = {
  elenco: "Elenco",
  campeonato: "Campeonato",
  recrutamento: "Recrutamento",
  comunicado: "Comunicado",
  resultado: "Resultado",
};
