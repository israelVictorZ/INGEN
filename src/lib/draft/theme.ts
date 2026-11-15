import type { TeamConfig } from "./engine";

/** Cores dos lados do mapa (fixas, iguais para todo mundo). */
export const SIDE_COLOR = { blue: "#3d8bff", red: "#ff4d5e" } as const;

export const INGEN_LOGO = "/brand/ingen-logo.webp";

export type DraftTheme = {
  /** cor de destaque (botões, filtros, cronômetro) */
  accent: string;
  /** texto sobre o destaque */
  onAccent: string;
  bg: string;
  panel: string;
  line: string;
  /** escudo usado na marca d'água do fundo */
  logo: string | null;
  logoTone: "light" | "dark";
};

type RGB = [number, number, number];
const toRgb = (hex: string): RGB => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as RGB;
const toHex = (c: RGB) => `#${c.map((x) => Math.round(Math.max(0, Math.min(255, x))).toString(16).padStart(2, "0")).join("")}`;
const mix = (a: string, b: string, t: number) => {
  const x = toRgb(a);
  const y = toRgb(b);
  return toHex([0, 1, 2].map((i) => x[i] + (y[i] - x[i]) * t) as RGB);
};

/** Luminância relativa (WCAG), 0 = preto, 1 = branco. */
export function luminance(hex: string) {
  const [r, g, b] = toRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Destaque legível sobre fundo escuro: cores muito escuras são clareadas. */
function readable(hex: string) {
  let c = hex;
  for (let i = 0; i < 6 && luminance(c) < 0.12; i++) c = mix(c, "#ffffff", 0.22);
  return c;
}

export const INGEN_THEME: DraftTheme = {
  accent: "#3dfd4e",
  onAccent: "#04060a",
  bg: "#04060a",
  panel: "#0a0d13",
  line: "#262b33",
  logo: INGEN_LOGO,
  logoTone: "light",
};

/** Sem cor escolhida: preto com cinza. */
export const NEUTRAL_THEME: DraftTheme = {
  accent: "#b4b8bf",
  onAccent: "#0a0a0b",
  bg: "#050506",
  panel: "#101012",
  line: "#2a2b2f",
  logo: null,
  logoTone: "dark",
};

export const isIngen = (t: TeamConfig) => t.kind !== "guest";

/** Endereço do escudo do time (INGEN usa o da marca; visitante, o enviado; sem escudo = null). */
export function teamLogo(code: string, team: TeamConfig, idx: number): string | null {
  if (isIngen(team)) return INGEN_LOGO;
  return team.logo ? `/api/draft/${code}/logo/${idx}?v=${team.logo.v}` : null;
}

export function teamLogoTone(team: TeamConfig): "light" | "dark" {
  return isIngen(team) ? "light" : (team.logo?.tone ?? "dark");
}

/** Cor de identificação do time (nomes, placar, tela de vitória). */
export function teamColor(team: TeamConfig): string {
  if (isIngen(team)) return team.kind === "jokers" ? "#c9cdd3" : "#3dfd4e";
  return team.color ? readable(team.color) : "#b4b8bf";
}

/** Tema da tela para quem está do lado deste time. */
export function themeFor(code: string, team: TeamConfig | null, idx: number): DraftTheme {
  if (!team) return NEUTRAL_THEME;
  if (isIngen(team)) return INGEN_THEME;
  const logo = teamLogo(code, team, idx);
  const tone = teamLogoTone(team);
  if (!team.color) return { ...NEUTRAL_THEME, logo, logoTone: tone };
  const accent = readable(team.color);
  return {
    accent,
    onAccent: luminance(accent) > 0.4 ? "#0a0a0b" : "#ffffff",
    bg: mix(team.color, "#000000", 0.9),
    panel: mix(team.color, "#000000", 0.8),
    line: mix(team.color, "#000000", 0.6),
    logo,
    logoTone: tone,
  };
}

/** Variáveis CSS do tema (usadas como `var(--d-accent)` etc.). */
export function themeVars(t: DraftTheme): React.CSSProperties {
  return {
    "--d-accent": t.accent,
    "--d-on-accent": t.onAccent,
    "--d-bg": t.bg,
    "--d-panel": t.panel,
    "--d-line": t.line,
  } as React.CSSProperties;
}
