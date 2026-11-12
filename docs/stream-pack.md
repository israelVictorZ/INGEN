# Kit de stream (overlays)

Overlays animados da INGEN para OBS / Streamlabs / qualquer programa com **Fonte de navegador**.

- **Área interna:** `/stream` (kit) e `/stream/ajuda` (guia para leigos). Sem link no site, fora do sitemap, `noindex` em `src/app/stream/layout.tsx` e `X-Robots-Tag: noindex` em `/stream/*` (`next.config.ts`).
  O bloqueio por senha do futuro ADM entra nesse layout. No kit, o jogador escolhe o nome, liga/desliga opções por botões (que viram parâmetros no link) e copia cada link.
- **Molduras sobre vídeo:** borda reta + degraus sólidos para dentro (`stairs: "in"`); sob capturas (cliente/câmera no fundo), blocos de pixel por fora (`stairs: "out"`). Nunca recortar o canto: deixaria ponta preta ou a quina do vídeo aparecendo.
- **Overlays (estáticos):** `public/stream/overlays/*.html`, servidos em `/stream/overlays/...`.
- **Dados do jogador:** `GET /api/stream?jogador=<slug>` (CORS aberto). Com `?jogador=<slug>` no link, os overlays puxam nick, time, lane, elo e canal do banco; o fundo do cliente atualiza o elo a cada 5 min.

## Peças

| Arquivo | Para quê | Tamanho da fonte |
|---|---|---|
| `cliente.html` | Fundo fora de partida: cliente 1280×720 (x 40, y 40), câmera 536×302 (x 1344, y 40) e chat embutido | 1920×1080 |
| `tampao-mapa.html` | Cobre o minimapa (radar, rotas do Rift, logo + nick) | Quadrado do tamanho do minimapa |
| `webcam.html` | Borda da câmera com etiqueta do nick (em partida: entre o HUD e o minimapa) | Mesmo tamanho da câmera |
| `chat.html` | Chat transparente (Twitch anônimo + emotes 7TV/BTTV/FFZ) | Livre (ex.: 524×616 em x 1350, y 418) |
| `alertas.html` | Subs, resubs, presentes, raids e bits (pelo chat da Twitch) | 1920×1080 |
| `comecando.html` / `volta-ja.html` / `encerrando.html` | Telas cheias | 1920×1080 |

Follows não passam pelo chat da Twitch: para eles existe o widget do StreamElements em `public/stream/streamelements/alertas/` (o painel tem botões para copiar cada aba). Usar **ou** o widget **ou** `alertas.html`, nunca os dois.

## Parâmetros

Prioridade: parâmetro da URL > dados do site (`jogador`) > `public/stream/config.js` > padrão.

| Parâmetro | Peças | Exemplo |
|---|---|---|
| `jogador` | todas | `atlas` (slug do site) |
| `nome`, `time`, `lane`, `elo`, `meta` | todas / cliente | sobrescrevem os dados do site |
| `canal` | chat, alertas, cliente, telas | `ingen_team` |
| `cam=0`, `chat=0` | cliente | sem câmera / chat em fonte separada |
| `chat=1`, `minutos=5`, `hora=21:30`, `titulo1`, `titulo2`, `sub` | telas | |
| `sumir`, `fonte`, `esconder`, `comandos=1`, `cores=0` | chat | |
| `tag=0`, `aovivo=0`, `sombra=0`, `cantos=tl,br` | webcam | |
| `texto=0`, `radar=0` | tampão | |
| `posicao`, `tempo`, `som=0`, `volume`, `bits=0` | alertas | |
| `demo=1` | todas | mensagens/alertas de teste |
| `site` | todas | endereço do site, só para quem abre os arquivos localmente |

## Manutenção

- Visual compartilhado em `public/stream/core/` (scripts clássicos, sem módulos: funcionam no OBS, no StreamElements e em `file://`).
- Mudou `core/ingen.css`, `core/alerts.*` ou `core/ingen.js`? Rode `node scripts/build-stream-se.mjs` para regenerar o widget do StreamElements.
