# Planejamento INGEN

> Arquivo único de pendências e prioridades. Substitui `roadmap.md`, `melhorias.md`, `fase-2-o-que-melhorar.md` e `fase-2-ingen-lives.md`.
> Atualizado em 19/11/2026 (primeira leva de ajustes finos de interface publicada; draft para scrims (item 4 da Onda 2) concluído; link fixo de transmissão do draft entra como item 5 da Onda 2, e os itens do kit de stream passam a 6 e 7; Mapa do Rift do elenco sem nomes sobrepostos na bot lane, publicado; página "Sobre a organização" em `/sobre`, com resumo na home, aprovada pelo Israel e publicada; em 17/11/2026: medição do Ably depois dos 5 primeiros jogos da Copa Rift Masters: 50 usuários no mês, contra ~73 sem a contagem por aparelho; chamada da Copa Rift Masters na home aponta para o domínio próprio do campeonato, https://www.riftmasters.com.br/; em 16/11/2026: Ably conta um usuário por aparelho, para o draft da Copa Rift Masters caber no plano grátis; levantamento dos planos grátis de Vercel, Neon e Ably na seção Infraestrutura; em 15/11/2026: draft para scrims construído na branch `feat/draft-scrims`, em validação e ainda fora do ar, item 4 da Onda 2; ajustes de uso no celular: aviso de live fechado por padrão; chamada da Copa Rift Masters na home, item 3 da Onda 2; categoria "Em teste" no elenco, item 2; times renomeados para INGEN Aces e INGEN Jokers, item 1; Onda 2 com ordem própria; draft sem sugestões de pick e ban; agenda no longo prazo; Discord e Rift Masters 2ª edição fora do planejamento do site). Site: https://ingengg.com.br
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
- **Sobre a organização** (`/sobre`): "Ninguém melhora sozinho", a ideia do time (o acerto de um é mérito de cinco, o erro de um é problema de cinco), o dia a dia do grupo com os números do elenco, o lema **Sic Parvis Magna** ("a grandeza vem dos pequenos começos") e chamada para o Discord. Resumo na home (seção 03 "A organização"), "Sobre" no menu e no rodapé, lema no rodapé e no JSON-LD.
- **Copa Rift Masters na home (temporária):** faixa com a logo e o roxo do campeonato, estreia (seg. 16/11, 20h) e botões para a Twitch (`riftmasters_`) e o site do campeonato. Liga e desliga em `src/lib/rift-masters.ts` (`enabled`).
- **Draft para scrims** (`/draft`, link no rodapé): sala compartilhada em tempo real (Ably), link de 32 h, séries de 1 a 5 jogos, fearless ou livre, drafter e espectadores por time e espectador neutro para transmissão. Em uso nos jogos da Copa Rift Masters desde 16/11.
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
- **Planos grátis e limites (levantamento de 16/11/2026, painéis lidos no dia):** Vercel Hobby (30 dias: 23 min das 4 h de CPU ativa, 11 mil de 1 milhão de funções, 64 mil de 1 milhão de requisições, 22 mil de 200 mil gravações de cache; estourar bloqueia o recurso até fechar 30 dias e não dá para comprar mais; uso não comercial pelos termos); Neon Free (projeto `ingen` em novembro: 14 de 100 CU-horas, 43 MB de 1 GB, 438 MB de 5 GB de tráfego; estourar horas ou tráfego desliga o banco até o mês seguinte; restauração só das últimas 6 h); Ably Free (7 de 500 usuários ativos no mês, 707 mensagens em 24 h de 6 milhões por mês; passar de 500 usuários pode degradar o serviço até o mês seguinte, e aí o draft volta sozinho às consultas). Pagos, se precisar: Vercel Pro US$ 20/mês; Neon Launch por uso (~US$ 5/mês no uso atual); Ably Pro US$ 29 a 35/mês.
- **Ably conta um usuário por aparelho** (16/11/2026): o clientId do Ably é um id guardado no navegador (igual em todas as abas), não mais um por aba. Com isso, a fase de grupos da Copa Rift Masters (28 partidas MD1, ~11 telas cada), que podia passar de 300 usuários contando abas, fica em ~50 a 80 aparelhos no mês. **Medido em 17/11/2026**, depois dos 5 primeiros jogos (6 times, 3 casters): 50 usuários no mês no Ably (eram 8 antes da estreia). Somando cada entrada como nova, seriam ~73. Média de 148 mensagens por usuário (~7,4 mil no mês, de 6 milhões).
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

**Ordem de execução** (definida pelo Israel em 15/11/2026). Os itens 1, **novos nomes dos times (I16)**, 2, **categoria "Em teste"**, 3, **CTA do Rift Masters na home (I05)**, foram concluídos em 15/11/2026, e o 4, **draft para scrims**, em 17/11/2026, depois da medição do Ably na Copa Rift Masters (ver Apêndice D):

| Ordem | # | Item | Esforço |
|---|---|---|---|
| 5 | — | **Link fixo de transmissão do draft (OBS).** Aprovado pelo Israel em 19/11/2026 (era o "modo transmissão" do item 4). Um endereço fixo (ex.: `/draft/tv`) cadastrado uma vez no OBS: na criação do draft, a opção "Mostrar na transmissão" (desligada por padrão) aponta esse link para a sala, e ele segue sozinho para o draft novo e para cada jogo da série. Entra direto como espectador neutro, sem tela de escolha, sem botões nem cabeçalho, em 1920×1080 (no OBS não dá para clicar sem o "Interagir"). **Riscos avaliados (19/11):** *Ably:* o OBS guarda o id do aparelho como um navegador, então conta 1 usuário no mês (confirmar no painel no primeiro teste); 1 conexão só enquanto a fonte está ativa (opção "Desligar quando não estiver visível"); as mensagens são as mesmas da sala. *Vercel:* sem consulta periódica; com o Ably no ar, a tela fixa só escuta o aviso de troca de sala; sem o Ably, pergunta a uma resposta em cache, como o sinal do draft. *Neon:* só uma tabela nova e pequena (qual sala está na transmissão), sem mexer em `draft_rooms`; em repouso a tela fixa não acorda o banco. *Site:* rota nova e opção nova; a sala e a criação do draft continuam iguais para quem não marcar a opção, e o link normal da sala segue funcionando no OBS como plano B. **A decidir:** um link só da INGEN ou um por caster (Copa Rift Masters). | M |
| 6 | — | **Coleção de cenas do OBS para importar** (veio da Onda 7): botão que baixa um `.json` de Scene Collection com as 5 cenas (Começando, Lobby, Partida, Pausa, Fim), fontes posicionadas e links do jogador. A instalação cai de ~15 min para ~1 min. | M |
| 7 | I01–I04 | **Novos assets do kit de stream:** meta definível, de inscritos, seguidores ou doações (I01); contorno para o LivePix e espaço para ele na tela de lobby, removível como a câmera (I02); verificar se a música do Spotify pode aparecer na tela, o que depende da conta do streamer autorizar o acesso (I03); música nas telas "Já vai começar", "Volto já" e "Encerramento", reaproveitando o I03 se ele for viável (I04). | G |

Os itens 6 e 7 entram no kit de stream (`public/stream`); rodar `node scripts/build-stream-se.mjs` ao mexer em `public/stream/core`.

### Onda 3 · Draft INGEN: drafts salvos

**Decidido em 15/11/2026:** o draft não terá sugestão de picks pela pool dos jogadores nem sugestão de bans. Seria injusto com os times visitantes, que não têm esse apoio, e a sugestão de bans só serviria ao adversário, dispensando o estudo que ele mesmo deveria fazer.

- **Salvar drafts** (scrims e jogos) para analisar depois.
- **A decidir pelo Israel:**
  - *Exportar imagem:* gerar um PNG do draft pronto (picks e bans dos dois times, com logos e cores) para postar no Discord ou nas redes.
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
- CTA do Rift Masters na home (I05, item 3 da Onda 2, 15/11/2026): faixa da Copa Rift Masters 2026 logo após o letreiro, com logo, estreia e links para a Twitch e o site do campeonato; desliga com `enabled: false` em `src/lib/rift-masters.ts`. Em 17/11/2026 o botão "Ver o campeonato" passou a apontar para o domínio próprio, https://www.riftmasters.com.br/ (antes, uma página provisória).
- Organização do git (15/11/2026): toda alteração em branch própria a partir da `main`, apagada depois de entrar na `main`; branches antigas (`feat/fase-1-base`, `feat/ajustes-v1` e as desta leva) apagadas no computador e no GitHub. A tag `nomes-aces-jokers` marca o fim da renomeação dos times.
- Ajustes de uso no celular (15/11/2026, pedido do capitão): o aviso flutuante da live começa fechado (só a pílula "Ao vivo") e o "–" virou o botão "Fechar"; ícone da Twitch do topo, dicas (i) e botões do gráfico de elo do ranking (período e legenda; tocar na legenda liga e desliga o destaque) com área de toque maior; no gráfico, um ponto marca o início de quem passou a ser acompanhado depois (ex.: jogadores em teste) e os nomes longos cabem no fim das linhas; o eixo de tempo vai até o registro mais recente (a linha de quem foi sincronizado sozinho saía do gráfico, por cima dos nomes) e os nomes ficam centrados nas suas linhas; gráfico mais alto (440px), fios ligando cada linha ao seu nome e, ao destacar um jogador, o nome vai para a altura exata da linha. Varredura rápida no celular sem rolagem lateral em nenhuma página.
- Ably por aparelho (16/11/2026, para a Copa Rift Masters): o plano grátis do Ably conta usuários ativos por clientId (500 por mês) e o clientId era por aba, então cada aba nova contava de novo. Agora o clientId é do aparelho (`ingen-draft-did` no localStorage); a vaga de drafter continua sendo da aba, provada na presença pelo resumo da aba com uma assinatura do servidor (HMAC), que o servidor confere antes de deixar alguém assumir uma vaga. Telas abertas antes da mudança seguem funcionando no formato antigo. Testado com a chave real: duas abas do mesmo navegador com o mesmo clientId, aviso chegando sem consulta, vaga ocupada recusada e liberada ~15 s depois de fechar a aba do drafter.
- Página "Sobre a organização" (19/11/2026, pedida pelo Israel): `/sobre` com a ideia do time, o dia a dia do grupo e o lema Sic Parvis Magna; seção 03 "A organização" na home (Comunidade e Recrutamento viraram 04 e 05); "Sobre" no menu e no rodapé; lema no rodapé e no `slogan` do JSON-LD; página no sitemap. No tablet (768 a 1023 px) o topo mostra só o escudo, sem a palavra INGEN, para o menu caber.
- Mapa do Rift (19/11/2026, pedido do Israel): nomes da bot lane sem sobreposição (ADC na reta de baixo com o nome à esquerda, SUP na reta da direita), JG e MID mais afastados e avatares menores abaixo de 400 px; conferido por medição em 320, 375, 768 e 1440 px.
- Draft para scrims (item 4 da Onda 2, concluído em 17/11/2026): criação em `/draft` e sala compartilhada no formato de campeonato, com cronômetro do servidor, drafter e espectadores por time, espectador neutro, fearless, séries de até 5 jogos, troca de slot, "quem ganhou" e link de 32 h (tabela `draft_rooms`, migração 0005). Tempo real pelo Ably (publicado em 15/11), com um usuário por aparelho (16/11); medido depois dos 5 primeiros jogos da Copa Rift Masters (17/11): 50 usuários no mês, dentro do plano grátis. Sem Ably, volta às consultas com sinal no cache da Vercel. O modo transmissão virou o item 5 da Onda 2.
- Ajustes finos de interface, 1ª leva (19/11/2026, pedidos do Israel e varredura em todas as telas): eixo do gráfico do ranking separado das datas e respiro nas bordas da tabela; 5º card do elenco na linha inteira no tablet, com a splash horizontal; PDL do dia sem corte; nomes do radar do Comparar fora do anel; textos longos do perfil, dos destaques do ranking e do scouting quebrando linha; último card do kit de stream esticado; painel de fim de jogo do draft no celular do tamanho do conteúdo.

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
| 15/11 | **Organização do git:** branches finalizadas apagadas (só fica a `main`), tag `nomes-aces-jokers` na renomeação e regra de branch própria por alteração no `CLAUDE.md` | git e GitHub |
| 15/11 | **Draft para scrims** construído (criação em `/draft`, sala compartilhada com drafter e espectadores por time, fearless, série de até 5 jogos, link de 32 h) e testado com dois navegadores; tabela `draft_rooms` criada só como migração (ainda não aplicada no Neon); **não publicado**, aguardando validação | branch `feat/draft-scrims` |
| 15/11 | **Draft poupa o Neon:** fora do draft em andamento as telas usam um sinal no cache da Vercel e não consultam o banco; o vencedor marcado aparece junto em todas as telas, que seguem para o próximo jogo; no lobby a vaga de drafter pode ser assumida. Consumo medido no Neon nas últimas 24 h (já com a correção de 13/11, em que o sync só grava quando a Riot muda algo): 26 acordadas por dia, cerca de 25 a 40 das 100 horas de CU do mês; o draft deve somar cerca de 7 | branch `feat/draft-scrims` e painel do Neon |
| 15/11 | **Draft publicado para teste:** cor personalizada, nomes por lane, fundo animado com as cores dos times e correções de uma revisão de código; migração `0005` (tabela `draft_rooms`) aplicada no Neon; Ably aprovado como próximo passo | `main`, Neon e Vercel |
| 15/11 | **Draft, ajustes do primeiro teste do Israel:** ordem dos bans da fase 2 corrigida (vermelho começa); tela mais leve (fundo estático, sem desfoque, sem transição de página na sala, relógio e seletor sem re-render a cada segundo); pedido de troca não aparece mais no pick da vez e é cancelado quando chega a vez; tela de campeão no momento certo; risco de ban mais fino; campeão vai para a lane com um clique no ícone; espectador neutro (para transmissão); "Sem cor" como quadrado de cor | `main` e Vercel |
| 15/11 | **Draft, segundo teste do Israel medido** (2 jogos; 2 drafters e 1 a 2 espectadores neutros): cerca de 0,2 hora de CU no Neon na janela do teste (o banco ficou acordado nos ~45 min, junto com o sync), ~8 MB de tráfego e ~2 mil requisições na Vercel, dentro do previsto (~1 mil requisições por jogo com 3 a 4 telas). Ajustes aprovados; próximo passo, o Ably, em sessão própria | painel do Neon e da Vercel |
| 15/11 | **Draft em tempo real (Ably) implementado** na branch `feat/draft-ably`: publicação da sala pelo servidor, token só de leitura e presença por sala, presença do Ably no lugar da gravada no banco e reserva por consultas; testado sem a chave real (a reserva assume sozinha) e com a chave real (avisos em ~270 ms, telas sem consultar) | branch `feat/draft-ably` e painel do Ably |
| 15/11 | **Draft em tempo real publicado** (`7c42387` na `main`); chave `ABLY_API_KEY` na Vercel em Production; teste em produção: a tela recebe a mudança em ~0,75 s sem consultar | `main`, Vercel e Ably |
| 16/11 | **Levantamento dos planos grátis** (Vercel, Neon e Ably), com o uso lido nos painéis; o limite que importava era o de 500 usuários do Ably, contado por aba | conversa "Planos e limites", painéis da Vercel, do Neon e do Ably |
| 16/11 | **Ably passa a contar um usuário por aparelho** (não por aba), para a fase de grupos da Copa Rift Masters (28 partidas MD1) caber no plano grátis | branch `feat/draft-ably` |
| 17/11 | **Link da Copa Rift Masters** na home trocado para o domínio próprio do campeonato (`riftmasters.com.br`); publicado (`main` → Vercel) | branch `fix/link-rift-masters` e Vercel |
| 17/11 | **Medição do Ably** depois dos 5 primeiros jogos da Copa Rift Masters (QNT × RDX, KNS × Aces, Jokers × Aces, Death's Dance × Kinship, Jokers × Quântica): 50 usuários no mês (8 antes da estreia; ~41 previstos com o ajuste, ~73 sem ele); a contagem por aparelho funcionou. Branch `feat/draft-ably` apagada | painel do Ably, Neon e git |
| 19/11 | **Página "Sobre a organização"** (`/sobre`), pedida pelo Israel: abertura "Ninguém melhora sozinho", a ideia (o acerto de um é mérito de cinco, o erro de um é problema de cinco), o dia a dia do grupo com os números do elenco, o lema **Sic Parvis Magna** ("a grandeza vem dos pequenos começos") e chamada para o Discord. Seção 03 "A organização" na home (Comunidade e Recrutamento viram 04 e 05), "Sobre" no menu, lema no rodapé e no JSON-LD (`slogan`), página no sitemap. No tablet (768 a 1023 px) o menu mostra só o escudo, sem a palavra INGEN, para caber o item novo. Aprovada pelo Israel e publicada (`main` → Vercel); branch apagada | branch `feat/sobre-organizacao` e Vercel |
| 19/11 | **Mapa do Rift (elenco), bot lane revista** a pedido do Israel: ADC e SUP ficavam juntos no canto, o nome do SUP caía em cima do avatar do ADC e o nome do ADC saía pela borda de baixo do mapa (nos dois times). Agora o ADC fica na reta de baixo com o nome à esquerda do avatar e o SUP na reta da direita; JG e MID um pouco mais afastados; avatares menores em telas abaixo de 400 px. Conferido por medição (nomes, avatares e bases sem se tocar) em 320, 375, 768 e 1440 px. Aprovado pelo Israel e publicado (`main` → Vercel), com a mesma medição limpa em produção; branch apagada | branch `fix/mapa-bot-lane` e Vercel |
| 19/11 | **Ajustes finos de interface, 1ª leva** (pedidos do Israel e varredura em todas as telas, inclusive draft e stream, em 320 a 1280 px): no ranking, os elos do eixo do gráfico deixam de descer para a linha das datas e a tabela ganha respiro nas bordas; no elenco (tablet), o 5º card ocupa a linha inteira com a splash horizontal, e o PDL do dia nos cards não é mais cortado; no Comparar, os nomes dos eixos do radar saem de cima do anel (o limite do polígono os prendia nele); no perfil, os números de ritmo quebram linha no celular em vez de cortar o texto; nos destaques do ranking e no pool do scouting, textos longos quebram linha; no kit de stream, o último card estica até o fim da linha; na sala do draft no celular, o painel de fim de jogo não reserva mais 70% da tela. Aprovado pelo Israel e publicado (`main` → Vercel) | branch `fix/ajustes-finos` e Vercel |
| 19/11 | **Draft para scrims (item 4 da Onda 2) marcado como concluído** pelo Israel (no ar desde 15/11, consumo medido em 17/11); o **link fixo de transmissão do draft** para o OBS entra como item 5, com os riscos para o Ably, a Vercel e o Neon avaliados; os itens do kit de stream passam a 6 e 7. Branch `feat/draft-scrims` apagada (já estava na `main`) e `feat/draft-transmissao` aberta | conversa, git e GitHub |

**Por que alguns itens pareciam "perdidos":** a página 404 existe desde a fase 1, mas o mapa de melhorias de 11/11 a listou como pendente. O domínio foi configurado fora do repositório (Registro.br e Vercel), então não aparece no git. A partir de agora, este arquivo é a fonte única (ver "Como manter este arquivo", no topo).
