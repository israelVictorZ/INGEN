# INGEN: Arquitetura e stack

## Stack

| Camada | Escolha | Observação |
|---|---|---|
| Framework | **Next.js 16** (App Router, React Server Components, Server Actions) + **TypeScript** | |
| Estilo | **Tailwind CSS v4** (tokens via `@theme` em CSS) + CSS moderno | `@property`, `color-mix()`, `oklch`, container queries, `:has()`, View Transitions |
| Animação | **GSAP 3** + `@gsap/react` (`useGSAP`) | Todos os plugins são gratuitos: ScrollTrigger, SplitText, DrawSVG, MorphSVG, Flip, ScrambleText |
| Scroll suave | **Lenis** | integrado ao ticker do GSAP |
| Banco | **Neon Postgres** (projeto `ingen`, São Paulo) | |
| ORM | **Drizzle ORM** + `@neondatabase/serverless` | migrations versionadas no repositório |
| Validação | **Zod** | |
| Auth (painel admin) | **Better Auth** (self-hosted, tabelas no Neon) | Neon Auth não está disponível na região São Paulo |
| Editor de notícias | **Tiptap** (rich text) | salva como JSON/HTML |
| Imagens de compartilhamento | `next/og` (ImageResponse) | cards bonitos ao colar o link no Discord/WhatsApp |
| Hospedagem (sugestão) | **Vercel**, com funções na região `gru1` (São Paulo) | fica ao lado do banco; cron nativo |
| Pacotes | **pnpm** | |

## Fluxo de dados da Riot

```
Cron (Vercel, a cada ~15 min) ──> /api/cron/sync-riot ──> Riot API (br1 / americas)
                                          │
                                          ▼
                                   Neon Postgres  <── site lê SEMPRE daqui
```

- O site **nunca** chama a Riot durante uma visita.
- Chave de API só no servidor: variável `RIOT_API_KEY`.
- Controle de rate limit: fila com limite de 20 req/s e 100 req/2min.
- **Snapshot diário de elo** em `rank_snapshots` para o gráfico de evolução.
- Ícones de campeões, elos e lanes: **Data Dragon / CommunityDragon** (CDN).
- **Importante:** a Development Key é proibida em produto público (aviso da própria Riot). Desenvolvemos localmente com ela; **antes de publicar** o site, precisamos da **Personal Key** (conta do capitão).

## Modelo de dados (inicial)

| Tabela | Campos principais |
|---|---|
| `teams` | `slug` (`black`, `silver`), nome, ordem de exibição (Black = 1), acento |
| `players` | `puuid` (chave real), `game_name`, `tag_line`, nome de exibição, foto, bio |
| `team_memberships` | jogador, time, lane (`TOP`/`JUNGLE`/`MID`/`ADC`/`SUPPORT`), `joined_at`, `left_at` |
| `open_slots` | time + lane com vaga aberta ("Recrutando") |
| `social_links` | jogador, plataforma (twitch, youtube, instagram, x, tiktok…), URL |
| `rank_snapshots` | jogador, fila, tier, divisão, LP, vitórias/derrotas, data |
| `matches` / `match_participants` | cache das partidas e estatísticas por jogador |
| `champion_stats` | agregado por jogador × campeão (jogos, winrate, KDA) |
| `news` / `news_tags` | notícia, categoria, capa, corpo, fixada, times/jogadores marcados |
| `tournaments` | campeonato, time, fase, resultado, link do chaveamento |
| `recruitment_applications` | candidaturas às vagas |
| `users` / `sessions` | admins do painel (Better Auth) |

## Rotas (rascunho)

| Rota | Conteúdo |
|---|---|
| `/` | home |
| `/elenco` | elenco (Black primeiro), com `/elenco/[time]` |
| `/jogador/[slug]` | perfil do jogador |
| `/comparar?a=…&b=…` | comparar jogadores |
| `/scouting/[time]` | relatório do time para outros times analisarem |
| `/ranking` | ranking interno, só por elo (misturado) |
| `/noticias` | notícias, com `/noticias/[slug]` |
| `/campeonatos` | campeonatos |
| `/recrutamento` | recrutamento |
| `/admin/*` | painel admin |

## Regras de produto

- **INGEN Black aparece sempre antes da Silver**: menus, abas, listas, home, scouting. **Exceção:** rankings, que ordenam só por elo.
- **Nunca** exibir "Line 1" ou "Line 2". Usar apenas "INGEN Black" e "INGEN Silver".
- Vaga aberta ("Recrutando") é um card de recrutamento, não um espaço vazio.
- Rodapé com o aviso legal da Riot: *"INGEN isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties…"*

## Fluxo de git

- `main` só recebe código estável, via Pull Request.
- Uma branch por fase ou feature: `feat/fase-1-base`, `feat/riot-sync`, `feat/scouting`…
