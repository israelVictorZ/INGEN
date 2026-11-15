/**
 * Nomes e endereços públicos dos times: o ÚNICO lugar do site que define como cada time aparece.
 *
 * Por dentro, os times continuam com os ids `black` e `silver` (slug no banco, `--team` do
 * `npm run manage`, tema dos overlays `?time=` e classes CSS como `team-silver`). Aqui só muda o
 * que o público vê: nome, nome curto e endereço (`/scouting/<slug>` e `/elenco#<slug>`).
 *
 * Para voltar aos nomes antigos, reverta o commit que criou este mapa ou troque os valores abaixo
 * por `{ slug: "black", name: "INGEN Black", shortName: "Black" }` e
 * `{ slug: "silver", name: "INGEN Silver", shortName: "Silver" }`. Os redirecionamentos dos
 * endereços antigos (next.config.ts) e as âncoras antigas do elenco somem sozinhos quando o slug
 * público volta a ser igual ao id interno.
 *
 * O kit de stream (public/stream/core/ingen.js) tem uma cópia deste mapa, porque roda fora do Next.
 */
export const TEAM_DISPLAY = {
  black: { slug: "aces", name: "INGEN Aces", shortName: "Aces" },
  silver: { slug: "jokers", name: "INGEN Jokers", shortName: "Jokers" },
} as const satisfies Record<string, { slug: string; name: string; shortName: string }>;

export type TeamId = keyof typeof TEAM_DISPLAY;

/** Nome, nome curto e slug público do time com o id interno `id` (black | silver). */
export function teamDisplay(id: string, fallback: { name: string; shortName: string }) {
  const d = (TEAM_DISPLAY as Record<string, { slug: string; name: string; shortName: string }>)[id];
  return d ?? { slug: id, ...fallback };
}

/** Endereços antigos → novos (ex.: black → aces), só para os times cujo slug público mudou. */
export const TEAM_SLUG_REDIRECTS: Record<string, string> = Object.fromEntries(
  Object.entries(TEAM_DISPLAY)
    .filter(([id, d]) => id !== d.slug)
    .map(([id, d]) => [id, d.slug]),
);

/** Id interno (black | silver) a partir do id, do slug público ou do nome curto, sem diferenciar maiúsculas. */
export function teamIdFrom(value: string): TeamId | null {
  const v = value.trim().toLowerCase();
  for (const [id, d] of Object.entries(TEAM_DISPLAY)) {
    if (v === id || v === d.slug || v === d.shortName.toLowerCase() || v === d.name.toLowerCase()) return id as TeamId;
  }
  return null;
}
