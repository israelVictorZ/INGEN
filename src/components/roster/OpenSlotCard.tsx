import type { Role } from "@/db/schema";
import { LaneIcon } from "@/components/brand/LaneIcon";
import { DiscordIcon } from "@/components/brand/SocialIcons";
import { ROLE_META } from "@/lib/format";
import { RECRUIT_HREF } from "@/lib/features";

/** Vaga aberta: em vez de um buraco no elenco, um convite para o Discord do time. */
export function OpenSlotCard({ role, teamName }: { role: Role; teamName: string }) {
  return (
    <a
      href={RECRUIT_HREF}
      target="_blank"
      rel="noopener noreferrer"
      className="border-run clip-step group relative flex aspect-[3/4.2] flex-col items-center justify-center overflow-hidden border border-dashed border-green/30 bg-bg-1 p-6 text-center"
    >
      <div className="absolute inset-0 bg-dots opacity-60" />
      <div className="relative mb-6">
        <span className="absolute inset-0 animate-[pulse-ring_2s_ease-out_infinite] rounded-full border border-green/50" />
        <span className="absolute inset-0 animate-[pulse-ring_2s_ease-out_1s_infinite] rounded-full border border-green/30" />
        <div className="relative flex size-20 items-center justify-center rounded-full bg-bg-3">
          <LaneIcon role={role} className="size-10" />
        </div>
      </div>
      <span className="label-mono relative text-green">Vaga aberta</span>
      <h3 className="relative mt-2 font-display text-4xl font-black uppercase leading-none text-white">{ROLE_META[role].label}</h3>
      <p className="relative mt-3 max-w-[16ch] text-sm text-gray">Quer jogar de {ROLE_META[role].short} na {teamName}?</p>
      <span className="clip-step-sm relative mt-6 inline-flex items-center gap-2 bg-[#5865f2] px-4 py-2.5 font-mono text-[0.66rem] uppercase tracking-[0.16em] text-white transition-colors group-hover:bg-white group-hover:text-[#3a43c4]">
        <DiscordIcon className="size-3.5" /> Chamar no Discord
      </span>
    </a>
  );
}
