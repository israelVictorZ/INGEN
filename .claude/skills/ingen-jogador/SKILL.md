---
name: ingen-jogador
description: Adiciona, troca ou remove jogadores do elenco da INGEN (INGEN Black / INGEN Silver) no site e publica na Vercel. Use quando o usuário enviar um Riot ID (Nome#TAG) e o time para cadastrar, pedir para tirar/remover um jogador, mudar alguém de time ou de lane, ou abrir/fechar vaga.
---

# Gerenciar jogadores da INGEN

O banco (Neon) é a fonte da verdade do elenco. Toda alteração passa por `scripts/manage.ts`, **nunca** por edição manual de SQL nem pelo `scripts/seed.ts` (o seed só popula banco vazio).

## Entradas esperadas

- **Adicionar:** Riot ID `Nome#TAG` + time (`Black`/`Silver`). Opcionais: lane (TOP, JUNGLE, MID, ADC, SUPPORT) e nome de exibição.
  - Mapeie os apelidos de time: "Black", "line 1", "principal" → `black`; "Silver", "line 2" → `silver`.
  - Mapeie as lanes: "jg"/"jungle"/"selva" → `JUNGLE`; "sup"/"suporte" → `SUPPORT`; "adc"/"bot"/"atirador" → `ADC`; "mid"/"meio" → `MID`; "top" → `TOP`.
- **Remover:** nome do jogador (exibição ou Riot ID).

Se faltar o time, pergunte. Se faltar a lane, deixe o script inferir pelas últimas Solo/Duo e informe o resultado no relatório.

## Passo a passo

1. **Chave da Riot válida?**
   ```bash
   K=$(grep '^RIOT_API_KEY=' .env | cut -d= -f2); curl -s -o /dev/null -w "%{http_code}" -H "X-Riot-Token: $K" https://br1.api.riotgames.com/lol/status/v4/platform-data
   ```
   - `200` = ok.
   - `401`/`403` = a Development Key expirou. Peça ao usuário para gerar outra em developer.riotgames.com (tem captcha), atualizar o `.env` e o segredo `RIOT_API_KEY` no GitHub. Pare até isso ser feito.

2. **Ver o elenco atual** (slugs, lanes ocupadas e vagas):
   ```bash
   npm run manage -- list
   ```

3. **Executar a alteração.**
   - Adicionar:
     ```bash
     npm run manage -- player:add --riot "Nome#TAG" --team black [--role MID] [--name "Exibição"]
     ```
     - O script valida a conta na Riot e grava o PUUID.
     - Fecha a vaga aberta da lane e, se o jogador estava em outro time, encerra a participação anterior (histórico preservado).
     - Nome de exibição padrão: a última palavra do nick ("IGN Atlas" → "Atlas"). Se o resultado ficar estranho, passe `--name`.
     - Se a lane já tiver dono, o script recusa. **Pergunte ao usuário** se é para substituir; se sim, repita com `--replace` (o anterior vira ex-jogador).
   - Remover:
     ```bash
     npm run manage -- player:remove --slug <slug>
     ```
     - Por padrão a lane vira **vaga aberta**. Use `--no-open-slot` só se o usuário disser que a vaga não deve aparecer.
     - O jogador não é apagado: vira ex-jogador, com data de saída.
   - Trocar de time ou de lane: rode `player:add` com o mesmo Riot ID e o novo time/lane.
   - **Trocou de nick:** o sync atualiza sozinho o Riot ID e o nome de exibição (em até ~5 min), mas **não** o endereço da página, de propósito, por causa do SEO. Para trocar o endereço, só quando o usuário pedir:
     ```bash
     npm run manage -- player:rename --slug <atual> --to <novo> [--name "Exibição"]
     ```
     - O endereço antigo vira redirecionamento 308 em `src/lib/slug-redirects.json` (lido pelo `next.config.ts`, e também usado em `/comparar?a=`).
     - Esse arquivo muda, então o passo 5 é um **commit de verdade** com ele, não um commit vazio. Até o deploy, o endereço antigo dá 404.
     - Na verificação, confira também: `curl -s -o /dev/null -w "%{http_code} %{redirect_url}" https://ingen-three.vercel.app/jogador/<antigo>` deve dar `308` para o novo.

4. **Puxar os dados da Riot** (obrigatório ao adicionar; ~1 min para jogador novo):
   ```bash
   SYNC_MATCH_COUNT=50 npm run sync
   ```

5. **Publicar na Vercel.** A mudança é só de dados, então um commit vazio dispara o deploy, limpa o cache do site e registra a alteração no histórico. Trabalhe na `main` (ou faça fast-forward da branch atual para a `main`):
   ```bash
   git commit --allow-empty -m "elenco: <resumo, ex.: entra Fulano (TOP, INGEN Black)>" && git push origin main
   ```

6. **Verificar em produção** (o deploy leva ~1–2 min):
   ```bash
   curl -s -o /dev/null -w "%{http_code}" https://ingen-three.vercel.app/jogador/<slug>
   curl -s https://ingen-three.vercel.app/elenco | grep -c "<Nome de exibição>"
   ```
   - Ao adicionar: espere `200` e a contagem maior que 0.
   - Ao remover: a página `/elenco` não deve mais ter o nome; a página do jogador continua existindo.

## Relatório ao usuário

Em português, curto:
- quem entrou ou saiu, com time e lane (dizendo se a lane foi inferida);
- o elo puxado da Riot;
- se a vaga foi aberta ou fechada;
- o link `https://ingen-three.vercel.app/jogador/<slug>` e o resultado da verificação.

## Regras do site a respeitar

- INGEN Black aparece sempre antes da Silver. O site nunca exibe "Line 1/2".
- Não editar `scripts/seed.ts` para mudanças de elenco.
- Twitch de jogador é outra skill: `ingen-twitch`.
- Reservas são outra skill: `ingen-reserva`. Se o usuário disser que alguém é reserva/suplente, use aquela. Um `player:add` de quem era reserva do mesmo time já o tira da reserva.
