# Roadmap: features futuras

## Status da v1 (fase-1-base)

**Pronto:**
- Home animada
- Elenco com Mapa do Rift
- Perfil do jogador com dados da Riot
- Comparar jogadores
- Scouting (op.gg multi, Discord, PDF)
- Ranking interno
- Notícias (**oculta** por decisão do time; reativar com `FEATURES.news = true` em `src/lib/features.ts`)

**Próximo:**
- **Painel admin** (Better Auth) para notícias, jogadores, redes sociais e vagas. Hoje a edição é via seed/banco.
- **Sync automático** (cron) quando houver a Personal Key da Riot. Hoje é `npm run sync` local.
- **Imagem de compartilhamento (OG)** do scouting para o Discord/WhatsApp.
- **Gráfico de evolução de elo** (os snapshots diários já estão sendo gravados em `rank_snapshots`).
- **Logo em SVG** para animar as partes do escudo separadamente.

## Twitch: selo "Ao vivo" (pausada)

**Status:** pausada até confirmar quais membros têm canal na Twitch.

**O que é:** mostrar quando um jogador está transmitindo, com o selo "🔴 Ao vivo" no card e no perfil, e uma faixa "Ao vivo agora" na home.

**Já preparar desde o início (para não precisar migrar depois):**
- A tabela `social_links` aceita `platform = twitch` com o nome do canal. Se o jogador não tem canal, simplesmente não há registro.
- O selo só aparece para quem tem link da Twitch cadastrado.
- As variáveis `TWITCH_CLIENT_ID` e `TWITCH_CLIENT_SECRET` já existem no `.env`, vazias.
- A integração fica desligada enquanto essas variáveis estiverem vazias.

**Quando for ativar:**
1. Registrar o app em dev.twitch.tv/console usando uma conta do time com 2FA ativo.
2. Usar o token de app (client credentials), sem login dos jogadores.
3. Rodar um job a cada 2–5 min chamando `GET /helix/streams?user_login=...` (até 100 canais por chamada) e salvar `is_live`, título e jogo.
4. O front lê do banco, nunca chama a Twitch direto.

## Riot: Personal API Key (pendente)

- **Hoje:** Development Key (expira a cada 24h), na conta pessoal do Israel.
- **Próximo passo:** o capitão cria ou fornece uma conta Riot do time, e por ela será registrado o produto "INGEN" e pedida a Personal Key.
