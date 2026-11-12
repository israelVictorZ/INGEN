# Melhorias da plataforma INGEN, em ordem de prioridade

> Mapeamento feito em 11/11/2026, sobre o site em https://ingen-three.vercel.app.
> Cada item traz a página afetada, o problema ou oportunidade, a proposta e o esforço.
>
> **Prioridades:**
> - **P0:** dado errado ou funcionalidade quebrada.
> - **P1:** falta informação importante.
> - **P2:** experiência e polimento.
> - **P3:** novas funcionalidades.
>
> **Esforço:**
> - **P:** até 1 h.
> - **M:** algumas horas.
> - **G:** 1 dia ou mais.
>
> Os itens marcados com ⚙️ precisam de dados que o sync ainda não grava. Em geral, é só adicionar campos em `scripts/sync-riot.ts` e rodar `SYNC_BACKFILL=1 npm run sync`.

---

## P0: correção e confiabilidade

| # | Página | Problema | Proposta | Esforço |
|---|---|---|---|---|
| 1 | Scouting | **"Salvar PDF" sai ilegível.** O `@media print` só deixa o `body` branco: os cards continuam escuros e o navegador não imprime fundos, então sobra texto branco em papel branco. | CSS de impressão dedicado: fundo branco, texto escuro, bordas finas, sem animações, uma lane por bloco, cabeçalho com logo e data. Testar no Chrome em "Salvar como PDF". | M |
| 2 | Global | **Key da Riot expira todo dia.** Quando vence, o sync para e os dados congelam, sem ninguém perceber pelo site. | (a) Pedir a Personal Key pela conta do capitão (resolve na raiz). (b) Mostrar no rodapé "Dados atualizados há X min" e um aviso discreto quando a última atualização tiver mais de 2 h. | P + M |
| 3 | Global | **Erro de banco derruba a página.** Se o Neon falhar, `getSiteData` lança e a página quebra. | `error.tsx` por rota, com mensagem amigável, e `global-error.tsx`. Opcional: servir o último cache válido (o `expire` do `cacheLife` já ajuda). | P |
| 4 | Elenco (mobile) | No celular, os nomes nos cantos do Mapa do Rift encostam ou passam da borda. | No mobile, mostrar só os ícones no mapa (nomes na lista de cards abaixo) ou posicionar o rótulo para dentro do mapa nos cantos. | P |
| 5 | Comparar | O **radar não leva a lane em conta**: suporte sempre parece "fraco" em CS e dano, jungle em CS etc. | Normalizar por lane (referência = média da lane entre os jogadores da INGEN ou valores fixos por lane) e explicar a escala na legenda. | M |
| 6 | Perfil / Scouting | **Amostras pequenas parecem definitivas** (ex.: "100% em 1 partida"). | Mostrar winrate só com 3+ jogos (abaixo disso, "poucos jogos"), barra de confiança mais clara e ordenar por jogos × winrate. | P |
| 7 | Global | **Acessibilidade:** o cinza mais claro (`--gray-dim`) sobre o fundo tem contraste abaixo do mínimo (WCAG AA). Alguns botões não têm foco visível. | Clarear `--gray-dim` para ~`#7a808a` em textos, garantir `focus-visible` em links e botões, revisar `alt` das imagens de campeão. | P |

---

## P1: informações que faltam (maior ganho)

### Perfil do jogador
| # | Melhoria | Detalhe | Esforço |
|---|---|---|---|
| 8 | ⚙️ **Diferença contra o adversário de lane** | Ouro, XP e CS aos 10/15 min contra o oponente direto (`challenges.laningPhaseGoldExpAdvantage`, `maxCsAdvantageOnLaneOpponent`, `earlyLaningPhaseGoldExpAdvantage`). É o dado mais pedido em análise de jogador. | M |
| 9 | ⚙️ **Participação em objetivos** | Dragões, Arauto, Barão e torres do time + participação do jogador (`challenges.dragonTakedowns`, `baronTakedowns`, `riftHeraldTakedowns`, `turretTakedowns`). Essencial para JG e SUP. | M |
| 10 | **Métricas por lane** | Cards que mudam conforme a lane. **JG:** abates antes dos 10 min, objetivos, CS de selva. **SUP:** visão/min, wards, control wards, assistências. **ADC:** dano/min, % do dano, mortes. **TOP:** abates solo, placas. **MID:** dano, roams. | M |
| 11 | **Comparação com a média do time e da lane** | Ao lado de cada métrica: "acima ou abaixo da média da INGEN" (seta e %). Contextualiza números soltos. | M |
| 12 | ⚙️ **Builds e runas mais usadas por campeão** | Itens finais e runa principal mais frequentes por campeão (os itens e a keystone já são gravados; falta agregar). | M |
| 13 | **Desempenho por dia e horário** | Mapa de calor de partidas (dia da semana × hora) e winrate por período. Ajuda a montar o horário de treino. | M |
| 14 | ⚙️ **Placar completo da partida** | Expandir a linha da partida com os 10 jogadores (campeão, KDA, itens, dano). Hoje só o próprio jogador é gravado; precisa gravar todos os participantes. | G |
| 15 | **Gráfico de elo com eventos** | Marcar promoções e quedas no gráfico, com filtro de período (7/30 dias, temporada). Sem o filtro, o eixo fica comprimido conforme o histórico cresce. | M |
| 16 | **Foto, bio e redes** | Campos já existem no banco (`photo_url`, `bio`, `social_links`) mas não aparecem nem têm como ser preenchidos. Mostrar no hero do perfil. | P (exibir) + depende do admin |

### Scouting
| # | Melhoria | Detalhe | Esforço |
|---|---|---|---|
| 17 | **Sugestões de ban e "comfort picks"** | Por jogador: os 3 campeões mais fortes (jogos × winrate) = alvos de ban. Por time: pool combinado e sobreposições. É o que outro time realmente procura. | M |
| 18 | **Forma recente e tendência** | Últimas 10 de cada jogador e variação de PDL nos últimos 7 dias (o histórico já é gravado). | P |
| 19 | **Data do relatório e versão do jogo** | "Gerado em DD/MM HH:mm · Patch 16.22". Relatório sem data perde valor quando é compartilhado. | P |
| 20 | **Imagem de compartilhamento (OG)** | Card gerado com os 5 jogadores e o elo, para o preview no Discord e no WhatsApp (`opengraph-image.tsx` com `next/og`). | M |
| 21 | **Versão em inglês** | Botão PT/EN só no scouting, para times de fora. | M |

### Elenco
| # | Melhoria | Detalhe | Esforço |
|---|---|---|---|
| 22 | **Mais informação no card** | "Jogou há 2 h", forma (últimas 5), PDL nas últimas 24h e o selo ao vivo, que já existe. | P |
| 23 | **Ex-jogadores e linha do tempo** | Seção "Já defenderam o escudo", com período e lane (os dados de entrada e saída já existem em `team_memberships`). | M |
| 24 | **Staff** | Capitão, coach, analista e manager, sem dados da Riot, só nome, função e redes. Precisa de tabela nova. | M |

### Ranking
| # | Melhoria | Detalhe | Esforço |
|---|---|---|---|
| 25 | **Ranking de subida de PDL** | "Quem mais subiu nos últimos 7 dias", a partir de `rank_history`. | P |
| 26 | **Alternar Solo/Duo e Flex** + outros quadros | Melhor KDA, mais partidas, maior winrate recente (com mínimo de jogos), mais visão. | M |
| 27 | **Setas de posição** | ▲▼ comparando com a semana anterior. | P |

### Home
| # | Melhoria | Detalhe | Esforço |
|---|---|---|---|
| 28 | **"Destaques da semana" automáticos** | Maior subida, partida com mais abates, primeira penta, quem entrou ao vivo. Gerado dos dados, sem precisar de admin. | M |
| 29 | **Feed de atividades** | "Coelho subiu para Esmeralda IV", "Czar fez uma Quadra kill". Notícias automáticas a partir do sync, que substituem as notícias manuais enquanto elas estão ocultas. | M |

---

## P2: experiência e polimento

| # | Página | Melhoria | Esforço |
|---|---|---|---|
| 30 | Comparar | **Layout mobile:** os dois lados empilham e o "VS" some. Fazer um cabeçalho compacto lado a lado e a tabela de métricas em linha única. | M |
| 31 | Comparar | **Confronto direto:** se os dois já se enfrentaram, ou jogaram juntos, mostrar as partidas. | M |
| 32 | Comparar | **Imagem compartilhável** do duelo (OG image com os dois jogadores e o radar). | M |
| 33 | Perfil | **Tabela de campeões ordenável** (por jogos, winrate, KDA) e filtro "só da lane". | P |
| 34 | Perfil | **Embed da live** quando o jogador estiver ao vivo (player da Twitch no topo do perfil). | P |
| 35 | Global | **Dicas nas métricas:** ícone (i) explicando KDA, participação em abates, CS@10 etc. Ajuda quem não é analista. | P |
| 36 | Global | **Desempenho:** splash arts pesadas (~200 KB cada). Usar tamanhos menores, `loading="lazy"` abaixo da dobra e pré-carregar só o hero. Rodar Lighthouse e mirar 90+ no mobile. | M |
| 37 | Global | **Animações com `prefers-reduced-motion`:** o Mapa do Rift e o hero já respeitam; revisar o letreiro (marquee), a transição de pixels e o tilt dos cards. | P |
| 38 | Global | **SEO:** `sitemap.ts`, `robots.ts`, metadados por jogador (já existe a descrição) e dados estruturados (Organization / SportsTeam). | P |
| 39 | Global | **Rodapé com redes do time:** Discord, Instagram, X e YouTube oficiais da INGEN. | P |
| 40 | Home | **Hero no mobile:** reduzir o logo e o espaçamento para o título aparecer acima da dobra em telas pequenas. | P |
| 41 | Global | **Página 404** com o Mapa do Rift como ilustração ("fora do mapa") e atalhos para elenco e ranking. | P |

---

## P3: novas funcionalidades

| # | Funcionalidade | Detalhe | Esforço |
|---|---|---|---|
| 42 | **Painel admin** | Planejado e pausado (ver `docs/roadmap.md`). Até lá, usar as skills `ingen-jogador` e `ingen-twitch`. | G |
| 43 | **Campeonatos e agenda** | Tabela `tournaments` com página de campeonatos, próximos jogos na home e resultados. | G |
| 44 | **Recrutamento com formulário** | Formulário de candidatura com webhook para o Discord (o link do Discord já está previsto em `RECRUIT_HREF`). | M |
| 45 | **Clipes e destaques** | Últimos clipes da Twitch de cada jogador (`/helix/clips`) e vídeos do YouTube no perfil. | M |
| 46 | **Notificações no Discord** | Webhook automático: promoções de elo, pentakills, alguém entrou ao vivo. Reaproveita a sonda de 5 min. | M |
| 47 | **Domínio próprio** | Ex.: `ingen.gg` ou `ingen.com.br` na Vercel. | P (+ custo do domínio) |
| 48 | **Analytics** | Vercel Web Analytics (gratuito) para ver as páginas mais acessadas, principalmente o scouting. | P |
| 49 | **Logo em SVG** | Permite animar torres, escudo e letras separadamente no hero. | M |
| 50 | **Testes e CI** | Testes dos cálculos (KDA, winrate, elo, duo, confrontos) e build no GitHub Actions a cada push, antes do deploy. | M |

---

## Já resolvido nesta rodada (referência)

- **P0 #1** Scouting: "Salvar PDF" com CSS de impressão próprio (papel branco, texto escuro, barras coloridas).
- **P0 #2b** Rodapé mostra "Dados atualizados há X" e avisa quando o sync passa de 7 h parado.
- **P0 #3** `error.tsx` e `global-error.tsx` com mensagem amigável e "Tentar de novo".
- **P0 #4** Mapa do Rift: rótulos dos cantos alinham para dentro no celular.
- **P0 #6** Amostras pequenas: campeões ordenados por winrate ajustado ao nº de partidas; 1–2 jogos marcados como "poucos jogos".
- **P0 #7** Contraste do `--gray-dim` (4,8:1) e foco visível no teclado.
- **P1 #17 / #19** Scouting: bans sugeridos, picks com confiança, pontos fortes e fracos, confrontos difíceis, picks compartilhados, data e patch do relatório.
- **P1 #25** Ranking: destaques da semana (maior subida, partida da semana, mais vitórias, melhor KDA, sequência, mais ativo) e gráfico de elo de todos.
- **P2 #30** Comparar no celular: os dois jogadores lado a lado com o VS.
- **P2 #38** SEO: sitemap, robots, canônicos, imagens de compartilhamento e dados estruturados.
- **P2 #40** Hero no celular com logo menor.

- **Animação de contagem** mostrava "0.00 / 0%" até a seção entrar na tela. Agora mostra o valor real.
- **Gráfico de elo** só cria ponto quando o elo muda, com a data real da mudança; a linha fica parada entre mudanças.
- **Remakes** (partidas com menos de 5 min) deixaram de contar nas estatísticas: eram 16 de 388 partidas.
- **Sync a cada 5 min em modo sonda**, sem acordar o banco quando nada muda.
- **Skills** `ingen-jogador` e `ingen-twitch` para gerenciar elenco e canais pelo chat.
