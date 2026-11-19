/**
 * Lado do navegador do link fixo de transmissão (ver `tv.ts`): a chave fica guardada neste aparelho e o id do
 * link é o mesmo resumo que o servidor calcula (`tvId`), só para mostrar o link do OBS a quem digitou a chave.
 */

export const TV_KEY_STORAGE = "ingen-draft-tv-key";

export async function tvIdFromKey(key: string): Promise<string | null> {
  try {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`ingen-draft-tv:${key}`));
    let bin = "";
    for (const b of new Uint8Array(buf)) bin += String.fromCharCode(b);
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "").slice(0, 16);
  } catch {
    return null; // sem crypto.subtle (página fora de https)
  }
}

export function loadTvKey(): string {
  try {
    return localStorage.getItem(TV_KEY_STORAGE) ?? "";
  } catch {
    return "";
  }
}

export function saveTvKey(key: string) {
  try {
    if (key) localStorage.setItem(TV_KEY_STORAGE, key);
  } catch {
    /* sem storage: digita de novo na próxima */
  }
}
