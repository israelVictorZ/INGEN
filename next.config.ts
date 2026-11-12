import type { NextConfig } from "next";
import slugRedirects from "./src/lib/slug-redirects.json";

const nextConfig: NextConfig = {
  // jogadores que trocaram de endereço (npm run manage -- player:rename): 308 permanente, bom para SEO
  async redirects() {
    return Object.entries(slugRedirects as Record<string, string>).map(([from, to]) => ({
      source: `/jogador/${from}`,
      destination: `/jogador/${to}`,
      permanent: true,
    }));
  },
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    // As imagens vêm de CDNs da Riot (já otimizadas). Evitamos custo de otimização na Vercel.
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "ddragon.leagueoflegends.com" },
      { protocol: "https", hostname: "raw.communitydragon.org" },
    ],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
