import type { Team } from "@/lib/data";
import { toCard, toRiftSlots } from "@/lib/view";
import { TIER_META, opggMultiUrl, pct, scoreToLabel, scoreToTier } from "@/lib/format";
import { ButtonLink, TeamTag } from "@/components/ui";
import { PlayerCard, PlayerRow } from "./PlayerCard";
import { OpenSlotCard, OpenSlotRow } from "./OpenSlotCard";
import { RiftMap } from "./RiftMap";
import { ReserveList } from "./ReserveList";
import { Split } from "@/components/motion/Split";

export function TeamBlock({ team, version, index }: { team: Team; version: string; index: number }) {
  return (
    <section id={team.slug} className="scroll-mt-24 py-20 md:py-28">
      <div className="wrap">
        <div className="grid items-center gap-14 lg:grid-cols-[1fr_1.05fr]">
          <div>
            <div className="flex items-center gap-4">
              <span className="font-pixel text-sm text-white/25">0{index + 1}</span>
              <TeamTag accent={team.accent} name="Elenco" />
            </div>
            <Split className="mt-4 font-display text-[clamp(3.5rem,10vw,8rem)] font-black uppercase leading-[0.85] text-white">
              INGEN <span className={team.accent === "silver" ? "text-silver" : "grad-text"}>{team.shortName}</span>
            </Split>
            {team.tagline && (
              <p data-reveal="up" className="mt-6 max-w-md text-lg text-gray">
                {team.tagline}
              </p>
            )}

            <dl data-reveal="stagger" className="mt-10 grid max-w-xl grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)_minmax(0,1fr)] gap-px bg-line">
              {[
                { k: "Elo médio", v: team.avgScore != null ? scoreToLabel(team.avgScore) : "—", color: team.avgScore != null ? TIER_META[scoreToTier(team.avgScore)]?.color : undefined },
                { k: "Winrate", v: team.stats ? pct(team.stats.winrate) : "—", sub: team.stats ? `${team.stats.games} jogos` : "" },
                { k: "Jogadores", v: `${team.players.length}/5` },
              ].map((s: { k: string; v: string; sub?: string; color?: string }) => (
                <div key={s.k} className="bg-bg-1 px-5 py-5">
                  <dt className="label-mono text-[0.6rem]">{s.k}</dt>
                  <dd className="mt-3 whitespace-nowrap font-display text-xl font-extrabold uppercase leading-none text-white md:text-2xl" style={{ color: s.color }}>
                    {s.v}
                  </dd>
                  {s.sub && <dd className="mt-1 font-mono text-[0.62rem] text-gray-dim">{s.sub}</dd>}
                </div>
              ))}
            </dl>

            <div data-reveal="up" className="mt-10 flex flex-wrap gap-3">
              <ButtonLink href={`/scouting/${team.slug}`}>Relatório de scouting</ButtonLink>
              <ButtonLink href={opggMultiUrl([...team.players, ...team.reserves])} variant="ghost" external>
                op.gg multi
              </ButtonLink>
            </div>
          </div>

          <div data-reveal="fade">
            <RiftMap slots={toRiftSlots(team, version)} accent={team.accent} />
          </div>
        </div>

        {/* Mobile: lista de linhas (os cards em 2 colunas ficavam espremidos e deixavam um buraco no 5º) */}
        <div data-reveal="stagger" className="mt-12 grid gap-2.5 sm:hidden">
          {team.slots.map((s, i) =>
            s.kind === "player" ? (
              <PlayerRow key={s.role} p={toCard(s.player)} index={i} />
            ) : (
              <OpenSlotRow key={s.role} role={s.role} teamName={team.name} />
            ),
          )}
        </div>

        <div data-reveal="stagger" className="mt-20 hidden grid-cols-2 gap-3 sm:grid md:gap-4 lg:grid-cols-5">
          {team.slots.map((s, i) =>
            s.kind === "player" ? (
              <PlayerCard key={s.role} p={toCard(s.player)} index={i} />
            ) : (
              <OpenSlotCard key={s.role} role={s.role} teamName={team.name} />
            ),
          )}
        </div>

        <ReserveList reserves={team.reserves} version={version} />
      </div>
    </section>
  );
}
