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
GitHub Actions (a cada 5 min) ──> scripts/sync-riot.ts ──> Riot API (br1 / americas) + Twitch
                                          │  (modo sonda: só grava se algo mudou ou a cada 6h)
                                          ▼
                                   Neon Postgres  <── site lê SEMPRE daqui
```

- O site **nunca** chama a Riot durante uma visita.
- Depois de gravar, o sync avisa o site (`/api/revalidate`, com `REVALIDATE_SECRET`) e só então o site relê o banco. Sem novidade, o Neon fica desligado.
- Chave de API só no GitHub Actions e no `.env` local: variável `RIOT_API_KEY`. Nunca vai para a Vercel.
- **Chave:** Personal API Key (definitiva, não expira). Limite: 20 req/s e 100 req/2min; o sync usa 18/s e 95/2min.
- Ícones de campeões, elos e lanes: **Data Dragon / CommunityDragon** (CDN).

## Modelo de dados

| Tabela | Campos principais |
|---|---|
| `teams` | `slug` (`black`, `silver`), nome, ordem de exibição (Black = 1), acento |
| `players` | `puuid` (chave real), `game_name`, `tag_line`, nome de exibição, foto, bio |
| `team_memberships` | jogador, time, lane (`TOP`/`JUNGLE`/`MID`/`ADC`/`SUPPORT`), `joined_at`, `left_at` |
| `team_reserves` | reservas por time (fora de ranking, comparação e scouting) |
| `open_slots` | time + lane com vaga aberta ("Recrutando") |
| `social_links` | jogador, plataforma (twitch, youtube, instagram, x, tiktok…), URL |
| `rank_snapshots` / `rank_history` | elo do dia e cada mudança de elo (gráfico, "PDL hoje", subidas) |
| `champion_mastery` | top 10 campeões por maestria |
| `matches` / `match_participants` | partidas Solo/Duo e as estatísticas de cada jogador da INGEN, incluindo vantagem de rota, objetivos e o `challenges` completo da Riot |
| `match_players` | placar completo: os 10 participantes de cada partida (campeão, KDA, itens, runas) |
| `match_teams` | cada lado da partida: resultado, bans e objetivos |
| `match_timelines` | ouro/XP/CS aos 5/10/15/20 min, abates com posição, objetivos com tempo, ordem de itens e skills |
| `live_status` / `live_sessions` | status atual da Twitch e histórico de transmissões |
| `news` | notícias (ocultas por enquanto) |
| `app_meta` | versão do Data Dragon e horário do último sync |

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
