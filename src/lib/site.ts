import { LINKS } from "./features";

/**
 * Endereço público do site (canônicos, sitemap, Open Graph, JSON-LD).
 * Ordem: NEXT_PUBLIC_SITE_URL → domínio de produção que a Vercel informa → localhost.
 * Ao ligar um domínio próprio na Vercel, VERCEL_PROJECT_PRODUCTION_URL passa a apontar para ele sozinho.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000")
).replace(/\/+$/, "");

export const SITE_NAME = "INGEN";
export const SITE_DESCRIPTION =
  "INGEN é uma organização brasileira de League of Legends. Conheça a INGEN Black e a INGEN Silver: elenco, elo, campeões, estatísticas de cada jogador, ranking interno e scouting.";

export const abs = (path = "/") => `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;

/** Organização (JSON-LD) reaproveitada como "memberOf"/"parentOrganization". */
export const ORG_LD = {
  "@type": "SportsOrganization",
  "@id": `${SITE_URL}/#org`,
  name: "INGEN",
  url: SITE_URL,
  logo: abs("/brand/ingen-logo.png"),
  sport: "League of Legends",
  sameAs: [LINKS.twitch, LINKS.discord],
} as const;

/**
 * Open Graph de uma página. Quando a página define `openGraph`, o Next substitui (não mescla) o do layout,
 * então a imagem padrão (app/opengraph-image.tsx) precisa ir junto.
 */
export const ogFor = (path: string, extra: Record<string, unknown> = {}) => ({
  url: path,
  siteName: SITE_NAME,
  locale: "pt_BR",
  type: "website" as const,
  images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "INGEN, time brasileiro de League of Legends" }],
  ...extra,
});
