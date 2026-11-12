"use client";

import { useSyncExternalStore } from "react";
import { timeAgo } from "@/lib/format";

const noop = () => () => {};
/** O sync grava "last_sync" quando algo muda ou, no mínimo, a cada 6 h (modo sonda): passou de 7 h, parou. */
const STALE_MS = 7 * 3600_000;

/**
 * "Dados atualizados há X" no rodapé. Se o sync parar (ex.: key da Riot vencida), mostra um aviso
 * para alguém perceber pelo próprio site.
 */
export function SyncStatus({ ts }: { ts: number }) {
  const now = useSyncExternalStore(
    noop,
    () => Math.floor(Date.now() / 60_000) * 60_000, // estável dentro do mesmo minuto
    () => null,
  );
  if (now == null) return null;
  const stale = now - ts > STALE_MS;
  return (
    <span className={stale ? "text-[#e2a33a]" : undefined} title={new Date(ts).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}>
      {stale ? "⚠ Dados sem atualização " : "Dados atualizados "}
      {timeAgo(ts)}
      {stale && " · a sincronização pode estar parada"}
    </span>
  );
}
