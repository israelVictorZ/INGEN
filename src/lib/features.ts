/**
 * Liga/desliga funcionalidades do site sem apagar código.
 * news: notícias ocultas por enquanto (menu, home e rotas /noticias retornam 404).
 */
export const FEATURES = {
  news: false,
} as const;

/** Para onde as vagas abertas apontam. Sem notícias, as vagas não têm link. */
export const RECRUIT_HREF: string | null = FEATURES.news ? "/noticias/recrutamento-top-e-mid" : null;
