import { ImageResponse } from "next/og";
import { getPlayer } from "@/lib/data";
import { championSplash } from "@/lib/ddragon-urls";
import { ROLE_META, TIER_META, emblemUrl, fixed, pct, rankLabel, riotId } from "@/lib/format";
import { OG_COLORS as C, OG_SIZE, displayFont, logoDataUrl } from "@/lib/og";
import { mainChamps } from "@/lib/view";

export const alt = "Perfil do jogador da INGEN: elo, campeões e estatísticas";
export const size = OG_SIZE;
export const contentType = "image/png";

/** Card de compartilhamento do jogador: splash do campeão principal, nome, elo e números da Solo/Duo. */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { player: p } = await getPlayer(slug);
  if (!p) return new Response("Not found", { status: 404 });

  const main = mainChamps(p)[0];
  const tier = p.solo ? TIER_META[p.solo.tier] : null;
  const elo = p.solo ? `${rankLabel(p.solo.tier, p.solo.division)} · ${p.solo.lp} PDL` : "SEM RANQUEADA";
  const name = p.displayName.toUpperCase();
  const role = ROLE_META[p.role].label.toUpperCase();
  const team = p.team.name.toUpperCase();
  const s = p.stats;
  const nums = s
    ? [
        { k: "WINRATE", v: pct(s.winrate) },
        { k: "KDA", v: fixed(s.kda, 2) },
        { k: "PARTIDAS", v: String(s.games) },
      ]
    : [];
  const [logo, fonts] = await Promise.all([
    logoDataUrl(),
    displayFont(`${name}${riotId(p)}${elo.toUpperCase()}${role}${team}0123456789.,%·WINRATEKDAPARTIDAS`),
  ]);

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: C.bg, position: "relative", fontFamily: "Big Shoulders" }}>
        {main && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={championSplash(main.key)}
            alt=""
            width={820}
            height={630}
            style={{ position: "absolute", top: 0, right: 0, width: 820, height: 630, objectFit: "cover", objectPosition: "60% 20%", opacity: 0.7 }}
          />
        )}
        {/* esquerda opaca para o texto, direita mostra o campeão */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            display: "flex",
            backgroundImage: "linear-gradient(90deg, #04060a 0%, #04060a 34%, rgba(4,6,10,0.85) 52%, rgba(4,6,10,0.35) 75%, rgba(4,6,10,0.15) 100%)",
          }}
        />
        <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", display: "flex", backgroundImage: "linear-gradient(0deg, #04060a 0%, rgba(4,6,10,0) 40%)" }} />
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: 6,
            display: "flex",
            backgroundImage: p.team.accent === "silver" ? "linear-gradient(90deg, #c9cdd3, #8b93a1)" : "linear-gradient(90deg, #3dfd4e, #00f07f)",
          }}
        />

        <div style={{ position: "relative", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "60px 70px", width: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 30, letterSpacing: 5 }}>
              <span style={{ color: p.team.accent === "silver" ? "#c9cdd3" : C.green }}>{team}</span>
              <span style={{ color: C.gray }}>·</span>
              <span style={{ color: C.white }}>{role}</span>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logo} width={96} height={96} alt="" />
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: name.length > 9 ? 150 : 190, lineHeight: 0.85, color: C.white }}>{name}</div>
            <div style={{ display: "flex", marginTop: 16, fontSize: 34, letterSpacing: 2, color: C.gray }}>{riotId(p)}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 28 }}>
              {p.solo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={emblemUrl(p.solo.tier)} width={300} height={300} alt="" style={{ objectFit: "contain", margin: "-110px -90px -110px -110px" }} />
              )}
              <span style={{ fontSize: 56, color: tier?.color ?? C.gray }}>{elo.toUpperCase()}</span>
            </div>
          </div>

          <div style={{ display: "flex", gap: 56 }}>
            {nums.map((n) => (
              <div key={n.k} style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: 22, letterSpacing: 4, color: C.gray }}>{n.k}</span>
                <span style={{ fontSize: 60, lineHeight: 1, color: C.white }}>{n.v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
