import type { Metadata } from "next";
import { RevealScope } from "@/components/motion/RevealScope";
import { Split } from "@/components/motion/Split";
import { SectionHead, ButtonLink } from "@/components/ui";
import { GuideToc } from "@/components/stream/GuideToc";

/**
 * Guia de uso do kit de stream. Interna como o /stream: sem link no site, fora do sitemap,
 * noindex aqui e X-Robots-Tag em /stream/* (next.config.ts).
 */
export const metadata: Metadata = { title: "Como usar o kit de stream" };

// ---------------------------------------------------------------------------
// peças de layout
// ---------------------------------------------------------------------------

const C = ({ children }: { children: React.ReactNode }) => (
  <code className="bg-bg-3 px-1.5 py-0.5 font-mono text-[0.82em] text-white-dim">{children}</code>
);
const B = ({ children }: { children: React.ReactNode }) => <b className="font-semibold text-white">{children}</b>;

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div data-reveal="up" className={`clip-step bg-bg-2 p-6 md:p-8 ${className}`}>
      {children}
    </div>
  );
}

function Steps({ items }: { items: React.ReactNode[] }) {
  return (
    <ol className="flex flex-col gap-4">
      {items.map((it, i) => (
        <li key={i} className="grid grid-cols-[2.25rem_1fr] gap-3 text-[0.95rem] leading-relaxed text-gray">
          <span className="clip-step-sm grid size-9 place-items-center bg-bg-3 font-mono text-xs text-green">{String(i + 1).padStart(2, "0")}</span>
          <span className="pt-1.5">{it}</span>
        </li>
      ))}
    </ol>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-6 border-l-2 border-green bg-deep/40 px-4 py-3 text-sm leading-relaxed text-white-dim">
      <span className="mr-2 font-mono text-[0.68rem] uppercase tracking-[0.16em] text-green">Dica</span>
      {children}
    </p>
  );
}

/** Desenho de uma tela 1920×1080 com as áreas onde cada fonte entra (coordenadas reais). */
function Screen({ boxes, caption }: { boxes: { x: number; y: number; w: number; h: number; label: string; tone?: "green" | "gray" | "game" }[]; caption: string }) {
  return (
    <figure data-reveal="up">
      <div className="relative aspect-video w-full overflow-hidden bg-bg-0 shadow-[inset_0_0_0_1px_var(--color-line)]">
        <div className="pointer-events-none absolute inset-0 bg-dots opacity-60" />
        {boxes.map((b) => (
          <div
            key={b.label}
            className={`absolute flex items-center justify-center p-1 text-center font-mono text-[clamp(0.5rem,1.1vw,0.72rem)] uppercase leading-tight tracking-[0.12em] ${
              b.tone === "gray"
                ? "border border-dashed border-gray-dim/60 bg-bg-3/60 text-gray"
                : b.tone === "game"
                  ? "border border-line bg-bg-2 text-gray-dim"
                  : "border border-green/70 bg-deep/50 text-lime"
            }`}
            style={{ left: `${(b.x / 1920) * 100}%`, top: `${(b.y / 1080) * 100}%`, width: `${(b.w / 1920) * 100}%`, height: `${(b.h / 1080) * 100}%` }}
          >
            {b.label}
          </div>
        ))}
      </div>
      <figcaption className="mt-3 font-mono text-[0.68rem] uppercase tracking-[0.14em] text-gray-dim">{caption}</figcaption>
    </figure>
  );
}

function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <details data-reveal="up" className="group clip-step-sm bg-bg-2 open:bg-bg-3">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-white [&::-webkit-details-marker]:hidden">
        <span className="font-medium">{q}</span>
        <span className="font-mono text-green transition-transform group-open:rotate-45">+</span>
      </summary>
      <div className="px-5 pb-5 text-sm leading-relaxed text-gray">{children}</div>
    </details>
  );
}

const PIECES = [
  ["Fundo do cliente", "cliente.html", "1920 × 1080", "Cena fora de partida (lobby, fila, seleção de campeões)"],
  ["Tampão de mapa", "tampao-mapa.html", "Tamanho do minimapa", "Em partida, por cima do minimapa"],
  ["Borda da webcam", "webcam.html", "Tamanho da câmera", "Por cima da câmera, em qualquer cena"],
  ["Chat", "chat.html", "Livre (ex.: 524 × 616)", "Só se quiser o chat separado do fundo"],
  ["Alertas", "alertas.html", "1920 × 1080", "Em todas as cenas, por cima de tudo"],
  ["Já vai começar", "comecando.html", "1920 × 1080", "Antes de começar"],
  ["Volta já", "volta-ja.html", "1920 × 1080", "Pausas"],
  ["Encerrando", "encerrando.html", "1920 × 1080", "Fim da live"],
];

const TOC = [
  { id: "inicio", label: "Antes de começar" },
  { id: "links", label: "Pegar seus links" },
  { id: "fonte", label: "Adicionar no OBS" },
  { id: "cenas", label: "Montar as cenas" },
  { id: "partida", label: "Em partida" },
  { id: "chat", label: "Chat e alertas" },
  { id: "opcoes", label: "Opções das peças" },
  { id: "problemas", label: "Deu ruim?" },
];

// ---------------------------------------------------------------------------

export default function StreamHelpPage() {
  return (
    <RevealScope>
      <section className="relative overflow-hidden pb-12 pt-36 md:pt-44">
        <div className="pointer-events-none absolute inset-0 bg-lines" />
        <div className="wrap relative">
          <p data-reveal="fade" className="label-mono">Uso interno · guia do kit de stream</p>
          <Split as="h1" className="mt-4 font-display text-[clamp(3.5rem,11vw,10rem)] font-black uppercase leading-[0.82] text-white">
            Como <span className="text-gray-dim">usar.</span>
          </Split>
          <p data-reveal="up" className="mt-6 max-w-xl text-gray">
            Passo a passo para colocar os overlays da INGEN na sua live, do zero. Leva uns 15 minutos e você só faz uma vez: depois o nick, o elo e o
            canal se atualizam sozinhos.
          </p>
          <div data-reveal="up" className="mt-8">
            <ButtonLink href="/stream">Abrir o kit</ButtonLink>
          </div>
          {/* sem data-reveal aqui: transform no pai quebraria a barra fixa do sumário */}
          <div className="mt-12">
            <GuideToc items={TOC} />
          </div>
        </div>
      </section>

      <div className="wrap flex flex-col gap-28 pb-32">
        {/* 01 */}
        <section id="inicio" className="scroll-mt-36">
          <SectionHead n="01" label="Antes de começar" title="Você só" muted="precisa de três coisas.">
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              <Card>
                <p className="label-mono text-green">Programa</p>
                <p className="mt-3 text-gray">
                  <B>OBS Studio</B> (grátis) ou <B>Streamlabs Desktop</B>. Qualquer programa com &quot;Fonte de navegador&quot; também serve.
                </p>
              </Card>
              <Card>
                <p className="label-mono text-green">Seu cadastro no site</p>
                <p className="mt-3 text-gray">
                  Seu nome precisa aparecer no <B>Elenco</B>. É de lá que vêm nick, time, lane e elo. Para o chat entrar sozinho, sua Twitch tem que estar
                  cadastrada (peça para a staff).
                </p>
              </Card>
              <Card>
                <p className="label-mono text-green">Cliente em 1280 × 720</p>
                <p className="mt-3 text-gray">
                  No cliente do LoL: <B>Configurações → Cliente → Tamanho da janela → 1280 × 720</B>. É o tamanho do espaço reservado no fundo.
                </p>
              </Card>
            </div>
          </SectionHead>
        </section>

        {/* 02 */}
        <section id="links" className="scroll-mt-36">
          <SectionHead n="02" label="Pegar seus links" title="Escolha seu nome," muted="copie os links.">
            <div className="mt-10 grid gap-5 lg:grid-cols-[1fr_1.1fr]">
              <Card>
                <Steps
                  items={[
                    <>Abra o <B>kit de stream</B> (botão &quot;Abrir o kit&quot; lá em cima).</>,
                    <>Em <B>Quem vai fazer a live?</B>, escolha seu nome. As prévias já mostram seu nick e seu elo.</>,
                    <>Se sua Twitch não estiver cadastrada, preencha <B>Canal da Twitch</B> (só o nome, sem o link).</>,
                    <>Em cada peça, ligue ou desligue as <B>opções</B> (ex.: &quot;Tenho câmera&quot;). A prévia muda na hora.</>,
                    <>Clique em <B>Copiar link</B>. Cada link vira uma fonte no OBS.</>,
                  ]}
                />
                <Tip>O kit lembra o que você preencheu neste navegador. Pode fechar e voltar depois.</Tip>
              </Card>
              <div data-reveal="up" className="clip-step max-w-[calc(100vw-2*var(--gutter))] overflow-x-auto bg-bg-2">
                <table className="w-full min-w-[420px] text-left text-sm">
                  <thead>
                    <tr className="font-mono text-[0.66rem] uppercase tracking-[0.14em] text-gray-dim">
                      <th className="px-5 pb-3 pt-6 font-normal">Peça</th>
                      <th className="px-3 pb-3 pt-6 font-normal">Tamanho</th>
                      <th className="px-5 pb-3 pt-6 font-normal">Onde usar</th>
                    </tr>
                  </thead>
                  <tbody className="[&_td]:border-t [&_td]:border-line [&_td]:py-3">
                    {PIECES.map(([name, , size, where]) => (
                      <tr key={name}>
                        <td className="px-5 font-medium text-white">{name}</td>
                        <td className="whitespace-nowrap px-3 font-mono text-xs text-green">{size}</td>
                        <td className="px-5 text-gray">{where}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </SectionHead>
        </section>

        {/* 03 */}
        <section id="fonte" className="scroll-mt-36">
          <SectionHead n="03" label="Adicionar no OBS" title="Cada link é uma" muted="fonte de navegador.">
            <div className="mt-10 grid gap-5 lg:grid-cols-2">
              <Card>
                <p className="label-mono">OBS Studio</p>
                <div className="mt-6">
                  <Steps
                    items={[
                      <>No quadro <B>Fontes</B>, clique em <B>+</B> e escolha <B>Navegador</B>. Dê um nome (ex.: &quot;INGEN · Alertas&quot;).</>,
                      <>Deixe <B>Arquivo local desmarcado</B> e cole o link no campo <B>URL</B>.</>,
                      <>Em <B>Largura</B> e <B>Altura</B>, use o tamanho da peça (tabela acima).</>,
                      <>Desmarque <B>Desligar fonte quando não estiver visível</B> no chat e nos alertas, senão eles desconectam.</>,
                      <>Nas telas com contagem, marque <B>Atualizar navegador quando a cena ficar ativa</B> para a contagem recomeçar.</>,
                      <>Para os alertas tocarem som pelo OBS, marque <B>Controlar áudio via OBS</B>.</>,
                    ]}
                  />
                </div>
              </Card>
              <div className="flex flex-col gap-5">
                <Card>
                  <p className="label-mono">Streamlabs Desktop</p>
                  <p className="mt-4 leading-relaxed text-gray">
                    É igual: <B>Adicionar fonte → Fonte de navegador</B>, cole o link em <B>URL</B> e ajuste largura e altura. As outras opções têm os mesmos
                    nomes.
                  </p>
                </Card>
                <Card>
                  <p className="label-mono">Posição exata</p>
                  <p className="mt-4 leading-relaxed text-gray">
                    No OBS, clique com o botão direito na fonte → <B>Transformar → Editar transformação</B> (ou <C>Ctrl + E</C>). Ali você digita a
                    posição (x, y) e o tamanho certinhos, em vez de arrastar no olho.
                  </p>
                </Card>
              </div>
            </div>
          </SectionHead>
        </section>

        {/* 04 */}
        <section id="cenas" className="scroll-mt-36">
          <SectionHead n="04" label="Montar as cenas" title="Cinco cenas" muted="resolvem a live inteira.">
            <div className="mt-10 grid gap-5 md:grid-cols-5">
              {[
                ["Começando", "Já vai começar + alertas"],
                ["Lobby", "Fundo do cliente + cliente + câmera + alertas"],
                ["Partida", "Jogo + tampão + câmera com borda + alertas"],
                ["Pausa", "Volta já + alertas"],
                ["Fim", "Encerrando"],
              ].map(([t, d], i) => (
                <Card key={t} className="!p-5">
                  <span className="font-pixel text-3xl text-white/15">{String(i + 1).padStart(2, "0")}</span>
                  <p className="mt-2 font-display text-2xl font-extrabold uppercase text-white">{t}</p>
                  <p className="mt-2 text-sm text-gray">{d}</p>
                </Card>
              ))}
            </div>

            <div className="mt-14 grid items-start gap-8 lg:grid-cols-[1.3fr_1fr]">
              <Screen
                caption="Cena Lobby · posições reais em 1920 × 1080"
                boxes={[
                  { x: 40, y: 40, w: 1280, h: 720, label: "Cliente do LoL · x 40 · y 40 · 1280×720" },
                  { x: 1344, y: 40, w: 536, h: 302, label: "Câmera · x 1344 · y 40 · 536×302" },
                  { x: 1344, y: 366, w: 536, h: 674, label: "Chat (já vem no fundo)", tone: "gray" },
                  { x: 40, y: 784, w: 1280, h: 256, label: "Seu nick, lane, elo e redes (já vem no fundo)", tone: "gray" },
                ]}
              />
              <Card>
                <p className="label-mono">Montando a cena Lobby</p>
                <div className="mt-6">
                  <Steps
                    items={[
                      <>Adicione o <B>Fundo do cliente</B> (1920 × 1080) por baixo de tudo.</>,
                      <>Adicione <B>Captura de janela</B> e escolha a janela <C>League of Legends (TM) Client</C>. Coloque em x 40, y 40 (1280 × 720).</>,
                      <>Adicione sua <B>câmera</B> em x 1344, y 40, tamanho 536 × 302.</>,
                      <>Por cima da câmera, a <B>Borda da webcam</B> com o mesmo tamanho e posição.</>,
                      <>Por fim, os <B>Alertas</B> (1920 × 1080) no topo da lista.</>,
                    ]}
                  />
                </div>
                <Tip>
                  Sem câmera? No kit, desligue <B>Tenho câmera</B> no Fundo do cliente e copie o link de novo: o chat ocupa a coluna inteira.
                </Tip>
              </Card>
            </div>
          </SectionHead>
        </section>

        {/* 05 */}
        <section id="partida" className="scroll-mt-36">
          <SectionHead n="05" label="Em partida" title="Câmera entre o HUD" muted="e o minimapa.">
            <div className="mt-10 grid items-start gap-8 lg:grid-cols-[1.3fr_1fr]">
              <Screen
                caption="Cena Partida · posições aproximadas, ajuste ao seu HUD"
                boxes={[
                  { x: 0, y: 0, w: 1920, h: 1080, label: "", tone: "game" },
                  { x: 600, y: 930, w: 720, h: 150, label: "HUD do jogo", tone: "gray" },
                  { x: 1370, y: 860, w: 260, h: 195, label: "Câmera + borda" },
                  { x: 1640, y: 800, w: 280, h: 280, label: "Tampão de mapa" },
                ]}
              />
              <Card>
                <Steps
                  items={[
                    <>Adicione <B>Captura de jogo</B> com o LoL.</>,
                    <>Adicione o <B>Tampão de mapa</B> e deixe do tamanho do seu minimapa, encaixado em cima dele no canto inferior direito.</>,
                    <>Coloque a <B>câmera</B> à esquerda do tampão, no espaço livre entre o HUD e o mapa, com a <B>Borda da webcam</B> por cima (mesmo tamanho).</>,
                    <>Os <B>Alertas</B> por cima de tudo. Se cobrirem algo do jogo, escolha <B>Posição: Centro</B> no kit.</>,
                  ]}
                />
                <Tip>
                  O tamanho do minimapa muda com <B>Configurações → Interface → Escala do minimapa</B>. Tire um print da partida, cole no OBS e ajuste o
                  tampão até cobrir o mapa inteiro. Ele é quadrado: use a mesma largura e altura.
                </Tip>
              </Card>
            </div>
          </SectionHead>
        </section>

        {/* 06 */}
        <section id="chat" className="scroll-mt-36">
          <SectionHead n="06" label="Chat e alertas" title="Sem login," muted="sem token, sem senha.">
            <div className="mt-10 grid gap-5 lg:grid-cols-2">
              <Card>
                <p className="label-mono">Como funcionam</p>
                <p className="mt-4 leading-relaxed text-gray">
                  O chat e os alertas leem o chat da sua Twitch como um espectador anônimo. Mostram <B>mensagens com emotes</B> (Twitch, 7TV, BTTV e FFZ),{" "}
                  <B>subs, resubs, subs de presente, raids e bits</B>. Mensagens apagadas pela moderação somem do overlay também.
                </p>
                <p className="mt-4 leading-relaxed text-gray">
                  O que a Twitch <B>não</B> manda pelo chat: <B>follows</B>. Para eles, use o widget do StreamElements ao lado.
                </p>
                <Tip>
                  No kit, a peça Alertas tem botões de teste (Follow, Sub, Raid…). Use para ver o visual antes de ir ao vivo.
                </Tip>
              </Card>
              <Card>
                <p className="label-mono">Alertas com follows (StreamElements)</p>
                <div className="mt-6">
                  <Steps
                    items={[
                      <>Entre em <B>streamelements.com</B> com sua Twitch e vá em <B>Streaming tools → Overlays → New overlay</B> (1920 × 1080).</>,
                      <>Clique em <B>Add widget → Static / Custom → Custom widget</B> e depois em <B>Open editor</B>.</>,
                      <>No kit, use os botões <B>Copiar HTML / CSS / JS / Fields</B> e cole cada um na aba de mesmo nome. Em <B>Data</B>, deixe <C>{"{}"}</C>.</>,
                      <>Salve, ajuste time, posição e som no painel do widget e teste com <B>Emulate</B>.</>,
                      <>Copie o link do overlay e adicione no OBS como Fonte de navegador 1920 × 1080.</>,
                    ]}
                  />
                </div>
                <Tip>
                  Use <B>ou</B> o StreamElements <B>ou</B> a peça Alertas do kit. Os dois juntos mostram cada sub duas vezes.
                </Tip>
              </Card>
            </div>
          </SectionHead>
        </section>

        {/* 07 */}
        <section id="opcoes" className="scroll-mt-36">
          <SectionHead n="07" label="Opções das peças" title="Quer mudar algo?" muted="É só clicar.">
            <div className="mt-10 grid gap-5 lg:grid-cols-[1fr_1.2fr]">
              <Card>
                <p className="label-mono">Como funciona</p>
                <div className="mt-6">
                  <Steps
                    items={[
                      <>No kit, cada peça tem <B>botões de opção</B> embaixo da prévia: ligar a câmera, esconder a legenda, mudar a posição do alerta…</>,
                      <>Clique na opção que você quer. A <B>prévia</B> e o <B>link</B> mudam na hora.</>,
                      <>Clique em <B>Copiar link</B> de novo.</>,
                      <>No OBS, clique duas vezes na fonte daquela peça, troque o que está no campo <B>URL</B> pelo link novo e dê <B>OK</B>.</>,
                    ]}
                  />
                </div>
                <Tip>Mudou de opção e nada aconteceu na live? Faltou o passo 4: o OBS só usa o link novo depois que você colar ele na fonte.</Tip>
              </Card>
              <div data-reveal="up" className="clip-step max-w-[calc(100vw-2*var(--gutter))] overflow-x-auto bg-bg-2">
                <table className="w-full min-w-[420px] text-left text-sm">
                  <thead>
                    <tr className="font-mono text-[0.66rem] uppercase tracking-[0.14em] text-gray-dim">
                      <th className="px-5 pb-3 pt-6 font-normal">Peça</th>
                      <th className="px-3 pb-3 pt-6 font-normal">Opção no kit</th>
                      <th className="px-5 pb-3 pt-6 font-normal">O que faz</th>
                    </tr>
                  </thead>
                  <tbody className="[&_td]:border-t [&_td]:border-line [&_td]:py-3">
                    {[
                      ["Fundo do cliente", "Tenho câmera", "Desligada, o espaço da câmera some e o chat ocupa a coluna"],
                      ["Fundo do cliente", "Chat dentro do fundo", "Desligada, o espaço do chat fica vazio para você usar outro chat"],
                      ["Tampão de mapa", "Legenda · Radar", "Mostra ou esconde o texto “Mapa oculto” e o radar girando"],
                      ["Borda da webcam", "Etiqueta com nick · Selo Ao vivo", "Mostra ou esconde a etiqueta verde e o selo"],
                      ["Chat", "Mensagens somem", "Apaga cada mensagem depois de 30 s ou 1 min"],
                      ["Chat", "Letra P · M · G", "Tamanho do texto"],
                      ["Chat", "Mostrar !comandos", "Mostra mensagens como !elo e !discord"],
                      ["Alertas", "Posição · Duração · Som", "Onde aparece, quanto tempo fica e se toca som"],
                      ["Telas", "Chat ao lado", "Coloca o chat do lado direito da tela"],
                      ["Já vai começar · Volta já", "Contagem · Ou até o horário", "Contagem regressiva em minutos ou até uma hora marcada (ex.: 21:30)"],
                      ["Telas", "Título e frase de baixo", "Troca os textos da tela. Em branco, fica o texto padrão"],
                    ].map(([p, o, what]) => (
                      <tr key={p + o}>
                        <td className="whitespace-nowrap px-5 font-medium text-white">{p}</td>
                        <td className="px-3 font-mono text-xs text-green">{o}</td>
                        <td className="px-5 text-gray">{what}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <details data-reveal="up" className="group clip-step-sm mt-5 bg-bg-2 open:bg-bg-3">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-white [&::-webkit-details-marker]:hidden">
                <span className="font-medium">Para curiosos: o que é aquele texto comprido no link?</span>
                <span className="font-mono text-green transition-transform group-open:rotate-45">+</span>
              </summary>
              <div className="flex flex-col gap-3 px-5 pb-5 text-sm leading-relaxed text-gray">
                <p>
                  O link tem duas partes. Antes do <C>?</C> fica <B>qual peça</B> é (ex.: <C>…/overlays/cliente.html</C>). Depois do <C>?</C> vêm as{" "}
                  <B>configurações</B>, separadas por <C>&amp;</C>: por exemplo <C>jogador=atlas</C> diz quem é você e <C>cam=0</C> desliga a câmera.
                </p>
                <p>Você nunca precisa escrever isso: os botões do kit montam o link sozinhos. Se estragar algo, é só copiar de novo no kit.</p>
              </div>
            </details>
          </SectionHead>
        </section>

        {/* 08 */}
        <section id="problemas" className="scroll-mt-36">
          <SectionHead n="08" label="Deu ruim?" title="Os problemas" muted="mais comuns.">
            <div className="mt-10 grid gap-3 lg:grid-cols-2">
              <Faq q="A fonte ficou preta ou vazia">
                Confira se o link foi colado no campo <B>URL</B> com <B>Arquivo local desmarcado</B>. Depois clique com o botão direito na fonte →{" "}
                <B>Propriedades → Atualizar cache da página atual</B>.
              </Faq>
              <Faq q="Meu nick ou elo não aparece">
                Copie o link de novo no kit <B>depois</B> de escolher seu nome em &quot;Quem vai fazer a live?&quot; e cole na fonte. Se você acabou de
                entrar no elenco, o elo aparece depois da próxima atualização do site (a cada 30 minutos).
              </Faq>
              <Faq q="O chat não mostra nada">
                Veja se o canal está certo: o chat lê a Twitch cadastrada no site ou o <B>Canal da Twitch</B> preenchido no kit. Mande uma mensagem no seu
                chat para testar. E desmarque &quot;Desligar fonte quando não estiver visível&quot;.
              </Faq>
              <Faq q="O alerta não aparece / não toca som">
                Teste pelos botões no kit. Sem som no OBS: marque <B>Controlar áudio via OBS</B> na fonte e veja se ela não está mutada no Mixer de áudio.
                Follows só aparecem pelo StreamElements.
              </Faq>
              <Faq q="Apareceu sub repetido">
                Você está usando a peça Alertas <B>e</B> o widget do StreamElements ao mesmo tempo. Fique com um só.
              </Faq>
              <Faq q="A peça ficou cortada ou esticada">
                A largura e a altura da fonte têm que ser as da tabela. Se você esticou arrastando, use <B>Editar transformação</B> (<C>Ctrl + E</C>) e
                clique em <B>Redefinir</B>.
              </Faq>
              <Faq q="O cliente não encaixa no espaço">
                O cliente precisa estar em <B>1280 × 720</B> (Configurações → Cliente → Tamanho da janela). Na Captura de janela, posição x 40, y 40.
              </Faq>
              <Faq q="A contagem não reinicia">
                Na fonte da tela, marque <B>Atualizar navegador quando a cena ficar ativa</B>. Toda vez que você entrar na cena, a contagem começa de novo.
              </Faq>
            </div>
            <Card className="mt-10">
              <p className="text-gray">
                Ainda travou? Mande no grupo do time um <B>print da tela do OBS</B> e o <B>link</B> que você usou: quem já montou ajuda rapidinho.
              </p>
            </Card>
          </SectionHead>
        </section>
      </div>
    </RevealScope>
  );
}
