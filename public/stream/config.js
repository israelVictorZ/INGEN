/*
 * INGEN · Stream pack: configuração padrão.
 *
 * Tudo aqui pode ser sobrescrito pela URL da fonte de navegador, por exemplo:
 *   overlays/webcam.html?nome=Atlas&time=black
 *
 * Se você usa a opção "Arquivo local" do OBS (que ignora parâmetros de URL),
 * preencha os valores aqui e salve. Deixe "" para usar o padrão.
 */
window.INGEN_CONFIG = {
  // Slug do jogador no site (ex.: "atlas"): puxa nick, time, lane, elo e canal sozinho
  jogador: "",
  site: "",          // só para quem abre os arquivos localmente: endereço do site da INGEN

  // Ou preencha à mão
  nome: "",          // nick que aparece na borda da câmera, no fundo do cliente e nos alertas
  time: "black",     // "black" ou "silver" (Silver troca o acento verde por prata)
  lane: "",          // top, jungle, mid, adc, suporte
  elo: "",           // ex.: "Esmeralda IV · 54 PDL"
  meta: "",          // ex.: "Diamante IV" ou "50 seguidores"

  // Twitch
  canal: "ingen_team", // canal cujo chat e cujos subs aparecem nos overlays

  // Redes (use "0" para esconder uma delas)
  instagram: "@ingen.gg",
  twitch: "",        // vazio = twitch.tv/<canal>
  discord: "discord.gg/aArbDqdrMY",
};
