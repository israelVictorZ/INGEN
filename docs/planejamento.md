# Planejamento INGEN

> Arquivo único de pendências e prioridades. Substitui `roadmap.md`, `melhorias.md`, `fase-2-o-que-melhorar.md` e `fase-2-ingen-lives.md`.
> Atualizado em 15/11/2026 (ajustes de uso no celular: aviso de live fechado por padrão; chamada da Copa Rift Masters na home, item 3 da Onda 2; categoria "Em teste" no elenco, item 2; times renomeados para INGEN Aces e INGEN Jokers, item 1; Onda 2 com ordem própria; draft sem sugestões de pick e ban; agenda no longo prazo; Discord e Rift Masters 2ª edição fora do planejamento do site). Site: https://ingengg.com.br
>
> Referência técnica que continua em arquivos próprios: [`arquitetura.md`](arquitetura.md), [`design.md`](design.md), [`stream-pack.md`](stream-pack.md).

### Como manter este arquivo (vale para toda conversa)
1. **Ler no início** de cada sessão, antes de qualquer trabalho.
2. **Tarefa concluída:** marcar aqui (tirar da onda, registrar no Apêndice D e na linha do tempo, Apêndice E), inclusive o que for feito fora do código (Vercel, Registro.br, OBS...).
3. **Tarefa nova ou mudança de prioridade:** apresentar ao Israel primeiro; só entra aqui depois de aprovada.
4. **PDF de acompanhamento:** atualizar `docs/pdf/planejamento.html` com as mesmas mudanças e rodar `npm run docs:pdf`. O PDF sai em `docs/INGEN-planejamento.pdf` da pasta principal (fora do git), mesmo rodando de uma sessão isolada.

**Esforço:** **P** = até 1 h · **M** = algumas horas · **G** = 1 dia ou mais.
Os números entre `#` são os do mapeamento original de melhorias (11/11/2026) e foram mantidos para referência.

---

## 1. Situação atual

### No ar
- **Home** animada, com faixa "Ao vivo agora".
- **Redes oficiais** no menu, no rodapé e nos dados estruturados: Twitch, Discord, Instagram ([@ingen.gg](https://www.instagram.com/ingen.gg/)), YouTube ([@ingengg](https://www.youtube.com/@ingengg)) e X ([@ingen_gg](https://x.com/ingen_gg)), sempre em nova aba.
- **Elenco** com o Mapa do Rift, os dois times (INGEN Aces e INGEN Jokers), reservas, jogadores em teste e vagas abertas apontando para o Discord.
- **Nomes dos times:** INGEN Aces (antiga Black) e INGEN Jokers (antiga Silver), definidos num mapa só (`src/lib/teams.ts`). Endereços novos `/scouting/aces`, `/scouting/jokers`, `/elenco#aces` e `/elenco#jokers`; os antigos (`/scouting/black`, `/scouting/silver`, `#black`, `#silver`) continuam funcionando. Por dentro (banco, `?time=` dos overlays, classes CSS) os ids seguem `black` e `silver`, então reverter é dar `git revert` ou trocar o mapa.
- **Em teste:** jogadores em teste em cada time, com a mesma exibição e funcionamento das reservas e a etiqueta "Em teste" (bloco próprio no elenco e no scouting, rótulo no ranking e no Comparar). Cadastro com `npm run manage -- trial:add` (skill `ingen-reserva`). Hoje: Blackzera e Galo Soviético, TOP da INGEN Aces.
- **Copa Rift Masters na home (temporária):** faixa com a logo e o roxo do campeonato, estreia (seg. 16/11, 20h) e botões para a Twitch (`riftmasters_`) e o site do campeonato. Liga e desliga em `src/lib/rift-masters.ts` (`enabled`).
- **Perfil do jogador:** gráfico de elo, métricas com a posição entre os jogadores da INGEN, vitórias × derrotas, tendência, contexto (lado do mapa e duração), runa-chave mais usada, mapa de calor "Quando joga", forma, recordes, campeões, confrontos de lane, duo, partidas detalhadas, selo e botão da Twitch, imagem de compartilhamento.
- **Comparar** jogadores (inclusive entre times), com layout próprio no celular.
- **Scouting** por time: op.gg multi, Discord, PDF legível, bans sugeridos, picks com confiança, pontos fortes, confrontos difíceis, data e patch do relatório.
- **Ranking** interno, com destaques da semana e gráfico de elo de todos (com filtro de período).
- **Kit de stream** interno (`/stream` e `/stream/ajuda`): 8 overlays animados alimentados pelo banco e um guia para leigos. **Testado no OBS e funcionando.** Teste de alerta direto no OBS pelo chat: `!testealerta` (dono do canal e mods) ou `?teste=raid` no link; no card de alertas do kit, cada botão copia o comando do seu alerta.
- **Domínio próprio:** https://ingengg.com.br (o `www` e as páginas do antigo `ingen-three.vercel.app` redirecionam para ele; `/api` e `/stream` seguem respondendo nos dois, para não quebrar overlays já configurados).
- **SEO:** sitemap, robots, canônicos, imagens de compartilhamento e dados estruturados, no domínio oficial.
- **Confiabilidade:** páginas de erro amigáveis, página 404 "Fora do mapa", rodapé com "Dados atualizados há X" e aviso quando o sync para.
- **Acessibilidade:** contraste revisado, foco visível e animações respeitando "reduzir movimento" (inclusive o tilt dos cards).
- **Notícias:** prontas, mas **ocultas** por decisão do time (`FEATURES.news` em `src/lib/features.ts`).

### Onda 1 (no ar desde 13/11/2026, homologada pelo Israel; 100% concluída)
- **Redes oficiais completas (#39):** YouTube e X entram no menu (ícones no desktop, botões no celular), no rodapé e no `sameAs` do JSON-LD, ao lado de Twitch, Discord e Instagram.
- **Radar do Comparar por lane (#5):** cada eixo é medido pela referência da lane do jogador (`src/lib/lane-ref.ts`, a mesma do scouting), com anel tracejado no "nível alto da lane", legenda e quadro com os valores de cada eixo (mouse, toque ou teclado).
- **Vercel Web Analytics (#48):** componente no layout; **ativado no painel da Vercel** e contando desde a publicação (13/11).
- **Dicas (i) nas métricas (#35):** glossário em `src/lib/glossary.ts`; aparece no perfil, no Comparar, na tabela de campeões e no ranking.
- **Tilt dos cards com "reduzir movimento" (#37):** sem tilt nem parallax; a troca de skin (só esmaecer) continua.
- **Tabela de campeões ordenável (#33):** clique no cabeçalho ordena (de novo inverte) e filtro "Só de <lane>".
- **Live embutida no perfil (#34):** player da Twitch no topo do perfil enquanto o jogador está ao vivo; o aviso flutuante não repete a mesma live nessa página.
- **Card do elenco mais rico (#22):** últimas 5, "Jogou há X" e PDL nas últimas 24 h (só se jogou nas últimas 24 h). O selo "Ao vivo" desceu para a linha do campeão, acima do nome.
- **Forma recente no scouting (#18):** últimas 10 e variação de PDL em 7 dias em cada jogador; o "Copiar para Discord" também leva as últimas 10.
- **Setas de posição no ranking (#27):** ▲▼ contra a posição de 7 dias atrás (pelo histórico de elo).

### Infraestrutura
- **Sync automático** no GitHub Actions a cada 5 min, em modo sonda: só acorda o banco (Neon) quando algo mudou ou a cada 6h.
- **Banco dorme quando nada muda:** o site só relê o banco quando o sync avisa que há dado novo (`/api/revalidate`); o selo "Ao vivo" lê os canais de um arquivo; os overlays leem dados guardados. Assim o Neon fica dentro da cota gratuita de horas.
- **Riot:** Personal API Key **definitiva** (não expira). Resolve o antigo P0 #2a.
- **Twitch:** configurada (app, Client ID/Secret na Vercel e no GitHub). Canais de Clyde, Czar, Coelho e Nacht cadastrados.
- **Skills de chat** para gerenciar o elenco sem painel: `ingen-jogador`, `ingen-reserva`, `ingen-twitch`.

### Coleta de dados nova (13/11/2026)
O sync passou a gravar o que as próximas funcionalidades vão precisar, para o histórico já ir se acumulando:

| Tabela / campo | O que guarda | Alimenta |
|---|---|---|
| `match_participants` (novos campos) | Vantagem de ouro/XP e CS contra o oponente de rota, nível de vantagem, dragões, barões, arautos, vastilarvas e torres; `challenges` completo da Riot (~120 métricas) | #8, #9, #10, #11, Fase 2 |
| `match_players` | Os 10 participantes de cada partida: campeão, KDA, itens, feitiços, runas | #12, #14, #31 |
| `match_teams` | Cada lado: vitória, bans e objetivos | #9, Fase 2 |
| `match_timelines` | Ouro/XP/CS aos 5/10/15/20 min, abates com posição e tempo, objetivos com tempo, ordem de itens e de skills | #8, #12, Fase 2 (2d) |
| `live_sessions` | Histórico de lives: início, fim, título, jogo, pico de espectadores | #28, #29 |

As partidas antigas foram completadas com `SYNC_BACKFILL=1 npm run sync`.

---

## 2. Ordem de prioridade

A ordem leva em conta: o que está errado primeiro, depois o que entrega mais com menos esforço, e por fim o que depende de decisões ou de terceiros.

### Onda 1 · Correções e ganhos rápidos (1 a 2 dias)

**100% concluída** em 13/11/2026 (#5, #48, #35, #37, #33, #34, #22, #18, #27 e #39); ver "Onda 1" na seção 1. Nada pendente.

### Onda 2 · Prioridades do grupo (aprovadas em 13/11/2026; ordem revista em 15/11/2026)

Ideias levantadas pela staff no grupo (Murillo, Atlas, Israel e Lari) e aprovadas pelo Israel como próxima etapa; tudo o que vinha depois desceu uma onda. Os números `I..` são os do PDF "Ideias do grupo" (`docs/INGEN-ideias.pdf`, gerado com `npm run docs:pdf -- ideias` a partir de `docs/pdf/ideias.html`). Este planejamento cobre só o que é feito no site e no kit de stream: a organização do Discord, os bots e impulsos do servidor e a 2ª edição do Rift Masters ficam no PDF de ideias.

**Ordem de execução** (definida pelo Israel em 15/11/2026). Os itens 1, **novos nomes dos times (I16)**, 2, **categoria "Em teste"**, e 3, **CTA do Rift Masters na home (I05)**, foram concluídos em 15/11/2026 (ver Apêndice D):

| Ordem | # | Item | Esforço |
|---|---|---|---|
| 4 | — | **Draft INGEN: criação e polimento.** Sistema de pick & ban próprio, pensado para ser transmitido, com interface amigável e personalizável: fases no formato oficial (3 bans, 3 picks, 2 bans, 2 picks) com cronômetro opcional; **logo e cor de cada um dos dois times**, com a tela se adaptando à cor; busca de campeão por nome e filtro por lane, com splash arts do Data Dragon; visual da INGEN e animações de pick e ban; **modo transmissão** (link limpo, sem controles, como fonte do OBS); configuração da partida em poucos passos. Sem banco: os logos ficam no navegador. | G |
| 5 | — | **Coleção de cenas do OBS para importar** (veio da Onda 7): botão que baixa um `.json` de Scene Collection com as 5 cenas (Começando, Lobby, Partida, Pausa, Fim), fontes posicionadas e links do jogador. A instalação cai de ~15 min para ~1 min. | M |
| 6 | I01–I04 | **Novos assets do kit de stream:** meta definível, de inscritos, seguidores ou doações (I01); contorno para o LivePix e espaço para ele na tela de lobby, removível como a câmera (I02); verificar se a música do Spotify pode aparecer na tela, o que depende da conta do streamer autorizar o acesso (I03); música nas telas "Já vai começar", "Volto já" e "Encerramento", reaproveitando o I03 se ele for viável (I04). | G |

Os itens 5 e 6 entram no kit de stream (`public/stream`); rodar `node scripts/build-stream-se.mjs` ao mexer em `public/stream/core`.

### Onda 3 · Draft INGEN: drafts salvos

**Decidido em 15/11/2026:** o draft não terá sugestão de picks pela pool dos jogadores nem sugestão de bans. Seria injusto com os times visitantes, que não têm esse apoio, e a sugestão de bans só serviria ao adversário, dispensando o estudo que ele mesmo deveria fazer.

- **Salvar drafts** (scrims e jogos) para analisar depois.
- **A decidir pelo Israel:**
  - *Exportar imagem:* gerar um PNG do draft pronto (picks e bans dos dois times, com logos e cores) para postar no Discord ou nas redes.
  - *Sala compartilhada:* cada capitão escolhe os próprios picks e bans pelo seu link, em tempo real, em vez de uma só pessoa operar o draft dos dois times.
- **Depende de:** o draft da Onda 2 pronto; o salvamento usa o login da Onda 5.

### Onda 4 · Perfil com os dados novos (2 a 3 dias)

A coleta já começou; esta onda só mostra o que está sendo gravado.

| # | Item | Esforço |
|---|---|---|
| 8 | **Diferença contra o adversário de lane:** ouro, XP e CS aos 10 e 15 min. É o dado mais pedido em análise de jogador. | M |
| 9 | **Participação em objetivos:** dragões, arauto, vastilarvas, barão e torres. Essencial para JG e SUP. | M |
| 10 | **Métricas por lane:** JG (abates antes dos 10 min, objetivos, CS de selva), SUP (visão, wards), ADC (dano/min, % do dano), TOP (abates solo, placas), MID (dano, roams). | M |
| 11 | **Comparação com a média da lane** ao lado de cada métrica (seta e %). A posição entre os jogadores da INGEN (1º, 2º...) já existe, e as referências por lane já estão em `src/lib/lane-ref.ts`. | P |
| 12 | **Builds e ordem de skills** mais usadas por campeão. A runa-chave mais usada já aparece. | M |
| 14 | **Placar completo** da partida (os 10 jogadores) ao expandir a linha. | M |
| 15 | **Gráfico de elo do perfil com eventos** (promoções e quedas) e filtro de período. O gráfico do ranking já tem filtro. | M |

### Onda 5 · Login único e área interna (1 a 2 dias)

Um só sistema de acesso para três áreas que hoje estão planejadas separadamente: `/stream` (kit), `/interno` (Fase 2) e `/admin` (painel).

- Login com usuário e senha criados pelo dono do site (sem cadastro aberto); Discord pode vir depois.
- Detalhes técnicos no Apêndice A.
- Logo depois: **senha no kit de stream** (antes de divulgar o kit para mais gente).

### Onda 6 · Fase 2 "O que melhorar" (área interna)

Fraquezas, recomendações e metas por jogador, só para a staff. Plano completo no Apêndice A.

1. **2a:** página do time ("como nos banem", lanes vulneráveis) e página por jogador no formato fraqueza → evidência → o que treinar.
2. **2b:** referências por lane e elo, partidas para revisar, pool e confrontos.
3. **2c:** metas, notas da staff, antes × depois, papel `jogador`.
4. **2d:** timeline (ouro e CS aos 10/15 min, mortes cedo, ganks × duelos). **Desbloqueada:** a Personal Key já está ativa e as timelines já estão sendo gravadas.

### Onda 7 · Kit de stream, fase 2

Plano completo no Apêndice B. A fase 1 já foi testada no OBS e funciona, e o teste de alerta pelo chat já está pronto. A coleção de cenas do OBS, a meta, o LivePix e a música (I01 a I04) foram antecipados para a Onda 2. Ordem:
1. **Placar do dia** (vitórias/derrotas, PDL e sequência; dados prontos).
2. Câmera cheia e transição (stinger).
3. "Jogando com", painéis e imagem offline da Twitch.
4. Página "Novidades do kit" e melhorias do guia.

### Onda 8 · Painel admin

Cadastrar, editar e remover jogadores, vagas e notícias sem mexer no banco. Até lá, as skills de chat resolvem. Detalhes no Apêndice C.

### Onda 9 · Engajamento automático

| # | Item | Esforço |
|---|---|---|
| 28 | **Destaques automáticos na home:** maior subida, partida da semana, primeira penta, quem entrou ao vivo. | M |
| 29 | **Feed de atividades** gerado pelo sync ("Coelho subiu para Esmeralda IV"). Substitui as notícias enquanto estão ocultas. | M |
| 26 | **Ranking:** alternar Solo/Duo e Flex e novos quadros (KDA, partidas, visão). | M |
| 45 | **Clipes da Twitch** e vídeos do YouTube no perfil. | M |

### Onda 10 · Elenco, scouting e comparar

| # | Item | Esforço |
|---|---|---|
| 16 | **Foto, bio e redes** no perfil (campos já existem; preencher depende do admin ou das skills). | P |
| 23 | **Ex-jogadores:** seção "Já defenderam o escudo", com período e lane. | M |
| 24 | **Staff:** capitão, coach, analista e manager (tabela nova). | M |
| 20 | **Imagem de compartilhamento do scouting** com os 5 jogadores e o elo. | M |
| 21 | **Scouting em inglês** (botão PT/EN). | M |
| 31 | **Confronto direto** entre os dois jogadores comparados. | M |
| 32 | **Imagem compartilhável do duelo** (os dois jogadores e o radar). | M |

### Onda 11 · Longo prazo

| # | Item | Esforço |
|---|---|---|
| 43 | **Campeonatos:** página de campeonatos, próximos jogos na home, resultados. A agenda é o I15, logo abaixo. | G |
| I15 | **Sistema de agenda:** treinos, scrims, jogos e lives num lugar só, para os times e a comunidade (ideia do Atlas). Traz para cá a parte "agenda" do #43. Estava na Onda 2 e veio para cá em 15/11/2026; muda de lugar se for preciso. | G |
| 44 | **Recrutamento com formulário** e webhook para o Discord. | M |
| 36 | **Desempenho:** splash arts menores, lazy loading, Lighthouse 90+ no celular. | M |
| 50 | **Testes e CI:** testes dos cálculos e build a cada push, antes do deploy. | M |
| 49 | **Logo em SVG** para animar torres, escudo e letras separadamente. | M |
| — | **Reativar notícias** (`FEATURES.news = true`) quando o time quiser. | P |
| I17 | **Vídeos e cursos de fundamentos:** sistema de upload para a comunidade (ideia do Atlas). | G |

---

## 3. Decisões e dependências pendentes

- **Logo vetorial:** o arquivo atual é WebP com fundo escuro. Precisamos de SVG com fundo transparente, ou aprovar um redesenho fiel em vetor. Confirmar também se os dois risquinhos verdes abaixo do escudo fazem parte do símbolo.
- **Login:** usuário e senha agora, Discord depois? (Recomendado: usuário e senha, mais simples e sem depender de app no Discord.)
- **Flex e Clash:** hoje o sync grava só Solo/Duo. Gravar também Flex (440) e Clash (700) traria os jogos do time junto, úteis para o draft, "Jogando com" e campeonatos. Custa mais chamadas à Riot; o site já filtra Solo/Duo nas estatísticas.

---

## Apêndice A · Login e área interna "O que melhorar"

### Por que existe
O `/scouting/<time>` é **público**: é o link que mandamos para os adversários. Por isso ele só mostra elo, estatísticas, picks e pontos fortes. O que entrega o time (fraquezas, confrontos ruins, quem está em fase ruim, o que banir contra nós) fica numa área **interna**, onde cada ponto fraco vem com **o que fazer** e **como medir**.

### Acesso
- **Rotas:** `/interno/melhorar` e `/interno/melhorar/<slug>`. Fora do menu, do sitemap e do `robots`, com `noindex, nofollow`.
- **Usuário e senha** criados pelo dono do site.
  - Tabela `staff_users`: usuário, hash da senha (argon2 ou bcrypt), papel (`staff` ou `jogador`) e `player_id` para jogador.
  - Sessão em cookie `httpOnly` + `secure` + `sameSite=lax`, assinado (JWT com `jose`), validade de 7 dias. Modelo do guia de autenticação do Next 16 (`node_modules/next/dist/docs/01-app/02-guides/authentication.md`).
  - Senha com no mínimo 10 caracteres, tentativas limitadas por IP (5 a cada 15 min), erro genérico.
  - Usuário inicial criado por `npm run manage -- staff:add --user X`, que pede a senha no terminal. Senhas nunca vão para o repositório.
- **Duas camadas:**
  1. `src/proxy.ts` (no Next 16 o `middleware` se chama **proxy**): checagem otimista do cookie; sem sessão, redireciona para `/interno/entrar`.
  2. `src/lib/dal.ts` com `verifySession()` em toda página, Server Action e Route Handler protegidos.
- **Papéis:** `staff` vê o time todo; `jogador` (opcional) vê só a própria página.
- **Cache:** páginas dinâmicas por usuário, fora do cache público.

### Conteúdo
**Visão do time:** como nos banem (`teamSummary().bans`), lanes vulneráveis, mapa de calor de horário, duos que ganham ou perdem juntos, dependência de um jogador.

**Página de cada jogador**, no formato: **fraqueza → evidência (número, amostra, período) → por que importa → o que treinar → meta mensurável**.

| Área | Sinais | Exemplo de recomendação |
|---|---|---|
| Sobrevivência | mortes/partida, KDA, sequência de derrotas | "7,1 mortes. Revisar as 3 partidas com mais mortes. Meta: < 5,5 nas próximas 20." |
| Farm | CS/min vs. referência da lane, CS aos 10 | "6,1 CS/min (MID: 6,8–8). Last hit 10 min/dia. Meta: 7,0." |
| Visão | visão/min, wards, control wards | "0,4 visão/min. Control ward a cada base. Meta: 0,7." |
| Presença | KP, % do dano | "41% de KP: rotacionar após o primeiro dragão." |
| Pool | concentração, campeões ruins com volume alto | "Parar de jogar X (38% em 13 jogos); focar em Y e Z." |
| Confrontos | matchups negativos (2+ jogos) | "2-6 contra Yasuo: estudar ou banir." |
| Contexto | lado do mapa, duração, horário | "20 pontos a menos no lado vermelho." |
| Forma | últimas 10 × anteriores | "3 de 10. Pausa após 2 derrotas seguidas." |
| Rota (novo) | ouro/XP/CS aos 10 e 15 vs. oponente, mortes antes dos 10 | "−600 de ouro aos 10 em média. Meta: empate." |

- **Fonte:** `scoutRead()` em `src/lib/scouting.ts` já gera `weaknesses`, `ban` e `tough`.
- **Amostra mínima:** 5 partidas; cada item mostra o tamanho da amostra.
- **Partidas para revisar:** as 3 que melhor ilustram cada fraqueza.

**Acompanhamento:** metas com prazo (`improvement_goals`), notas da staff (`coach_notes`), antes × depois (janela atual × 30 dias atrás).

### Cuidados
- O scouting público **nunca** importa componentes da área interna.
- Toda escrita (metas, notas) passa por Server Action com `verifySession()` e validação Zod.

---

## Apêndice B · Kit de stream, fase 2

A fase 1 está no ar: `/stream`, `/stream/ajuda`, overlays em `public/stream/` e `GET /api/stream`. Detalhes em [`stream-pack.md`](stream-pack.md).

| Prioridade | Item | O que é |
|---|---|---|
| Onda 2 | **Coleção de cenas do OBS** | Botão que baixa um `.json` de Scene Collection com as 5 cenas (Começando, Lobby, Partida, Pausa, Fim), fontes posicionadas e links do jogador. |
| P1 | **Senha** | Para `/stream` e `/stream/ajuda`, em `src/app/stream/layout.tsx` (usa o login da Onda 5). |
| P1 | **Novidades do kit** | Lista de mudanças com data e "precisa copiar o link de novo?". |
| P2 | **Placar do dia** | Vitórias/derrotas do dia, PDL e sequência (`lpToday`, `form`, `streak`; só expor no `/api/stream`). |
| P2 | **Transição (stinger)** | Escada de pixels + logo cruzando a tela; HTML e, se possível, WebM transparente. |
| P2 | **Câmera cheia** | Cena "só conversa" com moldura grande, nick, time, redes e chat. |
| P2 | **"Jogando com"** | Banner com o duo ou o time na partida. |
| P2 | **Painéis e offline da Twitch** | Painéis de 320 px e imagem offline, exportados em PNG. |
| P3 | **Guia** | GIF por passo do OBS, checklist "antes de entrar ao vivo", imagem de cada cena. |

**Atenção:** rodar `scripts/build-stream-se.mjs` sempre que mexer em `public/stream/core`. Molduras sobre vídeo nunca recortam o canto.

---

## Apêndice C · Painel admin

- **Rota** `/admin`, fora do menu, `noindex`, com o login da Onda 5 e uma lista de admins editável.
- **Jogadores:** adicionar só com o Riot ID (`Nome#TAG`) + time + lane (valida na Riot e grava o PUUID); editar nome, foto, bio e redes; trocar de time ou lane preservando o histórico (`left_at` + nova participação); remover vira "ex-jogador".
- **Vagas:** abrir e fechar por time e lane.
- **Notícias** (quando reativadas): criar, editar, fixar, despublicar.
- **Ações rápidas:** "Atualizar dados agora" (dispara o workflow de sync) e "Limpar cache do site" (`revalidateTag("site")`).
- **Técnica:** Server Actions com Zod, `revalidateTag("site")` em toda alteração, log de auditoria (`admin_log`).

---

## Apêndice D · Já resolvido (histórico)

- Scouting: "Salvar PDF" com CSS de impressão próprio (#1).
- Rodapé com "Dados atualizados há X" e aviso de sync parado (#2b); Personal Key definitiva (#2a).
- `error.tsx` e `global-error.tsx` (#3).
- Mapa do Rift: rótulos dos cantos para dentro no celular (#4).
- Amostras pequenas: winrate ajustado e "poucos jogos" (#6).
- Contraste do `--gray-dim` e foco visível (#7).
- Scouting: bans sugeridos, picks com confiança, pontos fortes e fracos, confrontos difíceis, data e patch (#17, #19).
- Ranking: destaques da semana e gráfico de elo de todos (#25).
- Comparar no celular lado a lado (#30).
- SEO completo (#38); hero no celular (#40).
- Página 404 "Fora do mapa" (#41).
- Mapa de calor "Quando joga" no perfil (#13); posição entre os jogadores da INGEN em cada métrica (parte do #11); runa-chave mais usada (parte do #12).
- Animações respeitando "reduzir movimento": letreiro, transição de pixels, hero e Mapa do Rift (#37, menos o tilt).
- Domínio próprio `ingengg.com.br` (#47), com SEO e redirecionamento do endereço antigo.
- Kit de stream testado no OBS; teste de alerta direto no OBS pelo chat (`!testealerta`), com os botões do kit copiando o comando.
- Redes oficiais completas (#39): Instagram (@ingen.gg), YouTube (@ingengg) e X (@ingen_gg) no menu, no rodapé e nos dados estruturados, com Twitch e Discord.
- PDF de acompanhamento regenerável por qualquer sessão (`npm run docs:pdf`).
- PDF "Ideias do grupo" com as 22 ideias da staff organizadas por prioridade e frente (`npm run docs:pdf -- ideias`).
- Banco Neon dormindo quando nada muda (aviso do sync, canais em arquivo, overlays com dados guardados).
- Twitch: selo "Ao vivo", botão no perfil, faixa na home, canais cadastrados.
- Links de recrutamento apontando para o Discord.
- Reservas dos times no elenco; links externos em nova aba.
- Kit de stream fase 1.
- Gráfico de elo em degraus; remakes fora das estatísticas; contagem animada mostrando o valor real.
- Sync a cada 5 min em modo sonda; coleta de dados para as próximas fases (13/11/2026).
- Kit de stream: selos do chat legíveis no tema Silver (o NOVO e o STREAMER ficavam com letra preta em fundo escuro).
- Onda 1 (13/11/2026, homologada e no ar): radar por lane (#5), Vercel Analytics no código e ativado no painel (#48), dicas (i) nas métricas (#35), tilt com "reduzir movimento" (#37 completo), tabela de campeões ordenável (#33), live embutida no perfil (#34), card do elenco mais rico (#22), forma recente no scouting (#18), setas no ranking (#27).
- Novos nomes dos times (I16, item 1 da Onda 2, 15/11/2026): INGEN Black → INGEN Aces e INGEN Silver → INGEN Jokers no site, SEO, imagem de compartilhamento, overlays, widget do StreamElements, skills e docs. Mapa único em `src/lib/teams.ts` (cópia em `public/stream/core/ingen.js`); endereços novos com redirecionamento temporário (307) dos antigos; `npm run manage` aceita `--team aces|jokers`.
- Categoria "Em teste" (item 2 da Onda 2, 15/11/2026): um tipo de reserva (coluna `kind` em `team_reserves`, migração 0004) com o rótulo "Em teste" no elenco, scouting, ranking, Comparar e texto do Discord; `npm run manage -- trial:add|trial:remove`. Primeiros em teste: Blackzera (Blackzera#BLK) e Galo Soviético (Galo Soviético#Ronin), TOP da INGEN Aces.
- CTA do Rift Masters na home (I05, item 3 da Onda 2, 15/11/2026): faixa da Copa Rift Masters 2026 logo após o letreiro, com logo, estreia e links para a Twitch e o site do campeonato; desliga com `enabled: false` em `src/lib/rift-masters.ts`.
- Ajustes de uso no celular (15/11/2026, pedido do capitão): o aviso flutuante da live começa fechado (só a pílula "Ao vivo") e o "–" virou o botão "Fechar"; ícone da Twitch do topo, dicas (i) e botões do gráfico de elo do ranking (período e legenda; tocar na legenda liga e desliga o destaque) com área de toque maior; no gráfico, um ponto marca o início de quem passou a ser acompanhado depois (ex.: jogadores em teste) e os nomes longos cabem no fim das linhas; o eixo de tempo vai até o registro mais recente (a linha de quem foi sincronizado sozinho saía do gráfico, por cima dos nomes) e os nomes ficam centrados nas suas linhas; gráfico mais alto (440px), fios ligando cada linha ao seu nome e, ao destacar um jogador, o nome vai para a altura exata da linha. Varredura rápida no celular sem rolagem lateral em nenhuma página.

---

## Apêndice E · Linha do tempo

Montada a partir do histórico do git e das conversas com o Claude. Horários de Brasília.

| Quando | O quê | Onde |
|---|---|---|
| 10/11 | Estrutura do projeto, direção visual e arquitetura | git |
| 11/11 madrugada | **Fase 1 no ar:** home, elenco com Mapa do Rift, perfil, comparar, scouting, ranking e página 404 "Fora do mapa" | git |
| 11/11 tarde | Sync automático, perfil completo, Twitch ao vivo, sync a cada 5 min em modo sonda, skills de elenco e Twitch | git |
| 11/11 noite | Twitch e Discord do time, troca de nick em minutos, SEO completo, ranking com destaques, scouting com leitura automática | git |
| 12/11 tarde | Reservas no elenco, links externos em nova aba, **kit de stream** (overlays e guia) | git |
| 12/11 noite | Entra Hero (MID, INGEN Silver); canal da Twitch de Nacht; sync contínuo no Actions | git |
| 12/11 noite | **Compra e ligação do domínio `ingengg.com.br`** (Registro.br + Vercel) | conversa "Compra do domínio" (fora do git) |
| 12–13/11 | Kit de stream testado no OBS | teste do time (fora do git) |
| 13/11 madrugada | Personal API Key definitiva da Riot | GitHub e `.env` (fora do git) |
| 13/11 madrugada | Banco dorme quando nada muda: canais em arquivo, site relê só com aviso do sync, overlays com dados guardados | conversa "Neon como banco de dados" |
| 13/11 madrugada | Coleta de dados nova (placar dos 10, bans e objetivos, timeline, vantagem de rota, histórico de lives) e backfill das 483 partidas; planejamento único e PDF | conversa "Planejamento" |
| 13/11 madrugada | Domínio oficial no SEO e redirecionamento do endereço antigo; teste de alerta pelo chat | conversa "Planejamento" |
| 13/11 madrugada | Instagram oficial no site; botões do card de alertas copiam o comando de teste; PDF regenerável (`npm run docs:pdf`) e regra de manter este arquivo atualizado | conversa "Planejamento" |
| 13/11 | **Onda 1 concluída no código:** radar por lane, Analytics, dicas nas métricas, tilt com "reduzir movimento", tabela ordenável, live no perfil, card do elenco, forma no scouting e setas no ranking. #39 parado até o time confirmar X e YouTube. Analytics ativado no painel da Vercel | branch `feat/ajustes-v1` e Vercel |
| 13/11 | Homologação da Onda 1 pelo Israel e **publicação** (`main` → Vercel); Analytics passa a contar | git e Vercel |
| 13/11 | Kit de stream: selos do chat (NOVO, STREAMER, VIP, MOD) voltam a ter a própria cor no tema Silver (o NOVO ficava com letra preta em fundo escuro) | git |
| 13/11 | **Ideias do grupo** (Murillo, Atlas, Israel e Lari) organizadas no PDF "Ideias do grupo" e aprovadas como **Onda 2**: draft para a live, stream assets e CTA do Rift Masters até 16/11, depois o Discord e a agenda. As demais ondas desceram uma posição | conversa "Ideias do grupo" e grupo da staff |
| 13/11 | **Onda 1 100% concluída:** YouTube (@ingengg) e X (@ingen_gg) no menu, no rodapé e no JSON-LD (#39), com os links confirmados pelo time; publicado (`main` → Vercel) | git e Vercel |
| 15/11 | **Planejamento revisto pelo Israel:** a Onda 2 ganha ordem própria (nomes Aces e Jokers, categoria "Em teste", CTA do Rift Masters na home, draft, coleção de cenas do OBS e novos assets do kit); a agenda vai para o longo prazo; a organização do Discord, os avisos e bots do Discord, os impulsos do servidor e a 2ª edição do Rift Masters saem do planejamento do site (seguem no PDF de ideias); o draft fica sem sugestões de pick e ban, e a Onda 3 passa a ser salvar drafts | conversa "Nomes dos times" |
| 15/11 | **Times renomeados:** INGEN Black vira **INGEN Aces** e INGEN Silver vira **INGEN Jokers** (site, overlays, StreamElements, skills e docs), com endereços novos e os antigos redirecionando; publicado (`main` → Vercel) | branch `feat/times-aces-jokers` e Vercel |
| 15/11 | **Categoria "Em teste"** no elenco (mesma funcionalidade das reservas, rótulo próprio); migração no banco (Neon); entram em teste Blackzera e Galo Soviético, TOP da INGEN Aces; publicado (`main` → Vercel) | branch `feat/em-teste`, Neon e Vercel |
| 15/11 | **Chamada da Copa Rift Masters 2026** na home (estreia seg. 16/11, 20h; Twitch e site do campeonato); publicado (`main` → Vercel) | branch `feat/cta-rift-masters` e Vercel |
| 15/11 | **Ajustes de uso no celular:** aviso da live fechado por padrão (cobria a tela no celular do capitão), botão "Fechar" e áreas de toque maiores (topo, dicas e gráfico do ranking); publicado (`main` → Vercel) | branch `fix/ux-live-celular` e Vercel |

**Por que alguns itens pareciam "perdidos":** a página 404 existe desde a fase 1, mas o mapa de melhorias de 11/11 a listou como pendente. O domínio foi configurado fora do repositório (Registro.br e Vercel), então não aparece no git. A partir de agora, este arquivo é a fonte única (ver "Como manter este arquivo", no topo).
