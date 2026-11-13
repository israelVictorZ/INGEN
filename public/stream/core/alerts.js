/* INGEN · Alertas: fila + animação + som. Depende de core/ingen.js (IG).
   Evento: { type: follow|sub|resub|gift|giftbomb|raid|bits|tip, name, amount, months, tier, message, recipient } */
(function () {
  "use strict";

  var COLS = 20;

  function texts(e) {
    var n = function (v) { return Number(v || 0).toLocaleString("pt-BR"); };
    switch (e.type) {
      case "follow": return { k: "Novo seguidor", d: "Bem-vindo à <b>INGEN</b>" };
      case "sub": return { k: "Novo sub", d: e.tier === "Prime" ? "Sub com <b>Prime</b>" : "Sub <b>" + (e.tier || "Tier 1") + "</b>" };
      case "resub": return { k: "Resub", d: "<b>" + n(e.months) + " meses</b> · " + (e.tier || "Tier 1") };
      case "gift": return { k: "Sub de presente", d: "Presenteou <b>" + IG.esc(e.recipient || "alguém") + "</b>" };
      case "giftbomb": return { k: n(e.amount) + " subs de presente", d: "Para a <b>comunidade</b>" };
      case "raid": return { k: "Raid chegando", d: "<b>" + n(e.amount) + " pessoas</b> no chat" };
      case "bits": return { k: "Bits", d: "<b>" + n(e.amount) + " bits</b>" };
      case "tip": return { k: "Doação", d: "<b>" + IG.esc(e.formatted || "R$ " + n(e.amount)) + "</b>" };
      default: return { k: "Alerta", d: "" };
    }
  }

  // som 8-bit curtinho (WebAudio, sem arquivo)
  var actx = null;
  function chime(vol, big) {
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === "suspended") actx.resume();
      var notes = big ? [523.25, 659.25, 783.99, 1046.5, 1318.5] : [659.25, 783.99, 1046.5];
      var t = actx.currentTime + 0.02;
      notes.forEach(function (f, i) {
        var o = actx.createOscillator(), g = actx.createGain();
        o.type = "square";
        o.frequency.value = f;
        g.gain.setValueAtTime(0, t + i * 0.085);
        g.gain.linearRampToValueAtTime(vol * 0.22, t + i * 0.085 + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.085 + 0.22);
        o.connect(g).connect(actx.destination);
        o.start(t + i * 0.085);
        o.stop(t + i * 0.085 + 0.25);
      });
    } catch (err) {}
  }

  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function anim(el, kf, o) { return el.animate(kf, o).finished.catch(function () {}); }

  /**
   * init(stage, o): o.tempo (s), o.som (bool), o.volume (0–1), o.posicao (topo|centro|baixo), o.logo (src)
   */
  function init(stage, o) {
    o = o || {};
    var queue = [], busy = false;
    var hold = (o.tempo || 6) * 1000;

    var root = IG.el("div", "al pos-" + (o.posicao || "topo"));
    root.style.visibility = "hidden";
    root.innerHTML =
      '<div class="al-steps">' + new Array(41).join("<i></i>") + "</div>" +
      '<div class="al-panel"><div class="al-inner">' +
      '<div class="al-badge"><img alt=""></div>' +
      '<div class="al-text"><div class="al-kicker mono"></div><div class="al-name display"></div><div class="al-detail"></div><div class="al-msg"></div></div>' +
      '</div><div class="al-shine"></div></div>' +
      '<div class="al-cols">' + new Array(COLS + 1).join("<i></i>") + "</div>";
    stage.appendChild(root);
    root.querySelector(".al-badge img").src = o.logo || IG.logoSrc();
    var panel = root.querySelector(".al-panel");
    IG.frame(panel, { step: 10, corners: [3, 0, 3, 0], stroke: 3, fill: "rgba(8,10,15,.96)", dash: 120, base: 0.8 });
    var cols = Array.prototype.slice.call(root.querySelectorAll(".al-cols i"));
    var steps = root.querySelector(".al-steps");
    var kicker = root.querySelector(".al-kicker");
    var name = root.querySelector(".al-name");
    var detail = root.querySelector(".al-detail");
    var msg = root.querySelector(".al-msg");
    var shine = root.querySelector(".al-shine");

    function burst() {
      var badge = root.querySelector(".al-badge");
      for (var i = 0; i < 26; i++) {
        var p = IG.el("i", "al-px");
        p.style.left = 105 - 6 + "px";
        p.style.top = 105 - 6 + "px";
        badge.appendChild(p);
        var a = Math.random() * Math.PI * 2, d = 90 + Math.random() * 190;
        var dx = Math.cos(a) * d, dy = Math.sin(a) * d * 0.7;
        (function (pp) {
          pp.animate(
            [{ transform: "translate(0,0) scale(1)", opacity: 1 }, { transform: "translate(" + dx + "px," + dy + "px) scale(.3)", opacity: 0 }],
            { duration: 700 + Math.random() * 600, easing: "cubic-bezier(.16,1,.3,1)", fill: "forwards" }
          ).finished.then(function () { pp.remove(); }).catch(function () {});
        })(p);
      }
    }

    function colsIn(origin) {
      return Promise.all(cols.map(function (c, i) {
        c.style.transformOrigin = origin;
        return anim(c, [{ transform: "scaleY(0)" }, { transform: "scaleY(1)" }], { duration: 260, delay: i * 22, easing: "steps(4, end)", fill: "forwards" });
      }));
    }
    function colsOut(origin) {
      return Promise.all(cols.map(function (c, i) {
        c.style.transformOrigin = origin;
        return anim(c, [{ transform: "scaleY(1)" }, { transform: "scaleY(0)" }], { duration: 260, delay: i * 22, easing: "steps(4, end)", fill: "forwards" });
      }));
    }

    function play(e) {
      var t = texts(e);
      var big = ["giftbomb", "raid", "resub"].indexOf(e.type) !== -1 || (e.type === "bits" && e.amount >= 1000);
      kicker.textContent = t.k;
      detail.innerHTML = t.d;
      var message = e.type === "resub" || e.type === "bits" || e.type === "tip" ? e.message || "" : "";
      msg.textContent = message;
      root.classList.toggle("has-msg", !!message);
      var who = String(e.name || "").toUpperCase();
      name.textContent = "";
      name.style.fontSize = who.length > 16 ? "64px" : who.length > 12 ? "78px" : "";

      root.style.visibility = "visible";
      if (o.som !== false) chime(o.volume == null ? 0.35 : o.volume, big);
      return colsIn("bottom")
        .then(function () {
          panel.style.opacity = 1;
          steps.style.opacity = 1;
          return colsOut("top");
        })
        .then(function () {
          burst();
          anim(shine, [{ transform: "translateX(-110%)" }, { transform: "translateX(110%)" }], { duration: 1100, easing: "cubic-bezier(.16,1,.3,1)" });
          anim(root.querySelector(".al-badge"), [{ transform: "scale(.6)" }, { transform: "scale(1.08)" }, { transform: "scale(1)" }], { duration: 600, easing: "cubic-bezier(.16,1,.3,1)" });
          return IG.scramble(name, who, 650);
        })
        .then(function () {
          Array.prototype.forEach.call(steps.children, function (s, i) {
            s.animate([{ opacity: 0.25 }, { opacity: 1 }, { opacity: 0.25 }], { duration: 900, delay: i * 30, iterations: Math.ceil(hold / 1500) });
          });
          return wait(hold);
        })
        .then(function () { return colsIn("top"); })
        .then(function () {
          panel.style.opacity = 0;
          steps.style.opacity = 0;
          return colsOut("bottom");
        })
        .then(function () {
          root.style.visibility = "hidden";
          return wait(500);
        });
    }

    function next() {
      if (busy || !queue.length) return;
      busy = true;
      play(queue.shift()).then(function () { busy = false; next(); });
    }

    function enqueue(e) {
      if (!e || !e.type) return;
      queue.push(e);
      next();
    }

    return { enqueue: enqueue };
  }

  /** Alertas de teste: `!testealerta <tipo>` no chat ou `?teste=<tipo>` no link. */
  var TESTS = {
    follow: { type: "follow" },
    sub: { type: "sub", tier: "Tier 1" },
    resub: { type: "resub", months: 14, tier: "Tier 1", message: "14 meses de INGEN!" },
    presente: { type: "gift", recipient: "lucas_lol", tier: "Tier 1" },
    presentes: { type: "giftbomb", amount: 10 },
    raid: { type: "raid", amount: 128 },
    bits: { type: "bits", amount: 500, message: "pelo penta" },
  };
  function testEvent(kind, name) {
    var base = TESTS[String(kind || "").toLowerCase()] || TESTS.sub;
    var e = {};
    for (var k in base) e[k] = base[k];
    e.name = name || "Teste INGEN";
    return e;
  }

  /** Liga as fontes padrão: chat da Twitch (subs, presentes, raids, bits), postMessage e teste. */
  function connectSources(alerts, o) {
    var giftSkip = {};
    window.ingenAlert = alerts.enqueue;
    addEventListener("message", function (ev) {
      if (ev.data && ev.data.ingenAlert) alerts.enqueue(ev.data.ingenAlert);
    });
    // ?teste=sub (ou 1): um alerta ao carregar. No OBS, "Atualizar cache da página atual" repete o teste.
    if (o.teste && o.teste !== "0") {
      setTimeout(function () { alerts.enqueue(testEvent(o.teste === "1" ? "sub" : o.teste)); }, 1500);
    }
    if (o.canal && !o.demo) {
      IGTwitch.connect(o.canal, {
        // Teste direto no OBS: o dono do canal ou um mod digita "!testealerta" (ou "!testealerta raid") no chat.
        // Os botões "Testar" do kit só alcançam a prévia da página, não a cópia que roda dentro do OBS.
        message: function (m) {
          var t = /^!testealerta(?:\s+(\S+))?/i.exec(m.text || "");
          if (!t || !(m.badges.broadcaster || m.badges.moderator)) return;
          alerts.enqueue(testEvent(t[1], m.name));
        },
        sub: function (e) {
          if (e.type === "giftbomb") {
            giftSkip[e.gifterLogin] = (giftSkip[e.gifterLogin] || 0) + e.amount;
            return alerts.enqueue(e);
          }
          if (e.type === "gift") {
            if (giftSkip[e.gifterLogin] > 0) { giftSkip[e.gifterLogin]--; return; }
            return alerts.enqueue({ type: "gift", name: e.gifter, recipient: e.name, tier: e.tier });
          }
          alerts.enqueue(e);
        },
        raid: alerts.enqueue,
        bits: function (e) { if (o.bits !== false) alerts.enqueue(e); },
      });
    }
    if (o.demo) {
      var demo = [
        { type: "follow", name: "Tsuki" },
        { type: "sub", name: "Taiyou", tier: "Tier 1" },
        { type: "resub", name: "vanessa.gg", months: 14, tier: "Tier 1", message: "14 meses de INGEN, bora Black!" },
        { type: "giftbomb", name: "mod_ingen", amount: 10 },
        { type: "raid", name: "OutroStreamer", amount: 128 },
        { type: "bits", name: "fenrir", amount: 500, message: "pelo pentakill" },
      ];
      var i = 0;
      var loop = function () { alerts.enqueue(demo[i++ % demo.length]); setTimeout(loop, (o.tempo || 6) * 1000 + 4000); };
      loop();
    }
  }

  window.IGAlerts = { init: init, connectSources: connectSources, texts: texts };
})();
