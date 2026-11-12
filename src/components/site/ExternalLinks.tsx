"use client";

import { useEffect } from "react";
import { EXTERNAL_LINK } from "@/lib/links";

/**
 * Rede de segurança da regra "link externo abre em nova aba": no clique, um <a> que leva a outro
 * domínio e não definiu `target` ganha target="_blank" + rel="noopener noreferrer" antes da navegação.
 * Cobre links esquecidos e os gerados por markdown/conteúdo. O certo continua sendo pôr os atributos no JSX.
 */
export function ExternalLinks() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target || a.hasAttribute("download")) return;
      if (!/^https?:$/.test(a.protocol) || a.origin === window.location.origin) return;
      a.target = EXTERNAL_LINK.target;
      a.rel = EXTERNAL_LINK.rel;
    };
    // captura: roda antes de qualquer onClick e antes da navegação padrão do navegador
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);
  return null;
}
