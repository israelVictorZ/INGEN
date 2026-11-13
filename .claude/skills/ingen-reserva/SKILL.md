---
name: ingen-reserva
description: Adiciona ou remove jogadores RESERVA de um time da INGEN (INGEN Black / INGEN Silver) e publica na Vercel. Use quando o usuário enviar um Riot ID (Nome#TAG) dizendo que é reserva/suplente/sub de uma line ou time, ou pedir para tirar alguém da reserva.
---

# Gerenciar reservas da INGEN

Reserva **não é titular**: fica na tabela `team_reserves` (fora de `team_memberships`), então não ocupa lane, não fecha vaga aberta e não entra em ranking, comparação, scouting, médias do time nem tem página própria. No site, aparece só no `/elenco`, num bloco discreto **"Reservas"** abaixo dos cards dos titulares, com um card simples (lane, nome, Riot ID, 3 campeões mais jogados, elo, winrate) que leva ao op.gg. Time sem reservas não mostra nada desse bloco.

Cada time tem os seus reservas (um registro por time). O banco (Neon) é a fonte da verdade: toda alteração passa por `scripts/manage.ts`, **nunca** por SQL manual nem pelo `scripts/seed.ts`.

## Entradas esperadas

- **Adicionar:** Riot ID `Nome#TAG` + a line/time.
  - Times: "Black", "line 1", "principal" → `black`; "Silver", "line 2" → `silver`. Se faltar, **pergunte**.
  - Opcional: lane ("jg"/"jungle"/"selva" → `JUNGLE`; "sup"/"suporte" → `SUPPORT`; "adc"/"bot"/"atirador" → `ADC`; "mid"/"meio" → `MID`; "top" → `TOP`). Sem lane, o site mostra a mais jogada nas Solo/Duo recentes (não precisa perguntar).
  - Opcional: nome de exibição (padrão: última palavra do nick, "Osamu Chuuya" → "Chuuya").
- **Remover:** nome do reserva (exibição ou Riot ID) e, se ele estiver nos dois times, de qual.

## Passo a passo

1. **Chave da Riot válida?**
   ```bash
   K=$(grep '^RIOT_API_KEY=' .env | cut -d= -f2 | tr -d '\r"'); curl -s -o /dev/null -w "%{http_code}" -H "X-Riot-Token: $K" https://br1.api.riotgames.com/lol/status/v4/platform-data
   ```
   - `200` = ok. `401`/`403` = a chave da Riot foi recusada (a Personal Key não expira; provavelmente foi revogada ou o `.env` está errado): peça ao usuário para conferir o `.env` e o segredo `RIOT_API_KEY` no GitHub. Pare até isso ser feito.

2. **Ver o elenco atual** (titulares, vagas e linhas `RESERVA`):
   ```bash
   npm run manage -- list
   ```

3. **Executar a alteração.**
   - Adicionar:
     ```bash
     npm run manage -- reserve:add --riot "Nome#TAG" --team black [--role MID] [--name "Exibição"]
     ```
     - Valida a conta na Riot e reaproveita o jogador se ele já existe no banco (ex.: ex-titular), senão cria.
     - Recusa se a pessoa já for **titular** do mesmo time. Pergunte ao usuário se é para rebaixar; se sim, primeiro `player:remove --slug <slug>` (skill `ingen-jogador`) e depois o `reserve:add`.
     - Se já for reserva desse time, só atualiza a lane (quando `--role` é passado).
     - Se o slug gerado já for de outra pessoa, o script recusa: repita com `--slug`.
   - Remover:
     ```bash
     npm run manage -- reserve:remove --slug <slug> [--team black|silver]
     ```
     - Sem `--team`, tira da reserva de todos os times. O jogador continua no banco (histórico com data de saída).
   - **Promover reserva a titular:** use a skill `ingen-jogador` (`player:add` com o mesmo Riot ID, o time e a lane). O script já tira a pessoa da reserva daquele time.

4. **Puxar os dados da Riot** (só ao adicionar; ~20 s, apenas o reserva):
   ```bash
   SYNC_ONLY=<slug> SYNC_MATCH_COUNT=50 npm run sync
   ```
   - `SYNC_ONLY` sincroniza só esse jogador e não mexe no `last_sync` nem na Twitch.
   - Erro `400 ... Exception decrypting`: o PUUID gravado veio de outra chave da Riot. Avise o usuário (a chave do `.env` e a do GitHub precisam ser a mesma) e não tente contornar editando o banco.

5. **Publicar na Vercel.** Mudança só de dados: um commit vazio dispara o deploy e limpa o cache. Trabalhe na `main` (ou faça fast-forward da branch atual para a `main`):
   ```bash
   git commit --allow-empty -m "elenco: <resumo, ex.: Fulano entra como reserva da INGEN Black>" && git push origin main
   ```
   - Pré-requisito: o suporte a reservas (`src/components/roster/ReserveList.tsx`) precisa estar na `main`. Confira com `git show origin/main:src/components/roster/ReserveList.tsx > /dev/null`; se falhar, avise o usuário que o código ainda não foi publicado e não faça o commit vazio.

6. **Verificar em produção** (o deploy leva ~1–2 min):
   ```bash
   curl -s https://ingengg.com.br/elenco | grep -o "Reservas" | head -1
   curl -s https://ingengg.com.br/elenco | grep -c "<Nome#TAG>"
   ```
   - Ao adicionar: "Reservas" aparece e a contagem do Riot ID é maior que 0.
   - Ao remover o último reserva de todos os times: "Reservas" não aparece mais.

## Relatório ao usuário

Em português, curto:
- quem entrou ou saiu da reserva, e de qual time;
- a lane (cadastrada ou "a mais jogada nas Solo/Duo") e o elo puxado da Riot;
- o link `https://ingengg.com.br/elenco#<black|silver>` e o resultado da verificação.

## Regras do site a respeitar

- Reserva nunca vira titular sozinho, nem ocupa ou fecha vaga aberta.
- O site nunca exibe "Line 1/2": use INGEN Black / INGEN Silver.
- Titulares são outra skill: `ingen-jogador`. Twitch: `ingen-twitch` (o selo "Ao vivo" só aparece para titulares).
