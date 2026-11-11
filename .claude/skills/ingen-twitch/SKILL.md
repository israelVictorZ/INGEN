---
name: ingen-twitch
description: Adiciona, troca ou remove o canal da Twitch de um jogador da INGEN (alimenta o selo "Ao vivo" e o botão da Twitch no perfil) e publica na Vercel. Use quando o usuário enviar o nome de um jogador com um link twitch.tv, ou pedir para tirar a Twitch de alguém.
---

# Gerenciar canais da Twitch dos jogadores

Os canais ficam na tabela `social_links` (`platform = "twitch"`). Toda alteração passa por `scripts/manage.ts`.

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

4. **Publicar na Vercel.** É só mudança de dados, então um commit vazio dispara o deploy e limpa o cache:
   ```bash
   git commit --allow-empty -m "twitch: <resumo, ex.: canal de Fulano (twitch.tv/fulano)>" && git push origin main
   ```

5. **Verificar em produção** (~1–2 min após o push):
   ```bash
   curl -s https://ingen-three.vercel.app/api/live
   ```
   - O slug do jogador deve aparecer com o `channel` certo (ou sumir, na remoção).
   - `isLive: true` só se ele estiver transmitindo naquele momento.

## Como o selo funciona (para explicar se perguntarem)

- O site consulta `/api/live`, com cache de 60 s.
- **Com as variáveis da Twitch na Vercel**, a rota pergunta direto à Twitch.
- **Sem elas**, usa o status gravado pelo sync do GitHub Actions. A sonda de 5 min só passa a vigiar um canal novo depois da próxima sincronização completa (até 6 h).
- O selo aparece nos cards do elenco, no perfil e na faixa "Ao vivo agora" da home.

## Relatório ao usuário

Em português, curto: jogador, canal (com link), se o canal foi validado na Twitch, se está ao vivo agora e o resultado da verificação em produção.
