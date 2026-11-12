import type { Metadata } from "next";

/**
 * Área interna dos jogadores (kit de stream e guia).
 * Fica fora do Google: noindex aqui, X-Robots-Tag em /stream/* (next.config.ts), sem link no site e fora do sitemap.
 * Quando entrar o ADM simplificado, o bloqueio por senha entra neste layout e vale para as duas páginas.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

export default function StreamLayout({ children }: { children: React.ReactNode }) {
  return children;
}
