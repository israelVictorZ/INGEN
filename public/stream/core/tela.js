/* INGEN · Telas cheias: monta "Já vai começar", "Volta já" e "Encerrando" a partir de data-modo no <body>. */
IG.ready(function () {
  "use strict";
  var modo = document.body.getAttribute("data-modo") || "inicio";
  var TXT = {
    inicio: { kicker: "Transmissão", l1: "A live", l2: "já vai começar", sub: "Pega a água, chama o duo e cola no chat.", done: "Começando agora" },
    pausa: { kicker: "Pausa rápida", l1: "A live", l2: "volta já", sub: "Não sai daí, já já tem mais.", done: "Voltando agora" },
    fim: { kicker: "Fim da transmissão", l1: "Valeu pela", l2: "live!", sub: "Segue a INGEN para não perder a próxima.", done: "" },
  }[modo];

  IG.applyTeam();
  var stage = document.getElementById("stage");
  IG.fitStage(stage);
  var canal = IG.opt("canal", "ingen_team");
  var withChat = IG.flag("chat", false);
  if (withChat) document.body.classList.add("has-chat");

  // fundo
  stage.insertAdjacentHTML("afterbegin", '<div class="ig-grid"></div><canvas class="ig-pixels" id="px"></canvas><div class="ig-vignette"></div>');
  IG.pixelField(document.getElementById("px"), {
    cell: 10, fps: 18,
    blobs: [
      { x: -0.02, y: 0.86, r: 0.17, s: 1.7, sp: 0.09, ax: 0.03, ay: 0.06 },
      { x: 0.08, y: 1.05, r: 0.12, s: 1.3, sp: 0.13, ph: 1.5 },
      { x: 1.02, y: 0.1, r: 0.13, s: 1.5, sp: 0.11, ph: 2.2 },
      { x: 0.99, y: 0.62, r: 0.07, s: 1.1, sp: 0.17, ph: 4 },
      { x: 0.6, y: 1.08, r: 0.08, s: 1.0, sp: 0.15, ph: 3 },
    ],
  });

  // topo
  var nome = IG.opt("nome", "");
  var socials = IG.socials();
  var top = IG.el("div", "top reveal");
  top.innerHTML =
    '<div class="top__brand"><img src="' + IG.logoSrc() + '" alt=""><span class="mono"><b>INGEN</b> · League of Legends</span></div>' +
    '<div class="top__socials">' + socials.map(function (s) { return "<span>" + s.icon + IG.esc(s.label) + "</span>"; }).join("") + "</div>";
  stage.appendChild(top);

  // centro
  var hero = IG.el("div", "hero");
  var kicker = nome ? "<b>" + IG.esc(nome) + "</b><span>·</span>" + IG.esc(IG.teamName()) : "<b>" + TXT.kicker + "</b><span>·</span>" + IG.esc(IG.teamName());
  hero.innerHTML =
    '<img class="hero__logo ig-logo ig-logo--pulse reveal" src="' + IG.logoSrc() + '" alt="INGEN">' +
    '<div class="hero__kicker mono reveal d1"><i class="live-dot"></i>' + kicker + "</div>" +
    '<h1 class="hero__title display"><span class="l1 reveal d2">' + IG.esc(IG.opt("titulo1", TXT.l1)) + '</span><span class="l2 grad-text reveal d3">' + IG.esc(IG.opt("titulo2", TXT.l2)) + "</span></h1>" +
    '<p class="hero__sub reveal d4">' + IG.esc(IG.opt("sub", TXT.sub)) + "</p>";
  stage.appendChild(hero);
  if (!IG.flag("logo", true) || withChat) hero.querySelector(".hero__logo").remove();

  // contagem regressiva: ?minutos=5 ou ?hora=21:30
  var minutos = IG.num("minutos", 0);
  var hora = IG.opt("hora", "");
  var target = 0;
  if (minutos > 0) target = Date.now() + minutos * 60000;
  else if (/^\d{1,2}:\d{2}$/.test(hora)) {
    var p = hora.split(":"), d = new Date();
    d.setHours(+p[0], +p[1], 0, 0);
    if (d.getTime() < Date.now() - 3600000) d.setDate(d.getDate() + 1);
    target = d.getTime();
  }

  if (modo === "fim") {
    var cards = IG.el("div", "cards reveal d5");
    var names = { instagram: "Instagram", twitch: "Twitch", discord: "Discord" };
    socials.forEach(function (s) {
      var c = IG.el("div", "card");
      c.innerHTML = s.icon + '<div class="t"><small>' + names[s.key] + "</small><b>" + IG.esc(s.label.replace(/^https?:\/\//, "")) + "</b></div>";
      cards.appendChild(c);
      IG.frame(c, { step: 7, corners: [2, 0, 2, 0], stroke: 2, fill: "rgba(10,13,19,.88)", dash: 120, base: 0.5 });
    });
    hero.appendChild(cards);
  } else {
    var count = IG.el("div", "count reveal d5");
    var N = 28;
    var blocks = IG.el("div", "blocks");
    for (var i = 0; i < N; i++) {
      var b = document.createElement("i");
      b.style.animationDelay = (i * 2.4) / N / 2 + "s";
      blocks.appendChild(b);
    }
    if (target) {
      var box = IG.el("div", "count__box");
      var digits = IG.el("div", "count__digits");
      box.appendChild(digits);
      count.appendChild(box);
      IG.frame(box, { step: 6, corners: [2, 0, 2, 0], stroke: 2, fill: "rgba(10,13,19,.85)", dash: 140 });
      var total = target - Date.now();
      var tick = function () {
        var left = Math.max(0, target - Date.now());
        if (left <= 0) {
          digits.textContent = TXT.done;
          digits.classList.add("done");
          Array.prototype.forEach.call(blocks.children, function (x) { x.classList.add("on"); });
          return;
        }
        var s = Math.ceil(left / 1000);
        var hh = Math.floor(s / 3600), mm = Math.floor((s % 3600) / 60), ss = s % 60;
        digits.textContent = (hh ? String(hh).padStart(2, "0") + ":" : "") + String(mm).padStart(2, "0") + ":" + String(ss).padStart(2, "0");
        var on = Math.round((1 - left / total) * N);
        Array.prototype.forEach.call(blocks.children, function (x, k) { x.classList.toggle("on", k < on); });
        setTimeout(tick, 250);
      };
      tick();
    } else {
      blocks.classList.add("loading");
    }
    count.appendChild(blocks);
    hero.appendChild(count);
  }

  // chat lateral
  if (withChat) {
    var side = IG.el("div", "side-chat reveal d3");
    side.innerHTML = '<div class="head"><span class="mono mark">Chat</span><span class="mono dim"><i class="live-dot"></i>twitch.tv/' + IG.esc(canal) + '</span></div><div class="body"></div>';
    stage.appendChild(side);
    IG.frame(side, { step: 8, corners: [0, 3, 0, 3], stroke: 2, fill: "rgba(6,8,12,.9)", dash: 90, base: 0.45 });
    IGChat.mount(side.querySelector(".body"), {
      canal: canal, limite: 24, fonte: IG.num("fonte", 22), esconder: IG.opt("esconder", ""), comandos: IG.flag("comandos", false), demo: IG.flag("demo", false),
    });
  }

  // faixa
  var band = IG.el("div", "band");
  stage.appendChild(band);
  var items = modo === "fim"
    ? ["Obrigado por assistir", "INGEN Black", "INGEN Silver", IG.opt("instagram", "@ingen.gg")]
    : ["INGEN Black", "INGEN Silver", "League of Legends", IG.opt("instagram", "@ingen.gg"), modo === "pausa" ? "Volta já" : "Já vai começar"];
  IG.ticker(band, items, 70);

  stage.insertAdjacentHTML("beforeend", '<div class="ig-grain"></div>');
});
