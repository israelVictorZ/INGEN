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
    setInterval(function () { loadPlayer().then(function (d) { if (d) fn(d); }); }, ms || 300000);
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
