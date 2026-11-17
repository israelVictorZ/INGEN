/**
 * Chamada da Copa Rift Masters na home (campeonato à parte do time). Temporária: tudo dela fica aqui.
 *
 * Para tirar do site depois do campeonato: `enabled: false` e publicar. Para remover de vez:
 * apagar este arquivo, src/components/home/RiftMastersCta.tsx, public/partners/rift-masters.png
 * e a linha <RiftMastersCta /> em src/app/page.tsx.
 */
export const RIFT_MASTERS = {
  enabled: true,
  name: "Copa Rift Masters 2026",
  /** etiqueta acima do título */
  when: "Estreia seg., 16/11 · 20h",
  pitch:
    "Oito equipes em pontos corridos e playoffs em MD5. O primeiro jogo é na segunda, 16/11, às 20h (Brasília), com transmissão ao vivo na Twitch.",
  site: "https://www.riftmasters.com.br/",
  twitch: "https://www.twitch.tv/riftmasters_",
  logo: { src: "/partners/rift-masters.png", width: 360, height: 327 },
  /** roxo da logo */
  color: "#8657f5",
} as const;
