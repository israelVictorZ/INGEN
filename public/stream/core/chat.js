/* INGEN · Chat customizado: renderizador. Monta o chat dentro de qualquer elemento.
   Depende de core/ingen.js (IG) e core/twitch.js (IGTwitch). */
(function () {
  "use strict";

  var FALLBACK = ["#7cf94f", "#3dfd4e", "#00f07f", "#9be7ff", "#c9cdd3", "#ffd166", "#ff9ad5", "#b4a7ff"];
  var BOTS = ["nightbot", "streamelements", "streamlabs", "moobot", "fossabot", "wizebot", "sery_bot", "botrixoficial", "kofistreambot", "soundalerts"];

  function readable(hex, login) {
    if (!/^#[0-9a-f]{6}$/i.test(hex || "")) {
      var h = 0;
      for (var i = 0; i < login.length; i++) h = (h * 31 + login.charCodeAt(i)) >>> 0;
      return FALLBACK[h % FALLBACK.length];
    }
    var r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    var lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    if (lum < 0.45) {
      var k = (0.45 - lum) / 0.55 + 0.25;
      r = Math.round(r + (255 - r) * k);
      g = Math.round(g + (255 - g) * k);
      b = Math.round(b + (255 - b) * k);
    }
    return "rgb(" + r + "," + g + "," + b + ")";
  }

  function badgeHTML(m) {
    var b = m.badges, out = [];
    if (b.broadcaster) out.push('<i class="ic-b ic-b--streamer">LIVE</i>');
    if (b.moderator) out.push('<i class="ic-b ic-b--mod">MOD</i>');
    if (b.vip) out.push('<i class="ic-b ic-b--vip">VIP</i>');
    if (b.subscriber || b.founder) {
      var months = parseInt(b.subscriber || "0", 10);
      out.push('<i class="ic-b">SUB' + (months >= 2 ? " " + (months >= 1000 ? Math.floor(months / 1000) : months) : "") + "</i>");
    }
    if (m.firstMsg) out.push('<i class="ic-b ic-b--new">NOVO</i>');
    return out.join("");
  }

  /**
   * mount(container, o)
   * o.canal, o.limite (máx. mensagens), o.sumir (segundos; 0 = nunca), o.fonte (px),
   * o.esconder (lista de logins), o.comandos (mostrar !comandos), o.cores (cor do usuário), o.demo
   */
  function mount(container, o) {
    o = o || {};
    var list = IG.el("div", "ic-list");
    var status = IG.el("div", "ic-status");
    container.appendChild(list);
    container.appendChild(status);
    if (o.fonte) list.style.setProperty("--chat-font", o.fonte + "px");

    var limit = o.limite || 30;
    var hideAfter = (o.sumir || 0) * 1000;
    var hidden = BOTS.concat(String(o.esconder || "").toLowerCase().split(/[\s,]+/).filter(Boolean));
    var channel = String(o.canal || "").toLowerCase().replace(/^#/, "");

    function trim() {
      var items = list.children;
      while (items.length > limit) list.removeChild(items[0]);
      // remove o que saiu por cima
      while (items.length && items[0].offsetTop + items[0].offsetHeight < 0) list.removeChild(items[0]);
    }

    function push(m) {
      if (hidden.indexOf(m.login) !== -1) return;
      if (!o.comandos && m.text.charAt(0) === "!") return;
      var row = IG.el("div", "ic-msg");
      row.dataset.id = m.id || "";
      row.dataset.login = m.login;
      var color = o.cores === false ? "" : readable(m.color, m.login);
      if (color) row.style.setProperty("--uc", color);
      if (m.badges.broadcaster) row.classList.add("is-streamer");
      if (m.action) row.classList.add("is-action");
      if (channel && m.text.toLowerCase().indexOf("@" + channel) !== -1) row.classList.add("is-mention");
      var body = IGTwitch.renderText(m.text, m.emotes, IG.esc);
      var onlyEmotes = body.replace(/<img[^>]*>/g, "").trim() === "" && body.indexOf("<img") !== -1;
      row.innerHTML =
        '<div class="ic-head"><span class="ic-badges">' + badgeHTML(m) + '</span><span class="ic-name">' + IG.esc(m.name) + "</span>" +
        (m.reply ? '<span class="ic-reply">↳ @' + IG.esc(m.reply) + "</span>" : "") +
        '</div><div class="ic-body' + (onlyEmotes ? " only-emotes" : "") + '">' + body + "</div>";
      list.appendChild(row);
      trim();
      if (hideAfter) setTimeout(function () { remove(row); }, hideAfter);
    }

    function remove(row) {
      if (!row.parentNode || row.classList.contains("is-out")) return;
      row.classList.add("is-out");
      setTimeout(function () { row.parentNode && row.parentNode.removeChild(row); }, 460);
    }

    function setStatus(txt, show) {
      status.textContent = txt;
      status.classList.toggle("show", !!show);
    }

    if (o.demo) startDemo(push);
    else if (channel) {
      IGTwitch.loadThirdParty(null);
      IGTwitch.connect(channel, {
        message: push,
        room: function (id) { IGTwitch.loadThirdParty(id); },
        clearUser: function (login) {
          Array.prototype.forEach.call(list.querySelectorAll('[data-login="' + login + '"]'), remove);
        },
        clearMsg: function (id) {
          var r = list.querySelector('[data-id="' + id + '"]');
          if (r) remove(r);
        },
        clearAll: function () { Array.prototype.forEach.call(list.children, remove); },
        status: function (s) { setStatus(s === "conectado" ? "" : "chat: " + s, s !== "conectado"); },
      });
    } else setStatus("chat: defina o canal", true);

    return { push: push };
  }

  // ------------------------------------------------------------------
  // Modo de teste: mensagens falsas para ver o visual sem estar ao vivo
  // ------------------------------------------------------------------
  var DEMO = [
    ["Tsuki", "#ff69b4", "que jogada foi essa KEKW", { subscriber: "14" }],
    ["Taiyou", "#1e90ff", "GG demais, mid diff total", { vip: "1" }],
    ["NightOwl_br", "", "boa noite chat Kappa", {}],
    ["Atlas", "#3dfd4e", "valeu pelo apoio, bora pra mais uma!", { broadcaster: "1" }],
    ["mod_ingen", "#9acd32", "Sigam a @ingen.gg no Instagram", { moderator: "1", subscriber: "30" }],
    ["primeiravez", "#daa520", "primeira vez aqui, que overlay bonito", {}, true],
    ["lucas_lol", "#000080", "qual a build desse item?", { subscriber: "3" }],
    ["fenrir", "#b22222", "LUL LUL LUL", {}],
    ["vanessa.gg", "#8a2be2", "INGEN Black vai amassar no campeonato", { subscriber: "7" }],
    ["sup_main", "#2e8b57", "esse ward foi visão de jogo absurda", {}],
  ];
  var DEMO_EMOTES = { Kappa: "25", LUL: "425618" };

  function demoEmotes(text) {
    var map = {}, i = 0;
    text.split(/(\s+)/).forEach(function (w) {
      var len = Array.from(w).length;
      if (DEMO_EMOTES[w]) (map[DEMO_EMOTES[w]] = map[DEMO_EMOTES[w]] || []).push(i + "-" + (i + len - 1));
      i += len;
    });
    return Object.keys(map).map(function (id) { return id + ":" + map[id].join(","); }).join("/");
  }

  function startDemo(push) {
    var n = 0;
    function emit() {
      var d = DEMO[n++ % DEMO.length];
      push({
        id: "demo" + n,
        login: d[0].toLowerCase(),
        name: d[0],
        color: d[1],
        text: d[2],
        action: false,
        emotes: demoEmotes(d[2]),
        badges: d[3],
        firstMsg: !!d[4],
        reply: null,
      });
    }
    function loop() {
      emit();
      setTimeout(loop, 1400 + Math.random() * 1800);
    }
    emit();
    emit();
    emit();
    setTimeout(loop, 900);
  }

  window.IGChat = { mount: mount };
})();
