/**
 * Regra do site: link para fora (op.gg, Twitch, Discord, Riot…) SEMPRE abre em nova aba.
 * Use `isExternal` para decidir e `EXTERNAL_LINK` nos atributos: <a href={url} {...EXTERNAL_LINK}>.
 * Rede de segurança: <ExternalLinks /> (no layout) aplica o mesmo a qualquer link externo esquecido.
 */
export const isExternal = (href: string) => /^(https?:)?\/\//i.test(href);

export const EXTERNAL_LINK = { target: "_blank", rel: "noopener noreferrer" } as const;
