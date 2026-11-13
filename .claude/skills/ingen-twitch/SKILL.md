---
name: ingen-twitch
description: Adiciona, troca ou remove o canal da Twitch de um jogador da INGEN (alimenta o selo "Ao vivo" e o botão da Twitch no perfil) e publica na Vercel. Use quando o usuário enviar o nome de um jogador com um link twitch.tv, ou pedir para tirar a Twitch de alguém.
---

# Gerenciar canais da Twitch dos jogadores

Os canais ficam na tabela `social_links` (`platform = "twitch"`) e numa cópia em `src/lib/twitch-channels.json`, que é a lista que o selo "Ao vivo" vigia (o site lê o arquivo para não acordar o banco a cada minuto). Toda alteração passa por `scripts/manage.ts`, que atualiza os dois. Nunca edite o JSON à mão: se precisar regerar, use `npm run manage -- twitch:export`.

## Entradas esperadas

- **Adicionar ou trocar:** nome do jogador + link do canal (`https://www.twitch.tv/canal`, `twitch.tv/canal` ou só `canal`).
- **Remover:** nome do jogador.

## Passo a passo

1. **Achar o slug do jogador** (o nome pode vir como exibição ou Riot ID):
   ```bash
   npm run manage -- list
   ```
   Se houver ambiguidade (dois jogadores parecidos), pergunte antes de seguir.

2. **Executar.**
   - Adicionar ou trocar:
     ```bash
     npm run manage -- twitch:set --slug <slug> --url https://www.twitch.tv/<canal>
     ```
     - Com `TWITCH_CLIENT_ID`/`TWITCH_CLIENT_SECRET` no `.env`, o script **confere se o canal existe** e recusa se não existir.
     - Se recusar, avise o usuário e peça o link correto.
     - Cada jogador tem no máximo um canal; `twitch:set` substitui o anterior.
   - Remover:
     ```bash
     npm run manage -- twitch:remove --slug <slug>
     ```

3. **Atualizar o status ao vivo no banco:**
   ```bash
   npm run sync
   ```

4. **Publicar na Vercel.** O comando regravou `src/lib/twitch-channels.json`, então é um **commit de verdade** com esse arquivo (não um commit vazio). Sem o deploy, o selo não vigia o canal novo:
   ```bash
   git add src/lib/twitch-channels.json && git commit -m "twitch: <resumo, ex.: canal de Fulano (twitch.tv/fulano)>" && git push origin HEAD:main
   ```

5. **Verificar em produção** (~1–2 min após o push):
   ```bash
   curl -s https://ingengg.com.br/api/live
   ```
   - A resposta é `{ team, players }`: o slug do jogador deve aparecer em `players` com o `channel` certo (ou sumir, na remoção). `team` é o canal oficial (twitch.tv/ingen_team, fixo em `src/lib/features.ts`).
   - `isLive: true` só se ele estiver transmitindo naquele momento.

## Como o selo funciona (para explicar se perguntarem)

- O site consulta `/api/live`, com cache de 60 s. A lista de canais vem de `src/lib/twitch-channels.json` (sem consultar o banco).
- **Com as variáveis da Twitch na Vercel**, a rota pergunta direto à Twitch e não toca no banco.
- **Sem elas**, usa o status gravado pelo sync do GitHub Actions. A sonda de 5 min só passa a vigiar um canal novo depois da próxima sincronização completa (até 6 h).
- O selo aparece nos cards do elenco, no perfil e na faixa "Ao vivo agora" da home.
- Quando o canal oficial (ou, se ele estiver offline, algum jogador) está ao vivo, um pin fixo aparece no canto da tela em todas as páginas. O canal oficial só é verificado com as variáveis da Twitch (o sync não grava o status dele).

## Relatório ao usuário

Em português, curto: jogador, canal (com link), se o canal foi validado na Twitch, se está ao vivo agora e o resultado da verificação em produção.
