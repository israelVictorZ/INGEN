import { ImageResponse } from "next/og";
import { OG_COLORS as C, OG_SIZE, displayFont, logoDataUrl } from "@/lib/og";

export const alt = "INGEN, time brasileiro de League of Legends: INGEN Black e INGEN Silver";
export const size = OG_SIZE;
export const contentType = "image/png";

/** Imagem padrão de compartilhamento (vale para todas as páginas sem imagem própria). */
export default async function Image() {
  const title = "INGEN";
  const tagline = "TIME DE LEAGUE OF LEGENDS";
  const [logo, fonts] = await Promise.all([logoDataUrl(), displayFont(`${title}${tagline}BLACKSILVER·`)]);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: C.bg, position: "relative", fontFamily: "Big Shoulders" }}>
        {/* grade de linhas, como no site */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            display: "flex",
            backgroundImage: `linear-gradient(90deg, ${C.line} 1px, transparent 1px)`,
            backgroundSize: "120px 100%",
            opacity: 0.6,
          }}
        />
        <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", display: "flex", backgroundImage: "linear-gradient(180deg, rgba(4,6,10,0) 45%, rgba(61,253,78,0.16))" }} />
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 6, display: "flex", backgroundImage: "linear-gradient(90deg, #3dfd4e, #00f07f)" }} />
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 90px", flex: 1 }}>
          <div style={{ display: "flex", fontSize: 30, letterSpacing: 8, color: C.green }}>{tagline}</div>
          <div style={{ display: "flex", fontSize: 230, lineHeight: 0.9, color: C.white, marginTop: 10 }}>{title}</div>
          <div style={{ display: "flex", gap: 24, marginTop: 30, fontSize: 44 }}>
            <span style={{ color: C.green }}>BLACK</span>
            <span style={{ color: C.gray }}>·</span>
            <span style={{ color: "#c9cdd3" }}>SILVER</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 460 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logo} width={340} height={340} alt="" style={{ objectFit: "contain" }} />
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
