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
      {/* lg–xl: 5 colunas estreitas (~175px), então tudo encolhe e o texto de apoio some para o botão caber */}
      <div className="relative mb-6 lg:max-xl:mb-4">
        <span className="absolute inset-0 animate-[pulse-ring_2s_ease-out_infinite] rounded-full border border-green/50" />
        <span className="absolute inset-0 animate-[pulse-ring_2s_ease-out_1s_infinite] rounded-full border border-green/30" />
        <div className="relative flex size-20 items-center justify-center rounded-full bg-bg-3 lg:max-xl:size-14">
          <LaneIcon role={role} className="size-10 lg:max-xl:size-7" />
        </div>
      </div>
      <span className="label-mono relative text-green">Vaga aberta</span>
      <h3 className="relative mt-2 font-display text-4xl font-black uppercase leading-none text-white lg:max-xl:text-3xl">{ROLE_META[role].label}</h3>
      <p className="relative mt-3 max-w-[16ch] text-sm text-gray lg:max-xl:hidden">Quer jogar de {ROLE_META[role].short} na {teamName}?</p>
      <span className="clip-step-sm relative mt-6 inline-flex items-center gap-2 whitespace-nowrap bg-[#5865f2] px-4 py-2.5 font-mono text-[0.66rem] uppercase tracking-[0.16em] text-white transition-colors group-hover:bg-white group-hover:text-[#3a43c4] lg:max-xl:mt-4 lg:max-xl:px-3">
        <DiscordIcon className="size-3.5" /> Chamar<span className="lg:hidden"> no Discord</span>
      </span>
    </a>
  );
}

/** Vaga aberta no mobile: mesma linha do PlayerRow, com o convite para o Discord à direita. */
export function OpenSlotRow({ role, teamName }: { role: Role; teamName: string }) {
  return (
    <a
      href={RECRUIT_HREF}
      target="_blank"
      rel="noopener noreferrer"
      className="clip-step group relative flex items-stretch overflow-hidden border border-dashed border-green/30 bg-bg-1 active:bg-bg-2"
      aria-label={`Vaga aberta de ${ROLE_META[role].label} na ${teamName}: chamar no Discord`}
    >
      <div className="absolute inset-0 bg-dots opacity-60" />
      <div className="relative flex w-16 shrink-0 flex-col items-center justify-center gap-1.5 border-r border-dashed border-green/20">
        <span className="relative flex size-10 items-center justify-center rounded-full bg-bg-3">
          <span className="absolute inset-0 animate-[pulse-ring_2s_ease-out_infinite] rounded-full border border-green/50" />
          <LaneIcon role={role} className="size-6 opacity-70" />
        </span>
        <span className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-white-dim">{ROLE_META[role].short}</span>
      </div>
      <div className="relative min-w-0 flex-1 py-4 pl-4 pr-3">
        <span className="flex items-center gap-2 font-mono text-[0.58rem] uppercase tracking-[0.2em] text-green">
          <span className="size-1.5 animate-[blink_1.2s_steps(1)_infinite] bg-green" /> Vaga aberta
        </span>
        <h3 className="mt-1 truncate font-display text-[2rem] font-black uppercase leading-none text-white">{ROLE_META[role].label}</h3>
        <p className="mt-1 text-xs text-gray">Recrutando para a {teamName}</p>
      </div>
      <div className="relative flex shrink-0 items-center pr-4">
        <span className="clip-step-sm inline-flex items-center gap-2 bg-[#5865f2] px-3 py-2.5 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-white">
          <DiscordIcon className="size-3.5" /> Chamar
        </span>
      </div>
    </a>
  );
}
