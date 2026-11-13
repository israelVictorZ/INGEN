import type { Role } from "@/db/schema";

/**
 * Referências por lane para Solo/Duo: [média, alto]. O que é "bom" muda muito de uma lane para outra
 * (suporte quase não farma; atirador quase não coloca ward), então nenhuma métrica usa um teto único.
 * Usadas no scouting (pontos fortes) e no radar do Comparar (#5). Valores aproximados para o elo do time
 * (Ouro a Diamante); ajuste aqui e tudo acompanha.
 */
type Ref = Record<Role, readonly [number, number]>;

export const LANE_REF = {
  kda: { TOP: [2.5, 4], JUNGLE: [2.8, 4.5], MID: [2.7, 4.5], ADC: [2.7, 4.5], SUPPORT: [3, 5] },
  cs: { TOP: [6.5, 7.8], JUNGLE: [5, 6.3], MID: [6.8, 8], ADC: [7, 8.3], SUPPORT: [1, 1.8] },
  damagePerMin: { TOP: [600, 850], JUNGLE: [480, 700], MID: [700, 950], ADC: [700, 1000], SUPPORT: [300, 500] },
  dmgShare: { TOP: [0.2, 0.27], JUNGLE: [0.14, 0.2], MID: [0.22, 0.3], ADC: [0.24, 0.32], SUPPORT: [0.08, 0.14] },
  kp: { TOP: [0.42, 0.55], JUNGLE: [0.55, 0.68], MID: [0.5, 0.63], ADC: [0.5, 0.63], SUPPORT: [0.55, 0.7] },
  vision: { TOP: [0.6, 1], JUNGLE: [0.9, 1.3], MID: [0.6, 1], ADC: [0.5, 0.9], SUPPORT: [1.8, 2.6] },
  goldPerMin: { TOP: [380, 450], JUNGLE: [360, 420], MID: [390, 460], ADC: [400, 480], SUPPORT: [270, 340] },
  winrate: { TOP: [0.5, 0.6], JUNGLE: [0.5, 0.6], MID: [0.5, 0.6], ADC: [0.5, 0.6], SUPPORT: [0.5, 0.6] },
} as const satisfies Record<string, Ref>;

export type LaneRefKey = keyof typeof LANE_REF;
