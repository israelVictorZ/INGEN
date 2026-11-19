import { LaneIcon } from "@/components/brand/LaneIcon";
import type { Role } from "@/db/schema";
import { MOTTO } from "@/lib/site";

const LANES: Role[] = ["TOP", "JUNGLE", "MID", "ADC", "SUPPORT"];

const ONE_IS_FIVE = [
  { k: "Acertou?", one: "O acerto de um", five: "é mérito de cinco.", lit: true },
  { k: "Errou?", one: "O erro de um", five: "é problema de cinco.", lit: false },
];

/**
 * "O acerto de um é mérito de cinco; o erro de um é problema de cinco."
 * As cinco lanes entram uma a uma no scroll e sobem em sequência no hover.
 */
export function OneIsFive() {
  return (
    <div data-reveal="stagger" className="grid gap-3 md:grid-cols-2">
      {ONE_IS_FIVE.map((c) => (
        <div key={c.k} className="border-run clip-step group relative overflow-hidden bg-bg-2 p-6 md:p-8">
          <span className="pointer-events-none absolute inset-0 bg-dots opacity-40" />
          <div className="relative">
            <p className="label-mono flex items-center gap-2">
              <span className={`size-1.5 ${c.lit ? "bg-green" : "bg-silver"}`} />
              {c.k}
            </p>
            <p className="mt-5 font-display text-4xl font-black uppercase leading-[0.92] text-white lg:text-5xl">
              {c.one} <br />
              <span className={c.lit ? "grad-text" : "text-silver"}>{c.five}</span>
            </p>
            <ul data-reveal="stagger" data-delay="0.3" className="mt-8 flex gap-2" aria-label="As cinco lanes">
              {LANES.map((r, i) => (
                <li key={r}>
                  <span
                    className={`flex size-10 items-center justify-center transition-transform duration-300 group-hover:-translate-y-1.5 md:size-11 ${
                      c.lit ? "bg-deep/70" : "bg-bg-3 text-silver"
                    }`}
                    style={{ transitionDelay: `${i * 45}ms` }}
                  >
                    <LaneIcon role={r} active={c.lit} className="size-6" />
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Escada de pixels: os "pequenos começos" crescendo até o topo, no desenho escalonado das torres do escudo.
 * Cada coluna entra em sequência no scroll (data-reveal="stagger").
 */
export function MottoStairs({ cell = "size-3 md:size-4" }: { cell?: string }) {
  return (
    <div data-reveal="stagger" aria-hidden className="flex items-end gap-1">
      {[1, 2, 3, 4, 5].map((h) => (
        <div key={h} className="flex flex-col gap-1">
          {Array.from({ length: h }, (_, j) => (
            <span
              key={j}
              className={`block ${cell} ${h === 5 ? "bg-[image:var(--grad-ingen)]" : "bg-green"}`}
              style={h === 5 ? undefined : { opacity: 0.18 + h * 0.15 }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Faixa do lema (home): escada, "Sic Parvis Magna" e a tradução. */
export function MottoStrip({ children }: { children?: React.ReactNode }) {
  return (
    <div className="clip-step relative overflow-hidden border border-line bg-bg-0 px-6 py-8 md:px-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_0%_100%,rgb(61_253_78/0.12),transparent_60%)]" />
      <div className="relative flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
        <div className="flex items-end gap-6">
          <MottoStairs cell="size-2.5 md:size-3" />
          <div>
            <p className="label-mono text-[0.62rem] text-green">Nosso lema</p>
            <p lang="la" className="mt-2 font-display text-4xl font-black uppercase leading-none text-white md:text-5xl">
              {MOTTO.latin}
            </p>
            <p className="mt-2 text-sm text-gray">“{MOTTO.pt}”</p>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
