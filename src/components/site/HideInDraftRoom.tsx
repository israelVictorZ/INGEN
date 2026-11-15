"use client";

import { usePathname } from "next/navigation";

/** Some com o que envolve (cabeçalho, rodapé, pin de live, scroll suave) dentro da sala do draft: a tela é só do draft. */
export function HideInDraftRoom({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return /^\/draft\/[^/]+/.test(pathname) ? null : children;
}
