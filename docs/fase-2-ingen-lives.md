# Ingen Lives · Fase 2

Plano da próxima fase do kit de stream. A fase 1 está no ar: `/stream` (kit), `/stream/ajuda` (guia), overlays em `public/stream/` e `GET /api/stream`. Detalhes técnicos em [`stream-pack.md`](stream-pack.md).

## O que a fase 1 entregou

- 8 peças animadas: fundo do cliente, tampão de mapa, borda da webcam, chat, alertas, "Já vai começar", "Volta já", "Encerrando".
- Dados do jogador direto do banco (`?jogador=<slug>`): nick, time, lane, elo (atualiza a cada 5 min) e canal.
- Kit com prévias, opções por botões e links prontos; widget de alertas do StreamElements (follows).
- Guia para leigos com sumário fixo e problemas comuns.
- Tudo oculto: `noindex`, fora do sitemap, sem links no site.

## Fase 2: prioridades

### P1 · Tirar atrito da instalação

| Item | O que é | Por quê |
|---|---|---|
| **Coleção de cenas do OBS** | Botão no kit que baixa um `.json` de Scene Collection já com as 5 cenas (Começando, Lobby, Partida, Pausa, Fim), todas as fontes posicionadas e os links do jogador. No OBS: *Coleção de cenas → Importar*. | Instalação cai de ~15 min para ~1 min. Maior ganho para o time leigo. |
| **Login simples (ADM)** | Senha única para `/stream` e `/stream/ajuda`, aplicada em `src/app/stream/layout.tsx`. | Combinado: a área é só para membros. |
| **Página "Novidades do kit"** | Lista curta de mudanças com data e "precisa copiar o link de novo? sim/não". | O time sabe quando agir. |

### P2 · Novos assets

| Item | O que é | Dados |
|---|---|---|
| **Placar do dia** | Faixa pequena para a cena de partida: vitórias/derrotas do dia, PDL ganho/perdido, sequência atual. | Já existem no banco: `lpToday`, `form`, `streak` (só expor no `/api/stream`). |
| **Transição (stinger)** | Escada de pixels + logo cruzando a tela. Entregar como página HTML para o OBS e, se possível, WebM com transparência. | — |
| **Câmera cheia** | Cena "só conversa": moldura grande da câmera com nick, time, redes e chat lateral. | `/api/stream` |
| **"Jogando com"** | Banner com o duo ou o time na partida (flex, Clash, campeonato). | Duos já calculados no banco (`duos`). |
| **Painéis e offline da Twitch** | Painéis 320 px (Sobre, Redes, Setup, Regras) e imagem de canal offline, exportados em PNG pelo kit. | — |

### P3 · Guia

- GIF curto por passo do OBS (adicionar fonte, *Editar transformação*, trocar link).
- Checklist "antes de entrar ao vivo" com caixas de marcar (salvas no navegador).
- Imagem de "como fica na live" para cada cena.

## Ordem sugerida

1. Coleção de cenas do OBS (P1): maior impacto, usa o que já existe.
2. Placar do dia (P2): dados prontos, só API + overlay.
3. Login simples (P1): antes de divulgar o kit para mais gente.
4. Câmera cheia e transição (P2).
5. "Jogando com", painéis e offline (P2).
6. Melhorias do guia (P3) junto com cada entrega.

## Pontos de atenção

- **Testar no OBS de verdade** antes de divulgar: até aqui tudo foi validado no navegador. Conferir principalmente a borda da webcam no tamanho real (a escada não pode cobrir o rosto) e o tampão sobre o minimapa em escalas diferentes.
- O widget do StreamElements é gerado por `scripts/build-stream-se.mjs`: rodar o build sempre que mexer em `public/stream/core`.
- Molduras sobre vídeo nunca recortam o canto (ver `stream-pack.md`).
