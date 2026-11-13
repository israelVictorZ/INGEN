# Planejamento INGEN

> Arquivo único de pendências e prioridades. Substitui `roadmap.md`, `melhorias.md`, `fase-2-o-que-melhorar.md` e `fase-2-ingen-lives.md`.
> Atualizado em 13/11/2026, depois de uma varredura do site no ar e do código. Site: https://ingengg.com.br
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
- **Redes oficiais** no menu e no rodapé: Twitch, Discord e Instagram ([@ingen.gg](https://www.instagram.com/ingen.gg/)), sempre em nova aba.
- **Elenco** com o Mapa do Rift, os dois times (INGEN Black e INGEN Silver), reservas e vagas abertas apontando para o Discord.
- **Perfil do jogador:** gráfico de elo, métricas com a posição entre os jogadores da INGEN, vitórias × derrotas, tendência, contexto (lado do mapa e duração), runa-chave mais usada, mapa de calor "Quando joga", forma, recordes, campeões, confrontos de lane, duo, partidas detalhadas, selo e botão da Twitch, imagem de compartilhamento.
- **Comparar** jogadores (inclusive entre times), com layout próprio no celular.
- **Scouting** por time: op.gg multi, Discord, PDF legível, bans sugeridos, picks com confiança, pontos fortes, confrontos difíceis, data e patch do relatório.
- **Ranking** interno, com destaques da semana e gráfico de elo de todos (com filtro de período).
- **Kit de stream** interno (`/stream` e `/stream/ajuda`): 8 overlays animados alimentados pelo banco e um guia para leigos. **Testado no OBS e funcionando.** Teste de alerta direto no OBS pelo chat: `!testealerta` (dono do canal e mods) ou `?teste=raid` no link; no card de alertas do kit, cada botão copia o comando do seu alerta.
- **Domínio próprio:** https://ingengg.com.br (o `www` e as páginas do antigo `ingen-three.vercel.app` redirecionam para ele; `/api` e `/stream` seguem respondendo nos dois, para não quebrar overlays já configurados).
- **SEO:** sitemap, robots, canônicos, imagens de compartilhamento e dados estruturados, no domínio oficial.
- **Confiabilidade:** páginas de erro amigáveis, página 404 "Fora do mapa", rodapé com "Dados atualizados há X" e aviso quando o sync para.
- **Acessibilidade:** contraste revisado, foco visível e animações respeitando "reduzir movimento" (menos o tilt dos cards).
- **Notícias:** prontas, mas **ocultas** por decisão do time (`FEATURES.news` em `src/lib/features.ts`).

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
| `match_players` | Os 10 participantes de cada partida: campeão, KDA, itens, feitiços, runas | #12, #14, #31, Draft |
| `match_teams` | Cada lado: vitória, bans e objetivos | #9, Draft, Fase 2 |
| `match_timelines` | Ouro/XP/CS aos 5/10/15/20 min, abates com posição e tempo, objetivos com tempo, ordem de itens e de skills | #8, #12, Fase 2 (2d) |
| `live_sessions` | Histórico de lives: início, fim, título, jogo, pico de espectadores | #28, #29, #46 |

As partidas antigas foram completadas com `SYNC_BACKFILL=1 npm run sync`.

---

## 2. Ordem de prioridade

A ordem leva em conta: o que está errado primeiro, depois o que entrega mais com menos esforço, e por fim o que depende de decisões ou de terceiros.

### Onda 1 · Correções e ganhos rápidos (1 a 2 dias)

| # | Item | Página | Esforço |
|---|---|---|---|
| 5 | **Radar por lane:** hoje usa um teto fixo para Solo/Duo, então suporte sempre parece fraco em CS e dano. Normalizar pela referência da lane e explicar a escala. | Comparar | M |
| 48 | **Analytics** (Vercel Web Analytics, gratuito): saber quais páginas são usadas antes de investir nelas. Não há nada instalado no código hoje. | Global | P |
| 39 | **X e YouTube no rodapé e no menu**, se o time tiver. Twitch, Discord e Instagram já estão. | Global | P |
| 35 | **Dicas nas métricas:** ícone (i) explicando KDA, KP, CS@10 etc. | Global | P |
| 37 | **Tilt dos cards com "reduzir movimento":** o resto do site já respeita; o tilt 3D do card do elenco ainda não. | Elenco | P |
| 33 | **Tabela de campeões ordenável** e filtro "só da lane". | Perfil | P |
| 34 | **Live embutida** no topo do perfil quando o jogador estiver ao vivo. | Perfil | P |
| 22 | **Card do elenco mais rico:** "jogou há 2 h", últimas 5, PDL nas últimas 24 h. | Elenco | P |
| 18 | **Forma recente no scouting por jogador:** últimas 10 e variação de PDL em 7 dias (hoje só existe o destaque "Em melhor fase"). | Scouting | P |
| 27 | **Setas de posição** no ranking (▲▼ contra a semana anterior). | Ranking | P |

### Onda 2 · Sistema de Draft INGEN (novo, 2 a 4 dias)

Tela de draft no estilo do drafter.lol, com a cara da INGEN. É independente do resto e tem alto impacto visual: serve para treino, scrims e transmissão.

- **v1, só no navegador (sem banco):**
  - Fases de ban e pick no formato oficial (3 bans, 3 picks, 2 bans, 2 picks), com cronômetro opcional.
  - **Time adversário personalizável:** subir o logo (fica só no navegador) e escolher a cor do time. A tela inteira se adapta à cor.
  - Busca de campeão por nome e filtro por lane; splash arts do Data Dragon.
  - Visual próprio: escudo da INGEN, gradiente verde, animações de pick e ban.
  - **Modo transmissão:** link limpo, sem controles, para usar como fonte do OBS (conversa com o kit de stream).
- **v2, com dados da casa:**
  - Sugestões vindas do banco: comfort picks e pool de cada jogador, campeões que nos banem, picks de risco (já gravados em `match_players` e `match_teams`).
  - Salvar drafts (histórico de scrims) e exportar imagem do resultado.
  - Sala compartilhada: os dois capitães montam o draft juntos em tempo real, cada um no seu link.
- **Depende de:** nada para a v1. A v2 com salvamento usa o login da Onda 4.

### Onda 3 · Perfil com os dados novos (2 a 3 dias)

A coleta já começou; esta onda só mostra o que está sendo gravado.

| # | Item | Esforço |
|---|---|---|
| 8 | **Diferença contra o adversário de lane:** ouro, XP e CS aos 10 e 15 min. É o dado mais pedido em análise de jogador. | M |
| 9 | **Participação em objetivos:** dragões, arauto, vastilarvas, barão e torres. Essencial para JG e SUP. | M |
| 10 | **Métricas por lane:** JG (abates antes dos 10 min, objetivos, CS de selva), SUP (visão, wards), ADC (dano/min, % do dano), TOP (abates solo, placas), MID (dano, roams). | M |
| 11 | **Comparação com a média da lane** ao lado de cada métrica (seta e %). A posição entre os jogadores da INGEN (1º, 2º...) já existe. | P |
| 12 | **Builds e ordem de skills** mais usadas por campeão. A runa-chave mais usada já aparece. | M |
| 14 | **Placar completo** da partida (os 10 jogadores) ao expandir a linha. | M |
| 15 | **Gráfico de elo do perfil com eventos** (promoções e quedas) e filtro de período. O gráfico do ranking já tem filtro. | M |

### Onda 4 · Login único e área interna (1 a 2 dias)

Um só sistema de acesso para três áreas que hoje estão planejadas separadamente: `/stream` (kit), `/interno` (Fase 2) e `/admin` (painel).

- Login com usuário e senha criados pelo dono do site (sem cadastro aberto); Discord pode vir depois.
- Detalhes técnicos no Apêndice A.
- Logo depois: **senha no kit de stream** (antes de divulgar o kit para mais gente).

### Onda 5 · Fase 2 "O que melhorar" (área interna)

Fraquezas, recomendações e metas por jogador, só para a staff. Plano completo no Apêndice A.

1. **2a:** página do time ("como nos banem", lanes vulneráveis) e página por jogador no formato fraqueza → evidência → o que treinar.
2. **2b:** referências por lane e elo, partidas para revisar, pool e confrontos.
3. **2c:** metas, notas da staff, antes × depois, papel `jogador`.
4. **2d:** timeline (ouro e CS aos 10/15 min, mortes cedo, ganks × duelos). **Desbloqueada:** a Personal Key já está ativa e as timelines já estão sendo gravadas.

### Onda 6 · Kit de stream, fase 2

Plano completo no Apêndice B. A fase 1 já foi testada no OBS e funciona, e o teste de alerta pelo chat já está pronto. Ordem:
1. **Coleção de cenas do OBS** para importar: instalação cai de ~15 min para ~1 min.
2. **Placar do dia** (vitórias/derrotas, PDL e sequência; dados prontos).
3. Câmera cheia e transição (stinger).
4. "Jogando com", painéis e imagem offline da Twitch.
5. Página "Novidades do kit" e melhorias do guia.

### Onda 7 · Painel admin

Cadastrar, editar e remover jogadores, vagas e notícias sem mexer no banco. Até lá, as skills de chat resolvem. Detalhes no Apêndice C.

### Onda 8 · Engajamento automático

| # | Item | Esforço |
|---|---|---|
| 28 | **Destaques automáticos na home:** maior subida, partida da semana, primeira penta, quem entrou ao vivo. | M |
| 29 | **Feed de atividades** gerado pelo sync ("Coelho subiu para Esmeralda IV"). Substitui as notícias enquanto estão ocultas. | M |
| 46 | **Notificações no Discord** (webhook): promoções, pentakills, live. Reaproveita a sonda de 5 min. | M |
| 26 | **Ranking:** alternar Solo/Duo e Flex e novos quadros (KDA, partidas, visão). | M |
| 45 | **Clipes da Twitch** e vídeos do YouTube no perfil. | M |

### Onda 9 · Elenco, scouting e comparar

| # | Item | Esforço |
|---|---|---|
| 16 | **Foto, bio e redes** no perfil (campos já existem; preencher depende do admin ou das skills). | P |
| 23 | **Ex-jogadores:** seção "Já defenderam o escudo", com período e lane. | M |
| 24 | **Staff:** capitão, coach, analista e manager (tabela nova). | M |
| 20 | **Imagem de compartilhamento do scouting** com os 5 jogadores e o elo. | M |
| 21 | **Scouting em inglês** (botão PT/EN). | M |
| 31 | **Confronto direto** entre os dois jogadores comparados. | M |
| 32 | **Imagem compartilhável do duelo** (os dois jogadores e o radar). | M |

### Onda 10 · Longo prazo

| # | Item | Esforço |
|---|---|---|
| 43 | **Campeonatos e agenda:** página de campeonatos, próximos jogos na home, resultados. | G |
| 44 | **Recrutamento com formulário** e webhook para o Discord. | M |
| 36 | **Desempenho:** splash arts menores, lazy loading, Lighthouse 90+ no celular. | M |
| 50 | **Testes e CI:** testes dos cálculos e build a cada push, antes do deploy. | M |
| 49 | **Logo em SVG** para animar torres, escudo e letras separadamente. | M |
| — | **Reativar notícias** (`FEATURES.news = true`) quando o time quiser. | P |

---

## 3. Decisões e dependências pendentes

- **Logo vetorial:** o arquivo atual é WebP com fundo escuro. Precisamos de SVG com fundo transparente, ou aprovar um redesenho fiel em vetor. Confirmar também se os dois risquinhos verdes abaixo do escudo fazem parte do símbolo.
- **Login:** usuário e senha agora, Discord depois? (Recomendado: usuário e senha, mais simples e sem depender de app no Discord.)
- **Flex e Clash:** hoje o sync grava só Solo/Duo. Gravar também Flex (440) e Clash (700) traria os jogos do time junto, úteis para o draft, "Jogando com" e campeonatos. Custa mais chamadas à Riot; o site já filtra Solo/Duo nas estatísticas.
- **Redes oficiais do time:** o time tem X e YouTube? (Instagram já está no site.)

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
| P1 | **Coleção de cenas do OBS** | Botão que baixa um `.json` de Scene Collection com as 5 cenas (Começando, Lobby, Partida, Pausa, Fim), fontes posicionadas e links do jogador. |
| P1 | **Senha** | Para `/stream` e `/stream/ajuda`, em `src/app/stream/layout.tsx` (usa o login da Onda 4). |
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

- **Rota** `/admin`, fora do menu, `noindex`, com o login da Onda 4 e uma lista de admins editável.
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
- Instagram oficial (@ingen.gg) no menu, no rodapé e nos dados estruturados (parte do #39).
- PDF de acompanhamento regenerável por qualquer sessão (`npm run docs:pdf`).
- Banco Neon dormindo quando nada muda (aviso do sync, canais em arquivo, overlays com dados guardados).
- Twitch: selo "Ao vivo", botão no perfil, faixa na home, canais cadastrados.
- Links de recrutamento apontando para o Discord.
- Reservas dos times no elenco; links externos em nova aba.
- Kit de stream fase 1.
- Gráfico de elo em degraus; remakes fora das estatísticas; contagem animada mostrando o valor real.
- Sync a cada 5 min em modo sonda; coleta de dados para as próximas fases (13/11/2026).

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

**Por que alguns itens pareciam "perdidos":** a página 404 existe desde a fase 1, mas o mapa de melhorias de 11/11 a listou como pendente. O domínio foi configurado fora do repositório (Registro.br e Vercel), então não aparece no git. A partir de agora, este arquivo é a fonte única (ver "Como manter este arquivo", no topo).
