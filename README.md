# INGEN: site oficial

Site da organização de League of Legends **INGEN** (INGEN Black e INGEN Silver).

Stack: Next.js 16 · Tailwind CSS v4 · GSAP + Lenis · Neon Postgres + Drizzle · Riot Games API.
Direção visual em [`docs/design.md`](docs/design.md) · arquitetura em [`docs/arquitetura.md`](docs/arquitetura.md) · planejamento e pendências em [`docs/planejamento.md`](docs/planejamento.md).

## Rodando localmente

```bash
cp .env.example .env      # preencha DATABASE_URL e RIOT_API_KEY
npm install
npm run db:migrate        # cria as tabelas no Neon
npm run db:seed           # times, jogadores, vagas e notícias iniciais
npm run sync              # puxa elo, maestria e partidas da Riot (~4 min)
npm run dev
```

## Atualizar os dados da Riot

`npm run sync` roda **localmente** com a chave do `.env` e grava no banco.
O site publicado só lê do banco e revalida a cada 15 minutos, então a chave da Riot nunca vai para a Vercel.

## Páginas

| Rota | Conteúdo |
|---|---|
| `/` | Home: hero animado, elencos, números e notícias |
| `/elenco` | Mapa do Rift e cards dos jogadores (Black primeiro) |
| `/jogador/[slug]` | Perfil: elo, métricas, pool de campeões e partidas |
| `/comparar` | Dois jogadores do mesmo time lado a lado |
| `/scouting/[time]` | Relatório para outros times: op.gg multi, Discord e PDF |
| `/ranking` | Ranking interno por elo (único lugar sem a ordem Black → Silver) |
| `/noticias` | Notícias (oculto por enquanto: `FEATURES.news` em `src/lib/features.ts`) |
