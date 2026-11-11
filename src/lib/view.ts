import type { Player, Team } from "./data";
import type { PlayerCardData } from "@/components/roster/PlayerCard";
import type { RiftSlot } from "@/components/roster/RiftMap";
import { riotId } from "./format";
import { championIcon, profileIcon } from "./ddragon-urls";

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
    splash: p.champions.slice(0, 3).map((c) => ({ key: c.key, name: c.name })),
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
          icon: s.player.champions[0]
            ? championIcon(version, s.player.champions[0].key)
            : s.player.profileIconId
              ? profileIcon(version, s.player.profileIconId)
              : null,
        },
  );
}
