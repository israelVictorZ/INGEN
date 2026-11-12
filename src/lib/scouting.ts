import type { ChampStat, Player, Team } from "./data";
import { ROLE_META, confidentWr, fixed, pct } from "./format";
import { mainChamps } from "./view";

export type Read = { text: string; detail?: string };

export type ScoutRead = {
  strengths: Read[];
  weaknesses: Read[];
  /** campeão que mais vale banir: forte e com bastante jogo */
  ban: (ChampStat & { reason: string }) | null;
  /** confrontos de lane com pior resultado (2+ partidas) */
  tough: { key: string; name: string; games: number; wins: number }[];
};

/** Referências por lane: o que é "alto" ou "baixo" muda muito entre suporte e atirador. */
const REF = {
  cs: { TOP: [6.5, 7.8], JUNGLE: [5, 6.3], MID: [6.8, 8], ADC: [7, 8.3], SUPPORT: [0, 99] },
  vision: { TOP: [0.6, 1], JUNGLE: [0.9, 1.3], MID: [0.6, 1], ADC: [0.5, 0.9], SUPPORT: [1.8, 2.6] },
  dmgShare: { TOP: [0.2, 0.27], JUNGLE: [0.14, 0.2], MID: [0.22, 0.3], ADC: [0.24, 0.32], SUPPORT: [0, 0.14] },
} as const;

const split = (s: { games: number; wins: number }) => (s.games ? s.wins / s.games : 0);

/**
 * Leitura automática de um jogador para o relatório de scouting.
 * Regras simples e explicáveis; amostras pequenas (<5 jogos) não viram conclusão.
 */
export function scoutRead(p: Player): ScoutRead {
  const s = p.stats;
  const ins = p.insights;
  const strengths: Read[] = [];
  const weaknesses: Read[] = [];
  const role = p.role;
  const champs = mainChamps(p).filter((c) => c.games > 0);

  // Campeão para banir: o mais forte "com confiança" e com volume de jogo
  const banPool = champs.filter((c) => c.games >= 4).sort((a, b) => confidentWr(b.wins, b.games) * Math.log2(b.games + 1) - confidentWr(a.wins, a.games) * Math.log2(a.games + 1));
  const top = banPool[0];
  const ban = top ? { ...top, reason: `${top.games} partidas · ${pct(top.wins / top.games)} de vitórias` } : null;

  if (top && top.games >= 5 && top.wins / top.games >= 0.55) strengths.push({ text: `Muito forte de ${top.name}`, detail: `${pct(top.wins / top.games)} em ${top.games} jogos` });

  if (s) {
    if (s.kda >= 3.5) strengths.push({ text: "Joga com segurança", detail: `KDA ${fixed(s.kda, 2)}` });
    if (s.deaths >= 6.5) weaknesses.push({ text: "Morre bastante", detail: `${fixed(s.deaths)} mortes por partida` });
    if (s.kp >= 0.6) strengths.push({ text: "Sempre presente nas lutas", detail: `${pct(s.kp)} de participação em abates` });
    else if (s.kp > 0 && s.kp < 0.42 && role !== "TOP") weaknesses.push({ text: "Pouco presente nas lutas do time", detail: `${pct(s.kp)} de participação` });

    const [csLow, csHigh] = REF.cs[role];
    if (role !== "SUPPORT") {
      if (s.csPerMin >= csHigh) strengths.push({ text: "Farm acima da média", detail: `${fixed(s.csPerMin)} CS/min` });
      else if (s.csPerMin < csLow) weaknesses.push({ text: "Farm baixo para a lane", detail: `${fixed(s.csPerMin)} CS/min` });
    }
    const [vLow, vHigh] = REF.vision[role];
    if (s.visionPerMin >= vHigh) strengths.push({ text: "Boa visão de mapa", detail: `${fixed(s.visionPerMin, 2)} visão/min` });
    else if (s.visionPerMin < vLow) weaknesses.push({ text: "Pouca visão de mapa", detail: `${fixed(s.visionPerMin, 2)} visão/min` });

    const [dLow, dHigh] = REF.dmgShare[role];
    if (role !== "SUPPORT" && s.damageShare >= dHigh) strengths.push({ text: "Carrega o dano do time", detail: `${pct(s.damageShare)} do dano` });
    else if (role !== "SUPPORT" && s.damageShare > 0 && s.damageShare < dLow) weaknesses.push({ text: "Pouco dano para a lane", detail: `${pct(s.damageShare)} do dano do time` });

    if ((role === "TOP" || role === "MID") && (s.soloKills ?? 0) >= 1.2) strengths.push({ text: "Perigoso no 1x1", detail: `${fixed(s.soloKills)} abates solo por partida` });
    if ((role === "JUNGLE" || role === "SUPPORT") && (s.firstBloodRate ?? 0) >= 0.3) strengths.push({ text: "Agressivo no início", detail: `first blood em ${pct(s.firstBloodRate)} das partidas` });
  }

  if (ins) {
    const { short, long } = ins.duration;
    if (short.games >= 5 && split(short) >= 0.62) strengths.push({ text: "Decide jogos cedo", detail: `${pct(split(short))} em partidas de até 25 min` });
    if (long.games >= 5 && split(long) <= 0.42) weaknesses.push({ text: "Cai em jogos longos", detail: `${pct(split(long))} em partidas de 35+ min` });
    if (long.games >= 5 && split(long) >= 0.62) strengths.push({ text: "Cresce em jogos longos", detail: `${pct(split(long))} em partidas de 35+ min` });
    const { blue, red } = ins.sides;
    if (blue.games >= 5 && red.games >= 5 && Math.abs(split(blue) - split(red)) >= 0.2) {
      const worse = split(blue) < split(red) ? "azul" : "vermelho";
      weaknesses.push({ text: `Rende menos no lado ${worse}`, detail: `${pct(split(blue))} azul × ${pct(split(red))} vermelho` });
    }
    if (ins.oneTrickShare >= 0.45 && top) weaknesses.push({ text: "Pool concentrado", detail: `${pct(ins.oneTrickShare)} das partidas em um campeão` });
    if (ins.trend && ins.trend.recent.winrate - ins.trend.previous.winrate >= 0.2) strengths.push({ text: "Em alta", detail: `${pct(ins.trend.recent.winrate)} nas últimas 10` });
    if (ins.trend && ins.trend.previous.winrate - ins.trend.recent.winrate >= 0.2) weaknesses.push({ text: "Fase ruim", detail: `${pct(ins.trend.recent.winrate)} nas últimas 10` });
  }
  if (p.streak >= 3) strengths.push({ text: `${p.streak} vitórias seguidas` });
  if (p.streak <= -3) weaknesses.push({ text: `${-p.streak} derrotas seguidas` });

  const tough = p.matchups
    .filter((m) => m.games >= 2 && m.wins / m.games < 0.5)
    .sort((a, b) => confidentWr(a.wins, a.games) - confidentWr(b.wins, b.games))
    .slice(0, 3);
  if (tough[0]) weaknesses.push({ text: `Sofre contra ${tough[0].name}`, detail: `${tough[0].wins}V ${tough[0].games - tough[0].wins}D no confronto direto` });

  return { strengths: strengths.slice(0, 4), weaknesses: weaknesses.slice(0, 4), ban, tough };
}

/** Pool somado do time e campeões compartilhados (mais de um jogador joga). */
export function teamPool(team: Team) {
  const map = new Map<string, { key: string; name: string; games: number; wins: number; by: { slug: string; name: string; role: Player["role"]; games: number }[] }>();
  for (const p of team.players)
    for (const c of p.champions) {
      if (!c.games) continue;
      const x = map.get(c.key) ?? { key: c.key, name: c.name, games: 0, wins: 0, by: [] };
      x.games += c.games;
      x.wins += c.wins;
      x.by.push({ slug: p.slug, name: p.displayName, role: p.role, games: c.games });
      map.set(c.key, x);
    }
  const all = [...map.values()].map((x) => ({ ...x, by: x.by.sort((a, b) => b.games - a.games) }));
  return {
    top: [...all].sort((a, b) => b.games - a.games).slice(0, 12),
    shared: all.filter((x) => x.by.length >= 2).sort((a, b) => b.by.length - a.by.length || b.games - a.games),
    unique: all.length,
  };
}

/** Resumo do time: lanes mais fortes/vulneráveis e bans sugeridos. */
export function teamSummary(team: Team) {
  const players = team.players.filter((p) => p.solo);
  const byElo = [...players].sort((a, b) => b.solo!.score - a.solo!.score);
  const reads = team.players.map((p) => ({ p, r: scoutRead(p) }));
  const formOf = (p: Player) => p.form.filter(Boolean).length;
  const hot = [...team.players].filter((p) => p.form.length >= 5).sort((a, b) => formOf(b) - formOf(a))[0];
  const cold = [...team.players].filter((p) => p.form.length >= 5).sort((a, b) => formOf(a) - formOf(b))[0];
  const bans = reads
    .filter((x) => x.r.ban)
    .map((x) => ({ player: x.p, champ: x.r.ban!, score: confidentWr(x.r.ban!.wins, x.r.ban!.games) * Math.log2(x.r.ban!.games + 1) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
  const open = team.slots.filter((s) => s.kind === "open").map((s) => ROLE_META[s.role].label);
  return {
    strongest: byElo[0] ?? null,
    weakest: byElo.length > 1 ? byElo.at(-1)! : null,
    hot: hot && formOf(hot) >= 6 ? { p: hot, wins: formOf(hot), of: hot.form.length } : null,
    cold: cold && cold !== hot && formOf(cold) <= 4 ? { p: cold, wins: formOf(cold), of: cold.form.length } : null,
    bans,
    open,
  };
}
