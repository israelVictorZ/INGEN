/**
 * Liga/desliga funcionalidades do site sem apagar código.
 * news: notícias ocultas por enquanto (menu, home e rotas /noticias retornam 404).
 */
export const FEATURES = {
  news: false,
} as const;

/** Canais oficiais da INGEN. */
export const TEAM_TWITCH_CHANNEL = "ingen_team";
export const LINKS = {
  discord: "https://discord.gg/aArbDqdrMY",
  twitch: `https://www.twitch.tv/${TEAM_TWITCH_CHANNEL}`,
  instagram: "https://www.instagram.com/ingen.gg/",
  youtube: "https://www.youtube.com/@ingengg",
  x: "https://x.com/ingen_gg",
} as const;

/** Para onde as vagas abertas apontam: o Discord do time. */
export const RECRUIT_HREF: string = LINKS.discord;
