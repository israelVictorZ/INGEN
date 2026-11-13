# INGEN · regras para toda sessão do Claude

@AGENTS.md

## Planejamento e PDF de acompanhamento (obrigatório)

1. **Antes de começar**, leia [`docs/planejamento.md`](docs/planejamento.md): é a fonte única de pendências, prioridades e linha do tempo.
2. **Ao concluir uma tarefa**, atualize o arquivo: tire o item da onda, registre no Apêndice D (já resolvido) e na linha do tempo (Apêndice E). Inclua o que for feito fora do código (Vercel, Registro.br, OBS, GitHub).
3. **Tarefa nova ou mudança de prioridade:** apresente ao Israel primeiro. Só entra no arquivo depois de aprovada.
4. **PDF:** aplique as mesmas mudanças em `docs/pdf/planejamento.html` e rode `npm run docs:pdf`. O PDF sai em `docs/INGEN-planejamento.pdf` da **pasta principal** do projeto (fora do git), mesmo rodando de uma worktree. Confira a paginação e ofereça o arquivo para download.

## Trabalho em paralelo

- Uma sessão por assunto, de preferência isolada (worktree com branch própria). Não mexa em arquivos de outra sessão.
- Faça commit só dos seus arquivos (`git add <caminhos>`, nunca `git add -A` com mudanças alheias na pasta).
- Antes de enviar para a `main` (a Vercel publica a `main`), rode `git fetch` e confirme que é avanço rápido (`git merge-base --is-ancestor origin/main HEAD`).

## Regras do site

- Todo link para fora do site abre em nova aba (`target="_blank" rel="noopener noreferrer"`; ver `src/lib/links.ts`).
- Ao mexer em `public/stream/core`, rode `node scripts/build-stream-se.mjs` para regerar o widget do StreamElements.
