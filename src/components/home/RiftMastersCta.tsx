import Image from "next/image";
import { TwitchIcon } from "@/components/brand/SocialIcons";
import { EXTERNAL_LINK } from "@/lib/links";
import { RIFT_MASTERS as RM } from "@/lib/rift-masters";

/**
 * Faixa da Copa Rift Masters na home, com a cor da marca dela (roxo) para não se confundir com a INGEN.
 * Liga e desliga em src/lib/rift-masters.ts (`enabled`).
 */
export function RiftMastersCta() {
  if (!RM.enabled) return null;
  const btn =
    "group clip-step-sm inline-flex items-center justify-center gap-3 px-5 py-3 font-mono text-[0.75rem] font-medium uppercase tracking-[0.16em] transition-all duration-300";
  return (
    <section aria-labelledby="rift-masters-title" className="wrap pt-20 md:pt-28">
      <div
        data-reveal="up"
        className="clip-step relative overflow-hidden border bg-bg-1 px-6 py-8 md:px-10 md:py-10"
        style={{
          borderColor: `${RM.color}55`,
          backgroundImage: `radial-gradient(ellipse at 12% 50%, ${RM.color}2e, transparent 60%)`,
        }}
      >
        <div className="grid items-center gap-8 md:grid-cols-[auto_minmax(0,1fr)_auto] md:gap-10">
          <Image
            src={RM.logo.src}
            alt="Logo da Rift Masters"
            width={RM.logo.width}
            height={RM.logo.height}
            className="h-auto w-24 drop-shadow-[0_0_24px_rgb(134_87_245/0.35)] md:w-36"
          />
          <div className="min-w-0">
            <p className="label-mono flex items-center gap-2 text-[0.68rem]" style={{ color: RM.color }}>
              <span className="inline-block size-2 animate-[blink_1.2s_steps(1)_infinite]" style={{ background: RM.color }} />
              Campeonato · {RM.when}
            </p>
            <h2 id="rift-masters-title" className="mt-3 font-display text-[clamp(2.2rem,5vw,4rem)] font-black uppercase leading-[0.9] text-white">
              {RM.name}
            </h2>
            <p className="mt-4 max-w-xl text-gray">{RM.pitch}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row md:flex-col">
            <a href={RM.twitch} {...EXTERNAL_LINK} className={`${btn} text-white hover:brightness-110`} style={{ background: RM.color }}>
              <TwitchIcon className="size-4" /> Assistir na Twitch
              <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">↗</span>
            </a>
            <a href={RM.site} {...EXTERNAL_LINK} className={`${btn} bg-bg-3 text-white hover:bg-white hover:text-bg-0`}>
              Ver o campeonato
              <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">↗</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
