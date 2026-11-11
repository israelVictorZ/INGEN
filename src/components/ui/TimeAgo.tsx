"use client";

import { useSyncExternalStore } from "react";
import { timeAgo } from "@/lib/format";

const noop = () => () => {};

/**
 * Tempo relativo ("há 2 h") calculado só no navegador.
 * No prerender mostra a data fixa, pois o servidor não pode depender do relógio.
 */
export function TimeAgo({ ts }: { ts: number }) {
  const isClient = useSyncExternalStore(noop, () => true, () => false);
  if (!isClient) {
    return <span>{new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", timeZone: "America/Sao_Paulo" }).format(ts)}</span>;
  }
  return <span>{timeAgo(ts)}</span>;
}
