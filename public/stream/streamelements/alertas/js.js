/* INGEN · Alertas para StreamElements (gerado) */
window.INGEN_CONFIG = {};
/* INGEN · Stream pack: utilitários compartilhados (script clássico, sem módulos, para abrir via file:// no OBS). */
(function () {
  "use strict";

  var CFG = window.INGEN_CONFIG || {};
  var QS = new URLSearchParams(location.search);

  var PLAYER = {};

  function has(v) { return v !== undefined && v !== null && v !== ""; }

  /** Lê uma opção: parâmetro da URL > dados do jogador no site (?jogador=slug) > config.js > padrão. */
  function opt(name, def) {
    if (QS.has(name)) return QS.get(name);
    if (has(PLAYER[name])) return PLAYER[name];
    if (has(CFG[name])) return CFG[name];
    return def;
  }

  // ------------------------------------------------------------------
  // Dados do jogador direto do site (nick, time, lane, elo, canal)
  // ------------------------------------------------------------------
  function apiBase() {
    var site = QS.get("site") || CFG.site;
    if (site) return String(site).replace(/\/+$/, "");
    return /^https?:$/.test(location.protocol) ? location.origin : "";
  }
  function loadPlayer() {
    var slug = QS.get("jogador") || CFG.jogador;
    var base = apiBase();
    if (!slug || !base) return Promise.resolve(null);
    return fetch(base + "/api/stream?jogador=" + encodeURIComponent(slug), { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (d) PLAYER = { nome: d.nome, time: d.time, lane: d.lane, elo: d.elo, canal: d.canal };
        return d;
      })
      .catch(function () { return null; });
  }
  /** Roda `fn` quando os dados do jogador chegarem (erro libera na hora; site travado, após 8 s). */
  function ready(fn) {
    var done = false;
    function go() {
      if (done) return;
      done = true;
      fn();
      // dentro do kit (iframe de prévia): avisa que a peça já está desenhada, com as fontes carregadas
      if (window.parent !== window) {
        (document.fonts ? document.fonts.ready : Promise.resolve()).then(function () {
          setTimeout(function () { window.parent.postMessage({ ingenReady: true }, "*"); }, 60);
        });
      }
    }
    loadPlayer().then(go);
    setTimeout(go, 8000);
  }
  /** Atualiza os dados do jogador de tempos em tempos (elo sobe e desce durante a live). */
  function watchPlayer(fn, ms) {
    setInterval(function () { loadPlayer().then(function (d) { if (d) fn(d); }); }, ms || 120000);
  }
  function flag(name, def) {
    var v = opt(name, def);
    if (typeof v === "boolean") return v;
    return ["0", "false", "nao", "não", "off", "no", ""].indexOf(String(v).toLowerCase()) === -1;
  }
  function num(name, def) {
    var n = parseFloat(opt(name, def));
    return isNaN(n) ? def : n;
  }

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /** Aplica o time (black | silver) como classe no body. */
  function applyTeam() {
    var t = String(opt("time", "black")).toLowerCase();
    if (t.indexOf("silver") !== -1) document.body.classList.add("team-silver");
    return t.indexOf("silver") !== -1 ? "silver" : "black";
  }
  function teamName() {
    return applyTeam() === "silver" ? "INGEN Silver" : "INGEN Black";
  }

  /** Escala um palco 1920×1080 para caber na fonte (qualquer resolução de canvas). */
  function fitStage(stage, w, h) {
    w = w || 1920;
    h = h || 1080;
    function fit() {
      var s = Math.min(innerWidth / w, innerHeight / h);
      stage.style.transform = "translate(" + (innerWidth - w * s) / 2 + "px," + (innerHeight - h * s) / 2 + "px) scale(" + s + ")";
    }
    addEventListener("resize", fit);
    fit();
  }

  // ------------------------------------------------------------------
  // Moldura escalonada: os "degraus" das torres do escudo da INGEN.
  // ------------------------------------------------------------------
  var uid = 0;

  /** Retângulo com cantos em escada. c = [tl, tr, br, bl] = quantidade de degraus por canto. */
  function stepPath(x, y, w, h, s, c) {
    var tl = c[0] || 0, tr = c[1] || 0, br = c[2] || 0, bl = c[3] || 0;
    var p = [];
    function stairs(sx, sy, ux, uy, vx, vy, k) {
      p.push([sx, sy]);
      var cx = sx, cy = sy;
      for (var i = 0; i < k; i++) {
        cx += ux; cy += uy; p.push([cx, cy]);
        cx += vx; cy += vy; p.push([cx, cy]);
      }
    }
    p.push([x + tl * s, y]);
    stairs(x + w - tr * s, y, 0, s, s, 0, tr);
    stairs(x + w, y + h - br * s, -s, 0, 0, s, br);
    stairs(x + bl * s, y + h, 0, -s, -s, 0, bl);
    stairs(x, y + tl * s, s, 0, 0, -s, tl);
    var d = "M" + p[0][0].toFixed(1) + " " + p[0][1].toFixed(1);
    for (var j = 1; j < p.length; j++) d += "L" + p[j][0].toFixed(1) + " " + p[j][1].toFixed(1);
    return d + "Z";
  }

  // Cantos para molduras que ficam POR CIMA de vídeo (câmera, mapa) ou POR BAIXO de uma captura (cliente).
  // Nesses casos a moldura é sempre um retângulo reto (sem ponta preta e sem a quina do vídeo aparecendo)
  // e os degraus viram decoração: "in" = escada sólida para dentro; "out" = blocos de pixel por fora.
  var CORNER_DIR = [[0, 0, 1, 1], [1, 0, -1, 1], [1, 1, -1, -1], [0, 1, 1, -1]]; // [fx, fy, dx, dy] por canto tl, tr, br, bl

  function stairsIn(w, h, s, corners) {
    var d = "";
    corners.forEach(function (k, c) {
      if (!k) return;
      var cd = CORNER_DIR[c], cx = cd[0] * w, cy = cd[1] * h;
      var pts = [[0, 0], [k, 0]];
      for (var i = 1; i <= k; i++) { pts.push([k - i + 1, i]); pts.push([k - i, i]); }
      d += pts.map(function (p, j) { return (j ? "L" : "M") + (cx + cd[2] * p[0] * s).toFixed(1) + " " + (cy + cd[3] * p[1] * s).toFixed(1); }).join("") + "Z";
    });
    return d;
  }

  function blocksOut(w, h, s, corners, gap) {
    var out = [];
    corners.forEach(function (k, c) {
      if (!k) return;
      var cd = CORNER_DIR[c], cx = cd[0] * w, cy = cd[1] * h;
      // em coordenadas locais do canto superior esquerdo: o bloco do canto e dois braços ao longo das bordas
      var cells = [[-gap - s, -gap - s, 1]];
      for (var i = 1; i <= k; i++) {
        var off = -gap - s + i * (s + gap);
        var op = Math.max(0.2, 1 - i * 0.28);
        cells.push([off, -gap - s, op], [-gap - s, off, op]);
      }
      cells.forEach(function (b, n) {
        var x0 = cx + cd[2] * b[0], x1 = cx + cd[2] * (b[0] + s);
        var y0 = cy + cd[3] * b[1], y1 = cy + cd[3] * (b[1] + s);
        out.push({ x: Math.min(x0, x1), y: Math.min(y0, y1), o: b[2], n: n });
      });
    });
    return out;
  }

  /**
   * Monta uma moldura SVG animada dentro de `host` (que precisa ter position relativa/absoluta).
   * o.step (px), o.corners [tl,tr,br,bl], o.stroke (px), o.cover (cor que preenche fora da moldura),
   * o.fill (cor de dentro), o.base (opacidade do traço base), o.runners (true/false), o.dash (tamanho do brilho, 0–500),
   * o.stairs: "in" | "out" (moldura reta + degraus para dentro / blocos por fora; ver acima)
   */
  function frame(host, o) {
    o = o || {};
    var id = "igf" + ++uid;
    var NS = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(NS, "svg");
    svg.setAttribute("class", "ig-frame" + (o.className ? " " + o.className : ""));
    svg.innerHTML =
      '<defs><linearGradient id="' + id + 'g" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="var(--acc1)"/><stop offset=".5" stop-color="var(--acc2)"/><stop offset="1" stop-color="var(--acc3)"/>' +
      "</linearGradient></defs>" +
      (o.cover ? '<path class="cover" fill-rule="evenodd" fill="' + o.cover + '"/>' : "") +
      (o.fill ? '<path class="fill" fill="' + o.fill + '"/>' : "") +
      '<path class="base" fill="none" stroke="url(#' + id + 'g)" stroke-linejoin="miter"/>' +
      (o.stairs === "in" ? '<path class="stairs" fill="url(#' + id + 'g)"/>' : "") +
      (o.stairs === "out" ? '<g class="blocks" fill="url(#' + id + 'g)"></g>' : "") +
      (o.runners === false
        ? ""
        : '<path class="glow" fill="none" stroke="url(#' + id + 'g)" pathLength="1000" stroke-linecap="square"/>' +
          '<path class="run" fill="none" stroke="var(--white)" pathLength="1000" stroke-linecap="square"/>');
    // a moldura fica atrás do conteúdo do host (primeiro filho), e o conteúdo precisa de z-index ≥ 0
    if (o.top) host.appendChild(svg);
    else host.insertBefore(svg, host.firstChild);

    var paths = {
      cover: svg.querySelector(".cover"),
      fill: svg.querySelector(".fill"),
      base: svg.querySelector(".base"),
      glow: svg.querySelector(".glow"),
      run: svg.querySelector(".run"),
      stairs: svg.querySelector(".stairs"),
      blocks: svg.querySelector(".blocks"),
    };

    function draw() {
      var w = host.clientWidth, h = host.clientHeight;
      if (!w || !h) return;
      var sw = typeof o.stroke === "function" ? o.stroke(w, h) : o.stroke || 2;
      var st = typeof o.step === "function" ? o.step(w, h) : o.step || 10;
      var ins = o.inset !== undefined ? o.inset : sw / 2;
      var corners = o.corners || [2, 0, 2, 0];
      var d = stepPath(ins, ins, w - ins * 2, h - ins * 2, st, o.stairs ? [0, 0, 0, 0] : corners);
      svg.setAttribute("viewBox", "0 0 " + w + " " + h);
      if (paths.stairs) paths.stairs.setAttribute("d", stairsIn(w, h, st, corners));
      if (paths.blocks) {
        var gapPx = Math.max(3, Math.round(st * 0.45));
        var lift = o.inset !== undefined && o.inset < 0 ? -o.inset * 2 : 0; // o traço já está do lado de fora
        paths.blocks.innerHTML = blocksOut(w, h, st, corners, gapPx + lift).map(function (b) {
          return '<rect class="px" x="' + b.x.toFixed(1) + '" y="' + b.y.toFixed(1) + '" width="' + st + '" height="' + st +
            '" opacity="' + b.o + '" style="animation-delay:' + (b.n * 0.18).toFixed(2) + 's"/>';
        }).join("");
      }
      if (paths.cover) paths.cover.setAttribute("d", "M0 0H" + w + "V" + h + "H0Z" + d);
      if (paths.fill) paths.fill.setAttribute("d", d);
      paths.base.setAttribute("d", d);
      paths.base.setAttribute("stroke-width", sw);
      paths.base.setAttribute("opacity", o.base !== undefined ? o.base : 0.55);
      if (paths.run) {
        var dash = o.dash || 90;
        var gap = 500 - dash;
        paths.glow.setAttribute("d", d);
        paths.glow.setAttribute("stroke-width", sw * 4);
        paths.glow.setAttribute("opacity", 0.22);
        paths.glow.setAttribute("stroke-dasharray", dash + " " + gap);
        paths.run.setAttribute("d", d);
        paths.run.setAttribute("stroke-width", sw);
        paths.run.setAttribute("stroke", "url(#" + id + "g)");
        paths.run.setAttribute("stroke-dasharray", dash + " " + gap);
        paths.run.style.filter = "drop-shadow(0 0 " + Math.max(2, sw * 2) + "px var(--glow))";
      }
    }
    draw();
    if (window.ResizeObserver) new ResizeObserver(draw).observe(host);
    else addEventListener("resize", draw);
    return { svg: svg, redraw: draw };
  }

  // ------------------------------------------------------------------
  // Campo de pixels pontilhado (Bayer 4×4): manchas verdes vivas, no estilo
  // da textura granulada da tela antiga da INGEN, só que em pixel art.
  // ------------------------------------------------------------------
  var BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(function (v) { return (v + 0.5) / 16; });

  function hash(x, y) {
    var h = Math.imul(x, 374761393) + Math.imul(y, 668265263);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  }
  function vnoise(x, y) {
    var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    var a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function hexToRgb(h) {
    h = h.replace("#", "");
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }

  /**
   * o.cell: tamanho do pixel em px de tela · o.blobs: [{x,y,r,s, ax,ay, sp, ph}] em coordenadas 0–1
   * o.colors: 4 cores do mais fraco ao mais forte · o.fps · o.noise (0–1) · o.base (densidade mínima)
   */
  function pixelField(canvas, o) {
    o = o || {};
    var cell = o.cell || 8;
    var fps = o.fps || 20;
    var silver = document.body.classList.contains("team-silver");
    var colors = (o.colors && !silver ? o.colors : silver ? ["#1b1f25", "#3a414b", "#8a8f98", "#c9cdd3"] : ["#0b3d1e", "#16803a", "#3dfd4e", "#7cf94f"]).map(hexToRgb);
    var noiseAmt = o.noise !== undefined ? o.noise : 0.9;
    var ctx = canvas.getContext("2d");
    var W, H, img, buf32;
    var running = true;
    var last = 0;
    var t0 = performance.now();
    var little = new Uint8Array(new Uint32Array([0x0a0b0c0d]).buffer)[0] === 0x0d;
    var pal = colors.map(function (c) {
      return little ? (255 << 24) | (c[2] << 16) | (c[1] << 8) | c[0] : (c[0] << 24) | (c[1] << 16) | (c[2] << 8) | 255;
    });

    function size() {
      var r = canvas.getBoundingClientRect();
      var cw = canvas.offsetWidth || r.width, ch = canvas.offsetHeight || r.height;
      W = Math.max(8, Math.round(cw / cell));
      H = Math.max(8, Math.round(ch / cell));
      canvas.width = W;
      canvas.height = H;
      img = ctx.createImageData(W, H);
      buf32 = new Uint32Array(img.data.buffer);
    }

    function render(now) {
      if (!running) return;
      requestAnimationFrame(render);
      if (now - last < 1000 / fps) return;
      last = now;
      var t = (now - t0) / 1000;
      var blobs = (o.blobs || []).map(function (b) {
        var sp = b.sp || 0.12, ph = b.ph || 0;
        return {
          x: (b.x + Math.sin(t * sp + ph) * (b.ax || 0.04)) * W,
          y: (b.y + Math.cos(t * sp * 0.8 + ph * 1.7) * (b.ay || 0.04)) * H,
          r: b.r * W,
          s: b.s || 1,
        };
      });
      var drift = t * (o.speed || 0.35);
      for (var j = 0; j < H; j++) {
        for (var i = 0; i < W; i++) {
          var v = o.base || 0;
          for (var k = 0; k < blobs.length; k++) {
            var bb = blobs[k];
            var dx = (i - bb.x) / bb.r, dy = (j - bb.y) / bb.r;
            var dd = dx * dx + dy * dy;
            if (dd < 9) v += Math.exp(-dd) * bb.s;
          }
          if (v < 0.04) { buf32[j * W + i] = 0; continue; }
          var n = vnoise(i * 0.09 + drift, j * 0.09 - drift * 0.7) * 0.6 + vnoise(i * 0.31 - drift * 1.8, j * 0.31 + drift) * 0.4;
          v *= 1 - noiseAmt + noiseAmt * 1.7 * n;
          var th = BAYER[((j & 3) << 2) | (i & 3)];
          if (v > th) {
            var lvl = v > 1.35 ? 3 : v > 0.95 ? 2 : v > 0.6 ? 1 : 0;
            buf32[j * W + i] = pal[lvl];
          } else buf32[j * W + i] = 0;
        }
      }
      ctx.putImageData(img, 0, 0);
    }

    size();
    addEventListener("resize", size);
    requestAnimationFrame(render);
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) running = false;
      else if (!running) { running = true; requestAnimationFrame(render); }
    });
    return { stop: function () { running = false; } };
  }

  // ------------------------------------------------------------------
  // Texto que "decodifica" como um HUD (mesmo efeito do elo no site)
  // ------------------------------------------------------------------
  var GLYPHS = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&/<>";
  function scramble(node, text, dur) {
    dur = dur || 900;
    text = String(text);
    var start = performance.now();
    return new Promise(function (resolve) {
      function step(now) {
        var p = Math.min(1, (now - start) / dur);
        var reveal = Math.floor(p * text.length);
        var out = "";
        for (var i = 0; i < text.length; i++) {
          var ch = text[i];
          if (i < reveal || ch === " ") out += ch;
          else out += GLYPHS[(Math.random() * GLYPHS.length) | 0];
        }
        node.textContent = out;
        if (p < 1) requestAnimationFrame(step);
        else { node.textContent = text; resolve(); }
      }
      requestAnimationFrame(step);
    });
  }

  /** Marquee contínuo: repete o conteúdo até cobrir 2× a largura. */
  function ticker(host, items, speedPxPerSec) {
    host.classList.add("ig-ticker");
    var track = el("div", "ig-ticker__track");
    var unit = items.map(function (t) { return "<span>" + t + '</span><i class="ig-sep"></i>'; }).join("");
    track.innerHTML = '<span class="ig-ticker__unit">' + unit + "</span>";
    host.appendChild(track);
    requestAnimationFrame(function () {
      var u = track.firstChild;
      var uw = u.offsetWidth || 400;
      var reps = Math.max(2, Math.ceil((host.offsetWidth * 2) / uw) + 1);
      if (reps % 2) reps++;
      var html = "";
      for (var i = 0; i < reps; i++) html += '<span class="ig-ticker__unit">' + unit + "</span>";
      track.innerHTML = html;
      var total = uw * reps;
      track.style.setProperty("--ticker-speed", total / 2 / (speedPxPerSec || 60) + "s");
    });
  }

  // ------------------------------------------------------------------
  // Ícones e redes
  // ------------------------------------------------------------------
  var ICONS = {
    twitch: '<svg class="ig-ico" viewBox="0 0 24 24"><path d="M4.3 3 3 6.4v13.1h4.5V22h2.5l2.5-2.5h3.7L21 14.8V3H4.3Zm15 10.9-2.9 2.9h-4.5l-2.5 2.5v-2.5H5.7V4.7h13.6v9.2ZM16.4 7.7v4.8h-1.7V7.7h1.7Zm-4.6 0v4.8h-1.7V7.7h1.7Z"/></svg>',
    discord: '<svg class="ig-ico" viewBox="0 0 24 24"><path d="M20.3 4.4A19.6 19.6 0 0 0 15.4 3l-.6 1.3a18.2 18.2 0 0 0-5.6 0L8.6 3a19.5 19.5 0 0 0-4.9 1.5C.6 9.1-.3 13.7.1 18.2a19.7 19.7 0 0 0 6 3l1.3-2.1a12.8 12.8 0 0 1-2-1l.5-.4a14 14 0 0 0 12.2 0l.5.4c-.6.4-1.3.7-2 1l1.3 2.1a19.6 19.6 0 0 0 6-3c.5-5.2-.8-9.8-3.6-13.8ZM8 15.4c-1.2 0-2.2-1.1-2.2-2.4s1-2.4 2.2-2.4 2.2 1.1 2.2 2.4-1 2.4-2.2 2.4Zm8 0c-1.2 0-2.2-1.1-2.2-2.4s1-2.4 2.2-2.4 2.2 1.1 2.2 2.4-1 2.4-2.2 2.4Z"/></svg>',
    instagram: '<svg class="ig-ico" viewBox="0 0 24 24"><path d="M12 2.2c3.2 0 3.6 0 4.8.1 3.3.1 4.8 1.7 4.9 4.9.1 1.3.1 1.6.1 4.8s0 3.6-.1 4.8c-.1 3.2-1.7 4.8-4.9 4.9-1.3.1-1.6.1-4.8.1s-3.6 0-4.8-.1c-3.3-.1-4.8-1.7-4.9-4.9C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.8C2.4 3.9 3.9 2.4 7.2 2.3 8.4 2.2 8.8 2.2 12 2.2ZM12 0C8.7 0 8.3 0 7.1.1 2.7.3.3 2.7.1 7.1 0 8.3 0 8.7 0 12s0 3.7.1 4.9c.2 4.4 2.6 6.8 7 7 1.2.1 1.6.1 4.9.1s3.7 0 4.9-.1c4.4-.2 6.8-2.6 7-7 .1-1.2.1-1.6.1-4.9s0-3.7-.1-4.9c-.2-4.4-2.6-6.8-7-7C15.7 0 15.3 0 12 0Zm0 5.8a6.2 6.2 0 1 0 0 12.4 6.2 6.2 0 0 0 0-12.4ZM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm6.4-11.8a1.4 1.4 0 1 0 0 2.9 1.4 1.4 0 0 0 0-2.9Z"/></svg>',
    lane: {
      TOP: '<svg class="ig-ico" viewBox="0 0 34 34"><path fill-opacity=".25" fill-rule="evenodd" d="M21,14H14v7h7V14Zm5-3V26L11.014,26l-4,4H30V7.016Z"/><polygon points="4 4 4.003 28.045 9 23 9 9 23 9 28.045 4.003 4 4"/></svg>',
      JUNGLE: '<svg class="ig-ico" viewBox="0 0 34 34"><path fill-rule="evenodd" d="M25,3c-2.128,3.3-5.147,6.851-6.966,11.469A42.373,42.373,0,0,1,20,20a27.7,27.7,0,0,1,1-3C21,12.023,22.856,8.277,25,3ZM13,20c-1.488-4.487-4.760-6.966-9-9,3.868,3.136,4.422,7.52,5,12l3.743,3.312C14.215,27.917,16.527,30.451,17,31c4.555-9.445-3.366-20.8-8-28C11.67,9.573,13.717,13.342,13,20Zm8,5a15.271,15.271,0,0,1,0,2l4-4c0.578-4.48,1.132-8.864,5-12C24.712,13.537,22.134,18.854,21,25Z"/></svg>',
      MID: '<svg class="ig-ico" viewBox="0 0 34 34"><path fill-opacity=".25" fill-rule="evenodd" d="M30,12.968l-4.008,4L26,26H17l-4,4H30ZM16.979,8L21,4H4V20.977L8,17,8,8h8.981Z"/><polygon points="25 4 4 25 4 30 9 30 30 9 30 4 25 4"/></svg>',
      ADC: '<svg class="ig-ico" viewBox="0 0 34 34"><path fill-opacity=".25" fill-rule="evenodd" d="M13,20h7V13H13v7ZM4,4V26.984l3.955-4L8,8,22.986,8l4-4H4Z"/><polygon points="29.997 5.955 25 11 25 25 11 25 5.955 29.997 30 30 29.997 5.955"/></svg>',
      SUPPORT: '<svg class="ig-ico" viewBox="0 0 34 34"><path fill-rule="evenodd" d="M26,13c3.535,0,8-4,8-4H23l-3,3,2,7,5-2-3-4h2ZM22,5L20.827,3H13.062L12,5l5,6Zm-5,9-1-1L13,28l4,3,4-3L18,13ZM11,9H0s4.465,4,8,4h2L7,17l5,2,2-7Z"/></svg>',
    },
  };

  var LANE_ALIAS = { TOP: "TOP", JG: "JUNGLE", JUNGLE: "JUNGLE", JUNGLER: "JUNGLE", SELVA: "JUNGLE", MID: "MID", MEIO: "MID", ADC: "ADC", BOT: "ADC", ATIRADOR: "ADC", SUP: "SUPPORT", SUPORTE: "SUPPORT", SUPPORT: "SUPPORT" };
  var LANE_LABEL = { TOP: "Top", JUNGLE: "Jungle", MID: "Mid", ADC: "ADC", SUPPORT: "Suporte" };
  function lane(v) {
    var k = LANE_ALIAS[String(v || "").toUpperCase()];
    return k ? { key: k, label: LANE_LABEL[k], icon: ICONS.lane[k] } : null;
  }

  /** Redes da INGEN (podem ser trocadas em config.js ou pela URL). */
  function socials() {
    return [
      { key: "instagram", icon: ICONS.instagram, label: opt("instagram", "@ingen.gg") },
      { key: "twitch", icon: ICONS.twitch, label: opt("twitch", "twitch.tv/" + opt("canal", "ingen_team")) },
      { key: "discord", icon: ICONS.discord, label: opt("discord", "discord.gg/aArbDqdrMY") },
    ].filter(function (s) { return s.label && s.label !== "0"; });
  }

  /** Caminho do logo relativo à página (overlays/ → ../assets). */
  function logoSrc() {
    return opt("logo", "../assets/ingen-logo.png");
  }

  window.IG = {
    opt: opt,
    ready: ready,
    watchPlayer: watchPlayer,
    flag: flag,
    num: num,
    el: el,
    esc: esc,
    applyTeam: applyTeam,
    teamName: teamName,
    fitStage: fitStage,
    stepPath: stepPath,
    frame: frame,
    pixelField: pixelField,
    scramble: scramble,
    ticker: ticker,
    icons: ICONS,
    lane: lane,
    socials: socials,
    logoSrc: logoSrc,
    vnoise: vnoise,
  };
})();

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


/* ---- StreamElements ---- */
(function () {
  var LOGO = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQgAAADdCAMAAABwrBzlAAADAFBMVEVMaXE631xt+0R2/EJKoz0k+1YUeEYrqFN7taIPCwwooUEaRycRMyAygywSxnNNpTkOGg4CAwIP14oQ1nYThVQZTzErekcaZSwSxIAUrW4UunIRzIMQ4JQ0yFNgwVEcpGwTk1pd3FNax0JjsksezlUorkpPuT8UmlxAwnUmsUtfxEo0kDtHw25x1VQKOR5GhjZnnlsEBgoCBAkFBwsAAAD///sGCAz///z///8AAAIDBgr///ri49wAAAUDCAsCBAfm5+IDBgjk5d4BBgno6eTn5+Pp6uX8/Pr+/vnk5eHi498HCg0FCQoE+3n9/fza3Nbg4dvc3djZ2tT7/Pfq6+cBAQhb/EoD/IDe4Nre39j///4s/FgV/En//fzs7egC+Y8D+4s1/VIC7ID6+vg//FRR/FoE/nsfISFgYmFl/VBt/UoBAwTf4d5I/VcD+nMD+Ijv8e4H/38E7JgI/nUD+pUSFBVh+0Lu7+oG/41n/UUB6Yhi+0oD+YFc/ER5/EkE/IUn/19T/E4G/4c0/D0v/E4ODxA//D8WGBlz+0xJ/EEF/ptUVVYD7Y7x8vBK/Er09fL39/VmaGdy/EYx/18D8oYh/lkD9YF9/VgbHB11/08F84xT+0I/QEFC/UwDCQVLTU5s/1IkJiYVOhVr/FVaW1wH/5Qj/Et8/U9FRkcD85cQ/GF+fn5ydHMC55E4/1o2/ksEDgiam5srLS1d/VE2NzgI/6IMJRAJ/Wxb/FuG/1vV1tNGj0AFIBAI/qsKHAwY/V0E7YcHGQwKRSYH5YNy/VuHiIiC/1ELUTEZVR+pqqnKzMoHMRoFFAoW/VIX/2slXCcu52DP0M5u5lgRf0Jj/miQ/GYQn1cH9qATLREQYCcPjkuRkpIgQh0QuWs4yEwoKSoNYDZM0U8QsGCC91UVcjRj7U0kkzt471ER63dP/pN9/WSio6IpUiEhZy1T5F02aSnGx8ZU/2wNb0QQzmRCgjMj100Q3Wq2uLewsbEptD9I/2K/wb+7vbxCnjZQnDmd5X9Y4+4IAAAAqnRSTlMA/f7+vP5tAgEWvUwxdf15Iwr8/oJCYHTiwdb1/px+rZXx/K3pgf20v9XQmvPz2fHy/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////nWsxz4AAAAJcEhZcwAAA+gAAAPoAbV7UmsAACAASURBVHja7Z17fFTVtfhTWwkUivJQnr3a3lbb2v4xMyeTmUlmzkxmksk8mDwHJrEEMJTXpJAAMeGhaEqEBmISRQgRQZQIFCjhEawpyCNQhICUci9YkKKolWpvy9UqtNr7+a219j6veYTBcu8nwm8R8pjnOd+z1tprrb32nqSk/zvpndTnrm+A3HHHHf8GcgcXugHkga8xoZu+cXfSzSvJSXe8885vfrP+0fW/UWTFepAVK1aSTHt+GsmcOSt/gOBuXhC/efSrKI8ygZ+LFz/6FMi0aYun3XbbbXPm4P+HQebc7CC+qgZBQiQWox7cdhvqwq0EggCsh6+VgGExl2lPSWYx51YB8ehXOQimEZzDbdO0IJJvXhC9kx4gEOtf+U+SV9SyQpZpZBr33QngbloQX0MQj773V5Q/czlxAv86cYL+ePPNP7/5z2m3BIinnnr022FBMINYrVb+QyVh4a8rb34Q/85AtPnV4iORf+cgvn3Tg7jtqW+36fw6SQxcdA72t59APHJrgPD7HfFBmG8hEKuNfjp3PZEwGmRBENYTKwDEvFsDBD9to9HoN/p8+IX/CYTReuIggvjWTQ4CEgoZhEPA0YOPHGZz2KBjGnFw3iM3PYj1BEJkCtH26/9h8k+SvwaNBOLPBx9+ZPToWwJEmGmE+KNX1q9/FLNviKsffv5vZgMHMe9WAPHUbSs5CKP5f15ZvPgpzL4hcHh26p+tfgnE6JsexKMEwkqDps/861cWr0cUmGY98vALVtQIX/CWAEEacZ+VNMIn/O2VxZCIPzWNlSB2Bf00anzJQfROvrYk/fsKuP7T7rMamUaoQTzy3qtBNny+iSB2IIgEXvHLqhHgFG576j7wipJGrH8UilOoEAhCx0C8OG/04zu+pBoBBep+/frdPWTIN2S54w6lTE0y5BtD7luBBZj7zEbZNBYTiDkPPyKDCL754o7Rox//ywNDUL4RW4Yw6dsDi0//9j4IVZ5ApBK1puSyfsU76/GsyTTwlAkE1KbIMhQQL7y443GSn6jlp2qZiPLc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";
  var alerts = null, fields = {};
  function tier(t) { t = String(t || ""); return t === "prime" ? "Prime" : t === "2000" ? "Tier 2" : t === "3000" ? "Tier 3" : "Tier 1"; }
  window.addEventListener("onWidgetLoad", function (obj) {
    fields = (obj.detail && obj.detail.fieldData) || {};
    if (fields.time === "silver") document.body.classList.add("team-silver");
    var stage = document.getElementById("stage");
    IG.fitStage(stage);
    alerts = IGAlerts.init(stage, {
      tempo: Number(fields.tempo) || 6,
      som: fields.som !== "nao",
      volume: fields.volume == null ? 0.35 : Number(fields.volume),
      posicao: fields.posicao || "topo",
      logo: LOGO,
    });
  });
  window.addEventListener("onEventReceived", function (obj) {
    if (!alerts || !obj.detail) return;
    var l = obj.detail.listener, e = obj.detail.event;
    if (!e) return;
    switch (l) {
      case "follower-latest":
        if (fields.follow !== "nao") alerts.enqueue({ type: "follow", name: e.name });
        break;
      case "subscriber-latest":
        if (e.bulkGifted) alerts.enqueue({ type: "giftbomb", name: e.sender || e.name, amount: e.amount });
        else if (e.isCommunityGift) return;
        else if (e.gifted) alerts.enqueue({ type: "gift", name: e.sender || "Anônimo", recipient: e.name, tier: tier(e.tier) });
        else if ((e.amount || 1) > 1) alerts.enqueue({ type: "resub", name: e.name, months: e.amount, tier: tier(e.tier), message: e.message || "" });
        else alerts.enqueue({ type: "sub", name: e.name, tier: tier(e.tier) });
        break;
      case "cheer-latest":
        if (fields.bits !== "nao") alerts.enqueue({ type: "bits", name: e.name, amount: e.amount, message: e.message || "" });
        break;
      case "raid-latest":
        alerts.enqueue({ type: "raid", name: e.name, amount: e.amount });
        break;
      case "tip-latest":
        if (fields.tips !== "nao") alerts.enqueue({ type: "tip", name: e.name, amount: e.amount, message: e.message || "" });
        break;
    }
  });
})();
