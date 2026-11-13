import { readFile } from "node:fs/promises";
import { join } from "node:path";

/** Tamanho padrão de imagem de compartilhamento (WhatsApp, Discord, X, Google Discover). */
export const OG_SIZE = { width: 1200, height: 630 };

/**
 * Big Shoulders (a fonte de títulos do site) só com os caracteres usados, em TTF.
 * Se o Google Fonts falhar, a imagem sai com a fonte padrão em vez de quebrar.
 */
export async function displayFont(text: string) {
  try {
    const css = await (
      await fetch(`https://fonts.googleapis.com/css2?family=Big+Shoulders:wght@900&text=${encodeURIComponent(text)}`, {
        headers: { "User-Agent": "Mozilla/4.0" }, // agente antigo → o Google responde com TTF
      })
    ).text();
    const url = css.match(/src: url\((.+?)\) format\('(?:truetype|opentype)'\)/)?.[1];
    if (!url) return [];
    const data = await (await fetch(url)).arrayBuffer();
    return [{ name: "Big Shoulders", data, weight: 900 as const, style: "normal" as const }];
  } catch {
    return [];
  }
}

/** Emblema de elo de public/emblems embutido na imagem (o gerador de OG não resolve caminhos relativos). */
export async function emblemDataUrl(tier: string) {
  const buf = await readFile(join(process.cwd(), "public/emblems", `${tier.toLowerCase()}.png`));
  return `data:image/png;base64,${buf.toString("base64")}`;
}

export async function logoDataUrl() {
  const buf = await readFile(join(process.cwd(), "public/brand/ingen-logo.png"));
  return `data:image/png;base64,${buf.toString("base64")}`;
}

export const OG_COLORS = { bg: "#04060a", green: "#3dfd4e", gray: "#8b93a1", white: "#f4f6f8", line: "#1b1f25" };
