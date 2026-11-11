# INGEN: Direção visual e de animação

> Site **dark**, criativo e único, com muitas animações leves (GSAP). Paleta: **verde, preto e branco**.

Logo: [`brand/ingen-logo.webp`](brand/ingen-logo.webp) (1254×1254). Pendente: versão vetorial (SVG). Ver a seção "Pendências do logo".

---

## 1. Paleta (extraída do logo)

Valores amostrados direto dos pixels do símbolo.

### Verdes: o gradiente "energia" do escudo

| Token | Hex | Onde aparece no logo |
|---|---|---|
| `--green-lime` | `#7CF94F` | topo das torres (mais amarelado) |
| `--green` | `#3DFD4E` | meio do escudo (verde principal) |
| `--green-mint` | `#00F07F` | ponta inferior (mais azulado) |
| `--green-deep` | `#0B3D1E` | auxiliar: fundos de destaque e badges |
| `--green-glow` | `rgb(61 253 78 / .35)` | auxiliar: brilhos e sombras |

```css
--grad-ingen: linear-gradient(180deg, #7CF94F 0%, #3DFD4E 45%, #00F07F 100%);
```

### Pretos: fundos e superfícies

| Token | Hex | Uso |
|---|---|---|
| `--bg-0` | `#04060A` | preto do contorno do logo; fundo mais profundo |
| `--bg-1` | `#0A0D13` | fundo padrão das páginas |
| `--bg-2` | `#131519` | superfícies (cards) |
| `--bg-3` | `#1B1F25` | superfícies elevadas, hover |
| `--line` | `#262B33` | bordas e grids finos |

### Brancos e cinzas: texto

| Token | Hex | Uso |
|---|---|---|
| `--white` | `#FEFFFA` | brilho das letras do logo; títulos |
| `--white-dim` | `#E3E4DD` | sombra das letras; texto principal |
| `--gray` | `#8A8F98` | texto secundário |
| `--gray-dim` | `#5A606A` | legendas, labels |

### Cores auxiliares (uso pontual)

| Token | Hex | Uso |
|---|---|---|
| `--silver` | `#C9CDD3` | toque de identidade da INGEN Silver (metálico) |
| `--loss` | `#FF4D5E` | derrotas no histórico de partidas, e só isso |

### Black e Silver sem rótulo de "line"

As duas compartilham a mesma paleta e só mudam o acento:
- **INGEN Black:** acento no gradiente verde completo.
- **INGEN Silver:** acento prata (`--silver`) com detalhes em `--green-mint`.

---

## 2. Tipografia

| Papel | Fonte | Por quê |
|---|---|---|
| Display (títulos grandes, nicks) | **Big Shoulders Display** (900/800) | condensada e esportiva, conversa com as letras do logo |
| Texto | **Geist** | limpa e moderna (mesma família visual do neon.com) |
| Mono / HUD | **Geist Mono** | labels, números de elo, LP, KDA, numeração de seções |

Todas gratuitas, servidas via `next/font`.

**Padrões tipográficos herdados das referências:**
- **Título em dois tons:** frase principal em `--white` e continuação em `--gray`. Aparece no neon.com e no ng.cash.
- **Numeração de seção em mono gigante e apagada** (`01`, `02`…), estilo neon.com.
- **Labels em mono caixa-alta** com um marcador verde (`▶ ELENCO`).

---

## 3. O que levar de cada referência

### neon.com
- Fundo preto puro, muito respiro, tipografia grande.
- **Visuais em grade de pixels** (gráficos feitos de quadradinhos) e **grids de linhas verticais finas**.
- Diagramas que se desenham no scroll (linhas que se ramificam).
- Mono para dados técnicos.

### ng.cash
- Seções **fixadas (pinned) com animação controlada pelo scroll**: a cena muda conforme você rola.
- **Marquee** de texto gigante atravessando a tela.
- Elementos em **pixel art 3D** (as moedas).
- **"Troca de skin"** do cartão. Para LoL isso é perfeito: os cards dos jogadores trocam a splash art.
- Texto que revela gradiente de branco para cinza.

### Referências extras para estudar

| Site | O que observar |
|---|---|
| [igloo.inc](https://www.igloo.inc) | transições 3D e de scroll extremamente fluidas (Site of the Year na Awwwards) |
| [lusion.co](https://lusion.co) | interações com o cursor e WebGL leve |
| [basement.studio](https://basement.studio) | estética dark e "hacker", tipografia agressiva |
| [linear.app](https://linear.app) | brilhos sutis, bordas em gradiente, micro-interações |
| [resend.com](https://resend.com) | dark minimalista, reveals limpos |
| [gsap.com/showcase](https://gsap.com/showcase/) | vitrine oficial de sites feitos com GSAP |
| [Riot: Star Guardian (Awwwards)](https://awwwards.com/sites/riot-games-star-guardian) | linguagem visual da própria Riot |
| [Codrops](https://tympanus.net/codrops/) | tutoriais de efeitos GSAP (galerias, Flip, parallax) |

**Cuidado com a semelhança com a LOUD.** É um time brasileiro que também é verde e preto. A INGEN se diferencia pelo **gradiente lime → mint**, pelas **formas escalonadas/pixeladas** do escudo e pela estética de HUD.

---

## 4. Linguagem de forma: o "DNA" do escudo

O logo tem dois elementos fortes, que viram motivos visuais do site inteiro:

1. **Torres escalonadas** (os degraus no topo do escudo). Viram:
   - transições de página em **"escada de pixels"** (blocos verdes que sobem e descem em degraus);
   - `clip-path` escalonado nos cantos dos cards;
   - visuais em grade de quadradinhos.
2. **Chevron / ponta do escudo** (o "V" de baixo). Vira:
   - a divisória diagonal da tela de **comparação** (jogador A × jogador B);
   - a máscara que se abre na transição da hero para o elenco;
   - o indicador de scroll ("rolar para baixo").

Gradiente lime → mint nas **bordas animadas** (borda que "corre" ao redor do card no hover) via `@property` + `conic-gradient`.

---

## 5. Animações por área

**Princípios**
- Leves e com propósito.
- `transform` e `opacity` apenas.
- Tudo respeita `prefers-reduced-motion`.
- Nenhuma animação bloqueia conteúdo.

| Área | Animação |
|---|---|
| **Intro / hero** | O logo se monta a partir de **blocos de pixel** (stagger em grade). As letras INGEN entram com SplitText (contorno → preenchimento). Ao fundo, grid de linhas verticais com uma "varredura" de luz verde. Brilho verde segue o cursor. |
| **Transição hero → elenco** | A ponta do escudo cresce e vira uma máscara de tela cheia que revela o elenco. |
| **Mapa do Rift** | As rotas do minimapa se **desenham** (DrawSVG). Os cards dos jogadores "voam" para suas lanes. A lane acende no hover. |
| **Card do jogador** | Tilt 3D no hover. **Troca de skin:** a splash alterna entre os 3 campeões mais jogados. Borda em gradiente correndo. |
| **Números (elo, LP, winrate)** | Efeito de **embaralhar/decodificar** (ScrambleText) como um HUD. Contadores sobem ao entrar na tela. |
| **Marquee** | `INGEN BLACK — INGEN SILVER — VAGA ABERTA —` em texto vazado gigante. A velocidade reage ao scroll. |
| **Notícias** | Cards revelados com clip-path escalonado. A capa tem parallax sutil. |
| **Comparar** | Tela dividida pelo chevron. O gráfico radar **se transforma** entre jogadores (MorphSVG). As barras de métricas crescem lado a lado. |
| **Scouting** | Visual de "dossiê" em mono. As linhas da tabela entram em sequência. |
| **Troca de página** | Wipe de pixels verdes em degraus (View Transitions API + GSAP). |
| **Vaga aberta** | Silhueta com pulso verde e glitch leve. |

---

## 6. Pendências do logo

- O arquivo atual é uma imagem (webp) com fundo escuro. Para o site precisamos de **SVG vetorial com fundo transparente**. Só assim dá para animar as partes separadamente (torres, escudo, letras).
- Há dois **risquinhos verdes soltos** abaixo do escudo (perto da ponta). Confirmar se fazem parte do símbolo ou se são artefato e podem ser removidos.
- Se não houver SVG, posso **redesenhar o símbolo em vetor** fiel ao original para aprovação.
