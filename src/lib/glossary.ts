/**
 * Glossário das métricas (#35): o texto da dica (i) ao lado de cada sigla.
 * `termFor(label)` acha o termo pelo rótulo exibido, então o mesmo glossário serve
 * para "CS / min", "CS/min" e "CS por minuto" sem precisar de chave em cada lugar.
 */
export const GLOSSARY = {
  kda: "KDA = (abates + assistências) ÷ mortes. Quanto o jogador contribui para cada morte que sofre. Acima de 3 já é bom.",
  winrate: "Winrate: porcentagem de partidas vencidas.",
  kp: "Participação em abates (KP): em quantos % dos abates do time o jogador matou ou deu assistência.",
  csAt10: "CS aos 10 min: tropas e monstros abatidos até os 10 minutos. Mostra como foi a fase de rotas.",
  csPerMin: "CS por minuto: tropas e monstros abatidos (o farm) por minuto de jogo. É a principal fonte de ouro. Suporte naturalmente tem pouco.",
  vision: "Placar de visão por minuto: soma das sentinelas colocadas, das inimigas destruídas e do tempo de visão gerado. Mede o controle do mapa.",
  damagePerMin: "Dano causado a campeões inimigos por minuto de jogo.",
  damageShare: "Fatia do dano do time: dos danos a campeões que o time causou, quantos % vieram deste jogador.",
  soloKills: "Abates solo: abates sem ajuda de ninguém do time.",
  firstBlood: "First blood: em quantos % das partidas o jogador matou ou ajudou no primeiro abate da partida.",
  damageTaken: "Dano recebido de campeões por partida. Não é bom nem ruim: tanques e iniciadores recebem mais.",
  goldPerMin: "Ouro ganho por minuto de jogo.",
  plates: "Placas de torre: as proteções das torres externas, que dão ouro extra até os 14 minutos.",
  wardsPlaced: "Sentinelas (wards) colocadas por partida, para dar visão do mapa ao time.",
  wardsKilled: "Sentinelas inimigas destruídas por partida, para tirar a visão do adversário.",
  controlWards: "Control wards compradas por partida: a sentinela de loja que revela e desativa as sentinelas inimigas.",
  deaths: "Média de mortes por partida. Quanto menos, melhor.",
  lp: "PDL (pontos de liga): sobe ao vencer e cai ao perder uma ranqueada. Com 100 PDL o jogador sobe de divisão.",
  elo: "Elo: o nível do jogador na ranqueada Solo/Duo, de Ferro a Desafiante.",
  mastery: "Maestria: pontos acumulados jogando com o campeão, em todas as filas.",
} as const;

export type Term = keyof typeof GLOSSARY;

/** Ordem importa: o primeiro padrão que bater vence ("CS aos 10" antes de "CS / min"). */
const MATCHERS: [RegExp, Term][] = [
  [/^kda$/i, "kda"],
  [/part\.? (em )?abates|^kp$/i, "kp"],
  [/cs aos 10|cs@10/i, "csAt10"],
  [/^cs ?(\/|por) ?min/i, "csPerMin"],
  [/vis[aã]o ?(\/|por) ?min|placar de vis/i, "vision"],
  [/^dano ?(\/|por) ?min/i, "damagePerMin"],
  [/dano no time|% do dano|^% dano/i, "damageShare"],
  [/abates solo/i, "soloKills"],
  [/first blood/i, "firstBlood"],
  [/dano recebido/i, "damageTaken"],
  [/^ouro ?(\/|por) ?min/i, "goldPerMin"],
  [/placas/i, "plates"],
  [/wards colocadas/i, "wardsPlaced"],
  [/wards destru/i, "wardsKilled"],
  [/control wards/i, "controlWards"],
  [/^mortes/i, "deaths"],
  [/^winrate/i, "winrate"],
  [/^elo\b/i, "elo"],
  [/^pdl\b/i, "lp"],
  [/maestria/i, "mastery"],
];

export function termFor(label: string): Term | null {
  return MATCHERS.find(([re]) => re.test(label.trim()))?.[1] ?? null;
}
