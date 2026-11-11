# Roadmap

## Status atual

**No ar** (https://ingen-three.vercel.app):
- Home animada
- Elenco com Mapa do Rift
- Perfil completo do jogador: gráfico de elo, métricas, forma, recordes, campeões, confrontos de lane, duo e partidas detalhadas
- Comparar jogadores (inclusive entre os times)
- Scouting (op.gg multi, Discord, PDF)
- Ranking interno
- Notícias **ocultas** por decisão do time. Para reativar, use `FEATURES.news = true` em `src/lib/features.ts`.

**Sync automático:** o GitHub Actions roda `scripts/sync-riot.ts` a cada 5 min (`.github/workflows/sync.yml`). O repositório é público, então os minutos do Actions são ilimitados.
- **Modo sonda:** cada execução consulta só a Riot e a Twitch (~16 chamadas, ~4 s), comparando com o estado salvo no cache do Actions.
- **Quando grava no banco:** só se algo mudou (partida nova, PDL, live) ou a cada 6h. Assim o Neon fica desligado na maior parte do tempo e respeita a cota de 100 horas de computação por mês do plano gratuito.
- **Segredos:** `DATABASE_URL`, `RIOT_API_KEY` e, opcionalmente, `TWITCH_CLIENT_ID` e `TWITCH_CLIENT_SECRET`.
- **Atenção:** com a Development Key, o `RIOT_API_KEY` precisa ser atualizado todo dia.

**Próximo:**
- **Twitch** (em andamento, ver abaixo).
- **Painel admin** (pausado, ver abaixo).
- **Imagem de compartilhamento (OG)** do scouting para Discord e WhatsApp.
- **Logo em SVG**, para animar as partes do escudo separadamente.
- **Links de recrutamento** para o Discord do time (`RECRUIT_HREF` em `src/lib/features.ts`), aguardando homologação do capitão.

---

## Twitch: selo "Ao vivo" (em andamento)

**Já implementado:**
- Rota `/api/live`, com cache de 60s:
  - consulta a Twitch quando `TWITCH_CLIENT_ID`/`TWITCH_CLIENT_SECRET` estão na Vercel;
  - sem elas, usa a tabela `live_status`, que o sync grava a cada 30 min.
- Selo "Ao vivo" nos cards do elenco e no perfil.
- Botão da Twitch no perfil, com número de espectadores.
- Faixa "Ao vivo agora" na home.

**Cadastro de canal:** linha em `social_links` com `platform = "twitch"` e a URL do canal.

**Falta:**
1. App registrado em dev.twitch.tv/console.
2. Client ID/Secret na Vercel e nos segredos do GitHub.
3. Cadastrar os 3 canais.

---

## Painel admin (pausado, retomar em outra conversa)

**Objetivo:** cadastrar e remover jogadores e editar informações sem mexer no banco.

### Acesso
- Rota `/admin`, fora do menu público, `noindex`.
- **Login com Discord** (o time já usa o Discord, então ninguém precisa de outra senha) via Better Auth.
  - Só entra quem estiver numa **lista de IDs de Discord autorizados**, guardada no banco (tabela `admins`) e editável pelo próprio painel.
  - Alternativa sem Discord: e-mail e senha criados pelo dono do site.
- **Pré-requisito:** criar um app no Discord Developer Portal. O `DISCORD_CLIENT_ID`/`DISCORD_CLIENT_SECRET` vão para a Vercel, colados pelo responsável.

### Funcionalidades

**Jogadores**
- **Adicionar** só com o Riot ID (`Nome#TAG`), escolhendo time e lane:
  - na hora, valida a conta na Riot e grava o PUUID;
  - o sync seguinte puxa elo, maestria e partidas.
- **Editar:** nome exibido, foto, bio e redes (Twitch, YouTube, Instagram, X, TikTok).
- **Trocar de time ou de lane:** fecha a participação atual (`left_at`) e abre uma nova, preservando o histórico.
- **Remover:** marca a saída (`left_at`). O jogador vira "ex-jogador", com histórico, em vez de ser apagado.

**Vagas abertas**
- Abrir e fechar vaga por time e lane.

**Notícias** (quando reativadas)
- Criar, editar, fixar e despublicar, com editor de texto.

**Ações rápidas**
- Botão "Atualizar dados agora", que dispara o workflow de sync via `workflow_dispatch`.
- Botão "Limpar cache do site" (`revalidateTag("site")`).

### Técnica
- Server Actions do Next com validação Zod.
- Toda alteração chama `revalidateTag("site")`, então aparece no site na hora.
- Log de auditoria simples (quem alterou o quê e quando) numa tabela `admin_log`.

---

## Riot: Personal API Key (pendente)

- **Hoje:** Development Key, na conta pessoal do Israel. Expira a cada 24h e a Riot não permite usá-la em produto público.
- **Próximo passo:** o capitão fornece uma conta Riot do time. Por ela registramos o produto "INGEN" e pedimos a Personal Key.
- **Ao receber a key:** atualizar o segredo `RIOT_API_KEY` no GitHub uma única vez; ela não expira.
