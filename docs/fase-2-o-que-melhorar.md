# Fase 2: tela interna "O que melhorar"

> Plano. Nada disto está implementado. Escrito em 12/11/2026, depois de tirar fraquezas e bans sugeridos do scouting público.

## Por que existe

O `/scouting/<time>` virou um relatório **público**: é o link que mandamos para os adversários, no lugar do op.gg. Por isso ele só mostra elo, estatísticas, picks e pontos fortes.

O que entrega o time (fraquezas, confrontos ruins, lado do mapa em que rende menos, quem está em fase ruim, o que banir contra nós) passa a morar numa área **interna**, só para a staff e os jogadores. Lá a leitura vai além de "onde erramos": cada ponto fraco vem com **o que fazer** e **como medir** se melhorou.

## Acesso

- **Rota:** `/interno/melhorar` (e `/interno/melhorar/<slug>` por jogador). Fora do menu, do sitemap e do `robots`, com `noindex, nofollow` em todas as páginas.
- **Login com usuário e senha**, criados pelo dono do site (não há cadastro aberto).
  - Tabela `staff_users`: usuário, hash da senha (argon2 ou bcrypt), papel (`staff` ou `jogador`) e, para jogador, o `player_id` vinculado.
  - Sessão em cookie `httpOnly` + `secure` + `sameSite=lax`, assinado (JWT com `jose`) e com validade de 7 dias. É o modelo "stateless" do guia de autenticação do Next 16 (`node_modules/next/dist/docs/01-app/02-guides/authentication.md`).
  - Senha com no mínimo 10 caracteres, tentativas limitadas por IP (por exemplo, 5 a cada 15 min) e mensagem de erro genérica.
- **Duas camadas de proteção** (como o guia recomenda):
  1. `src/proxy.ts` (no Next 16 o antigo `middleware` se chama **proxy**): checagem otimista do cookie em `/interno/*`; sem sessão, redireciona para `/interno/entrar`.
  2. **Data Access Layer** `src/lib/dal.ts` com `verifySession()`, chamada em toda página, Server Action e Route Handler da área. O proxy sozinho não basta.
- **Quem vê o quê:**
  - `staff`: o time todo.
  - `jogador`: só a própria página. É opcional; dá para começar só com `staff`.
- **Cache:** as páginas da área são dinâmicas, por usuário, e não entram em cache público. Os cálculos continuam vindo do `getSiteData()`, que já está em cache no servidor e nunca chega ao navegador sem passar pela página protegida.
- **Painel admin:** o login pode ser o mesmo planejado para o `/admin` (`docs/roadmap.md`). Vale decidir junto: usuário e senha agora, Discord depois.

## Conteúdo

### 1. Visão do time

- **"Como nos banem":** os 3 campeões que um adversário esperto baniria. É a lógica que saiu do scouting, em `teamSummary().bans`.
- **Lanes mais vulneráveis:** elo, KDA e farm abaixo da referência da lane, e fase ruim.
- **Mapa de calor de horário:** dia × período. Mostra quando o time joga e quando ganha.
- **Duos:** quais duplas da casa ganham ou perdem juntas. Os dados já existem em `Player.duos`.
- **Dependência de um jogador:** winrate do time quando cada um vai bem ou mal.

### 2. Página de cada jogador (o coração da tela)

Cada item segue o mesmo formato:

> **Fraqueza** → **evidência** (número, amostra, período) → **por que importa** → **o que treinar** → **meta mensurável**

| Área | Sinais (já calculados hoje) | Exemplo de recomendação |
|---|---|---|
| Sobrevivência | mortes/partida, KDA, sequência de derrotas | "Média de 7,1 mortes. Revisar as 3 partidas com mais mortes (links abaixo). Meta: < 5,5 nas próximas 20." |
| Farm | CS/min vs. referência da lane, CS aos 10 min | "6,1 CS/min (referência de MID: 6,8–8). Treino de last hit 10 min/dia. Meta: 7,0." |
| Visão | visão/min, wards colocadas e destruídas, control wards | "0,4 visão/min. Comprar control ward a cada volta à base. Meta: 0,7." |
| Presença | participação em abates (KP), dano % do time | "41% de KP: rotacionar após o primeiro dragão." |
| Pool | concentração em um campeão, campeões com winrate ruim e volume alto | "Parar de jogar X em ranqueada (38% em 13 jogos); focar em Y e Z." |
| Confrontos | matchups com saldo negativo (2+ jogos) | "2-6 contra Yasuo: estudar o confronto, ou banir quando possível." |
| Contexto | lado azul × vermelho, jogos curtos × longos, horário | "Rende 20 pontos a menos no lado vermelho." |
| Forma | tendência das últimas 10 × anteriores, sequências | "Fase ruim: 3 de 10. Pausa após 2 derrotas seguidas." |

- **Fonte das regras:** `scoutRead()` em `src/lib/scouting.ts` já gera `weaknesses`, `ban` e `tough`, e continua no código de propósito. A fase 2 expande essas regras com recomendações e metas por lane, numa tabela de referências por lane e elo.
- **Amostra mínima:** abaixo de 5 partidas não vira conclusão (regra já usada). Cada item mostra o tamanho da amostra.
- **Partidas para revisar:** links para as 3 partidas que melhor ilustram cada fraqueza, como a com mais mortes ou a com menos farm.

### 3. Acompanhamento (o que transforma em evolução)

- **Metas** por jogador, com prazo. Tabela `improvement_goals`: métrica, valor alvo, início e fim, status. A barra de progresso é calculada pelo sync.
- **Notas da staff:** comentários datados por jogador (tabela `coach_notes`). Visíveis para o jogador se o papel `jogador` for adotado.
- **Antes × depois:** métricas na janela atual comparadas com a de 30 dias atrás.

## Dados novos (opcional, melhora muito a precisão)

- **Timeline das partidas** (`/lol/match/v5/matches/{id}/timeline`): diferença de ouro e CS aos 10 e 15 min, mortes antes dos 10 min e posição nas mortes (gank × duelo).
  - **Custo:** 1 chamada extra por partida nova, o que dobra o uso da API no sync.
  - Com a **Development Key** (limite baixo e expira a cada 24h), isso só é viável com a **Personal API Key**, que já está pendente no roadmap.
- **Referências de elo:** médias públicas por lane e elo não vêm da API. Comece com as referências fixas que já existem em `scouting.ts` e compare também com a média dos próprios jogadores da casa.

## Fases sugeridas

1. **2a: acesso.**
   - Login, sessão, proxy e DAL, com `staff` apenas.
   - Página do time com "como nos banem" e lanes vulneráveis.
   - Página por jogador com as fraquezas atuais de `scoutRead()`, já no formato fraqueza → evidência → o que treinar.
2. **2b: recomendações.**
   - Tabela de referências por lane e elo.
   - Textos de recomendação e partidas para revisar.
   - Pool e confrontos.
3. **2c: evolução.**
   - Metas, notas da staff e comparação antes × depois.
   - Papel `jogador`.
4. **2d: timeline** (depende da Personal API Key): ouro e CS aos 10/15 min e mortes cedo.

## Cuidados

- O scouting público **nunca** pode importar componentes da área interna. As leituras de fraqueza ficam só em páginas protegidas, para não vazarem no HTML nem no payload das páginas públicas.
- As senhas nunca vão para o repositório. O usuário inicial é criado por um comando, `npm run manage -- staff:add --user X`, que pede a senha no terminal.
- Toda ação de escrita (metas, notas) passa por Server Action com `verifySession()` e validação Zod.
