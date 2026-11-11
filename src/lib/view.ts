import type { Player, Team } from "./data";
import type { PlayerCardData } from "@/components/roster/PlayerCard";
import type { RiftSlot } from "@/components/roster/RiftMap";
import { riotId } from "./format";
import { championIcon, profileIcon } from "./ddragon-urls";

/** Campeões da lane do jogador; se ainda não houver partidas na lane, usa o pool geral. */
export const mainChamps = (p: Player) => (p.laneChampions.length ? p.laneChampions : p.champions);

export function toCard(p: Player): PlayerCardData {
  return {
    slug: p.slug,
    displayName: p.displayName,
    riotId: riotId(p),
    role: p.role,
    accent: p.team.accent,
    tier: p.solo?.tier ?? null,
    division: p.solo?.division ?? null,
    lp: p.solo?.lp ?? null,
    winrate: p.solo?.winrate ?? null,
    splash: mainChamps(p).slice(0, 3).map((c) => ({ key: c.key, name: c.name })),
  };
}

export function toRiftSlots(team: Team, version: string): RiftSlot[] {
  return team.slots.map((s) =>
    s.kind === "open"
      ? { kind: "open", role: s.role }
      : {
          kind: "player",
          role: s.role,
          slug: s.player.slug,
          name: s.player.displayName,
          tier: s.player.solo?.tier ?? null,
          division: s.player.solo?.division ?? null,
          lp: s.player.solo?.lp ?? null,
          icon: mainChamps(s.player)[0]
            ? championIcon(version, mainChamps(s.player)[0].key)
            : s.player.profileIconId
              ? profileIcon(version, s.player.profileIconId)
              : null,
        },
  );
}
