import type { NextConfig } from "next";
import slugRedirects from "./src/lib/slug-redirects.json";

const nextConfig: NextConfig = {
  // jogadores que trocaram de endereço (npm run manage -- player:rename): 308 permanente, bom para SEO
  async redirects() {
    return [
      // endereço antigo → domínio oficial (evita duas cópias do site no Google).
      // /api e /stream ficam de fora: o sync avisa o site com token (um redirecionamento descartaria
      // o cabeçalho) e overlays já configurados no OBS/StreamElements podem ter o endereço antigo gravado.
      {
        source: "/:path((?!api(?:/|$)|stream(?:/|$)|_next/).*)",
        has: [{ type: "host" as const, value: "ingen-three.vercel.app" }],
        destination: "https://ingengg.com.br/:path",
        permanent: true,
      },
      ...Object.entries(slugRedirects as Record<string, string>).map(([from, to]) => ({
        source: `/jogador/${from}`,
        destination: `/jogador/${to}`,
        permanent: true,
      })),
    ];
  },
  // overlays chamam /api/stream?jogador=<slug>: servido pela resposta guardada de /api/stream/<slug>
  // (não consulta o banco a cada pergunta do overlay; o link dos streamers não muda)
  async rewrites() {
    return {
      beforeFiles: [{ source: "/api/stream", has: [{ type: "query", key: "jogador", value: "(?<jogador>.+)" }], destination: "/api/stream/:jogador" }],
    };
  },
  // kit de stream (página /stream e overlays em public/stream): uso interno, fora do Google
  async headers() {
    const noindex = [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];
    // overlays também rodam no StreamElements e em arquivo local, então o CORS é aberto
    const cors = [{ key: "Access-Control-Allow-Origin", value: "*" }];
    return [
      { source: "/stream", headers: noindex },
      { source: "/stream/:path*", headers: noindex },
      { source: "/api/stream", headers: cors },
      { source: "/api/stream/:path*", headers: cors },
    ];
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
