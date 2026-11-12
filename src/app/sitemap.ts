import type { MetadataRoute } from "next";
import { getSiteData } from "@/lib/data";
import { FEATURES } from "@/lib/features";
import { abs } from "@/lib/site";

/** Só endereços canônicos: nada de /comparar?a=…, nada dos slugs antigos (eles redirecionam). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { teams, players, lastSync } = await getSiteData();
  const updated = lastSync ? new Date(lastSync) : new Date();
  return [
    { url: abs("/"), lastModified: updated, changeFrequency: "daily", priority: 1 },
    { url: abs("/elenco"), lastModified: updated, changeFrequency: "daily", priority: 0.9 },
    { url: abs("/ranking"), lastModified: updated, changeFrequency: "daily", priority: 0.8 },
    ...teams.map((t) => ({ url: abs(`/scouting/${t.slug}`), lastModified: updated, changeFrequency: "daily" as const, priority: 0.7 })),
    ...players.map((p) => ({ url: abs(`/jogador/${p.slug}`), lastModified: updated, changeFrequency: "daily" as const, priority: 0.8 })),
    { url: abs("/comparar"), lastModified: updated, changeFrequency: "weekly", priority: 0.5 },
    ...(FEATURES.news ? [{ url: abs("/noticias"), lastModified: updated, changeFrequency: "weekly" as const, priority: 0.6 }] : []),
  ];
}
