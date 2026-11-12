/* INGEN · Stream pack: conexão anônima com o chat da Twitch (IRC via WebSocket).
   Não precisa de login, token nem chave: lê mensagens, subs, presentes, raids e bits de qualquer canal.
   Também carrega emotes da 7TV, BTTV e FFZ do canal. */
(function () {
  "use strict";

  function unescapeTag(v) {
    return v.replace(/\\(.)/g, function (_, c) {
      return { s: " ", ":": ";", "\\": "\\", r: "\r", n: "\n" }[c] || c;
    });
  }

  function parse(line) {
    var msg = { tags: {}, prefix: null, command: null, params: [] };
    if (line[0] === "@") {
      var sp = line.indexOf(" ");
      line.slice(1, sp).split(";").forEach(function (kv) {
        var e = kv.indexOf("=");
        msg.tags[e < 0 ? kv : kv.slice(0, e)] = e < 0 ? "" : unescapeTag(kv.slice(e + 1));
      });
      line = line.slice(sp + 1);
    }
    if (line[0] === ":") {
      var sp2 = line.indexOf(" ");
      msg.prefix = line.slice(1, sp2);
      line = line.slice(sp2 + 1);
    }
    var ti = line.indexOf(" :");
    var trailing = null;
    if (ti >= 0) { trailing = line.slice(ti + 2); line = line.slice(0, ti); }
    var parts = line.split(" ").filter(Boolean);
    msg.command = parts.shift();
    if (trailing !== null) parts.push(trailing);
    msg.params = parts;
    return msg;
  }

  function badges(str) {
    var out = {};
    (str || "").split(",").forEach(function (b) {
      if (!b) return;
      var p = b.split("/");
      out[p[0]] = p[1] || "1";
    });
    return out;
  }

  /**
   * connect(canal, handlers)
   * handlers: message(m), sub(evt), raid(evt), bits(evt), clearUser(login), clearMsg(id), clearAll(), room(roomId), status(txt)
   */
  function connect(channel, h) {
    channel = String(channel || "").replace(/^#/, "").replace(/^https?:\/\/(www\.)?twitch\.tv\//, "").toLowerCase().trim();
    h = h || {};
    var ws, retry = 0, closed = false;

    function open() {
      ws = new WebSocket("wss://irc-ws.chat.twitch.tv:443");
      ws.onopen = function () {
        retry = 0;
        ws.send("CAP REQ :twitch.tv/tags twitch.tv/commands");
        ws.send("PASS SCHMOOPIIE");
        ws.send("NICK justinfan" + (10000 + Math.floor(Math.random() * 80000)));
        ws.send("JOIN #" + channel);
        h.status && h.status("conectado");
      };
      ws.onmessage = function (ev) {
        String(ev.data).split("\r\n").forEach(function (line) {
          if (!line) return;
          if (line.indexOf("PING") === 0) { ws.send("PONG :tmi.twitch.tv"); return; }
          handle(parse(line));
        });
      };
      ws.onclose = function () {
        if (closed) return;
        h.status && h.status("reconectando");
        setTimeout(open, Math.min(30000, 1000 * Math.pow(2, retry++)));
      };
      ws.onerror = function () { try { ws.close(); } catch (e) {} };
    }

    function handle(m) {
      var t = m.tags;
      switch (m.command) {
        case "ROOMSTATE":
          if (t["room-id"] && h.room) h.room(t["room-id"]);
          break;
        case "PRIVMSG": {
          var text = m.params[1] || "";
          var action = false;
          var am = /^\u0001ACTION (.*)\u0001$/.exec(text);
          if (am) { text = am[1]; action = true; }
          var login = (m.prefix || "").split("!")[0];
          var msg = {
            id: t.id,
            login: login,
            name: t["display-name"] || login,
            color: t.color || "",
            text: text,
            action: action,
            emotes: t.emotes || "",
            badges: badges(t.badges),
            bits: parseInt(t.bits || "0", 10) || 0,
            firstMsg: t["first-msg"] === "1",
            reply: t["reply-parent-display-name"] || null,
          };
          if (msg.bits && h.bits) h.bits({ type: "bits", name: msg.name, amount: msg.bits, message: text });
          h.message && h.message(msg);
          break;
        }
        case "USERNOTICE": {
          var id = t["msg-id"];
          var name = t["display-name"] || t.login;
          var plan = t["msg-param-sub-plan"] || "";
          var tier = plan === "Prime" ? "Prime" : plan === "2000" ? "Tier 2" : plan === "3000" ? "Tier 3" : "Tier 1";
          var userMsg = m.params[1] || "";
          if (id === "sub" || id === "resub") {
            h.sub && h.sub({
              type: id === "resub" ? "resub" : "sub",
              name: name,
              months: parseInt(t["msg-param-cumulative-months"] || "1", 10),
              tier: tier,
              message: userMsg,
            });
          } else if (id === "subgift" || id === "anonsubgift") {
            h.sub && h.sub({
              type: "gift",
              gifter: id === "anonsubgift" ? "Anônimo" : name,
              gifterLogin: t.login,
              name: t["msg-param-recipient-display-name"] || t["msg-param-recipient-user-name"],
              tier: tier,
            });
          } else if (id === "submysterygift" || id === "anonsubmysterygift") {
            h.sub && h.sub({
              type: "giftbomb",
              name: id === "anonsubmysterygift" ? "Anônimo" : name,
              gifterLogin: t.login,
              amount: parseInt(t["msg-param-mass-gift-count"] || "1", 10),
              tier: tier,
            });
          } else if (id === "raid") {
            h.raid && h.raid({ type: "raid", name: t["msg-param-displayName"] || name, amount: parseInt(t["msg-param-viewerCount"] || "0", 10) });
          } else if (id === "giftpaidupgrade" || id === "primepaidupgrade") {
            h.sub && h.sub({ type: "sub", name: name, months: 1, tier: tier, message: "" });
          }
          break;
        }
        case "CLEARCHAT":
          if (m.params[1]) h.clearUser && h.clearUser(m.params[1].toLowerCase());
          else h.clearAll && h.clearAll();
          break;
        case "CLEARMSG":
          h.clearMsg && h.clearMsg(t["target-msg-id"]);
          break;
      }
    }

    if (!channel) { h.status && h.status("sem canal"); return { close: function () {} }; }
    open();
    return { close: function () { closed = true; try { ws.close(); } catch (e) {} } };
  }

  // ------------------------------------------------------------------
  // Emotes de terceiros (7TV, BTTV, FFZ). Tudo opcional: se uma API cair, segue sem ela.
  // ------------------------------------------------------------------
  var extra = {};
  function getJSON(url) {
    return fetch(url).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); });
  }
  function add7tv(list) {
    (list || []).forEach(function (e) {
      var host = e.data && e.data.host;
      if (host && host.url) extra[e.name] = "https:" + host.url + "/2x.webp";
    });
  }
  function loadThirdParty(roomId) {
    var jobs = [
      getJSON("https://7tv.io/v3/emote-sets/global").then(function (j) { add7tv(j.emotes); }),
      getJSON("https://api.betterttv.net/3/cached/emotes/global").then(function (j) {
        j.forEach(function (e) { extra[e.code] = "https://cdn.betterttv.net/emote/" + e.id + "/2x"; });
      }),
    ];
    if (roomId) {
      jobs.push(
        getJSON("https://7tv.io/v3/users/twitch/" + roomId).then(function (j) { add7tv(j.emote_set && j.emote_set.emotes); }),
        getJSON("https://api.betterttv.net/3/cached/users/twitch/" + roomId).then(function (j) {
          (j.channelEmotes || []).concat(j.sharedEmotes || []).forEach(function (e) {
            extra[e.code] = "https://cdn.betterttv.net/emote/" + e.id + "/2x";
          });
        }),
        getJSON("https://api.betterttv.net/3/cached/frankerfacez/users/twitch/" + roomId).then(function (j) {
          j.forEach(function (e) { extra[e.code] = (e.images && (e.images["2x"] || e.images["1x"])) || ""; });
        })
      );
    }
    jobs.forEach(function (p) { p.catch(function () {}); });
  }

  /** Converte o texto + tag de emotes da Twitch em HTML seguro com <img>. */
  function renderText(text, emoteTag, esc) {
    var chars = Array.from(text);
    var marks = [];
    (emoteTag || "").split("/").forEach(function (part) {
      if (!part) return;
      var id = part.split(":")[0];
      (part.split(":")[1] || "").split(",").forEach(function (range) {
        var r = range.split("-");
        marks.push({ s: +r[0], e: +r[1], id: id });
      });
    });
    marks.sort(function (a, b) { return a.s - b.s; });
    var out = [], pos = 0;
    function words(str) {
      return str.split(/(\s+)/).map(function (w) {
        if (extra[w]) return '<img class="emote" alt="' + esc(w) + '" src="' + extra[w] + '">';
        return esc(w);
      }).join("");
    }
    marks.forEach(function (mk) {
      if (mk.s > pos) out.push(words(chars.slice(pos, mk.s).join("")));
      var name = chars.slice(mk.s, mk.e + 1).join("");
      out.push('<img class="emote" alt="' + esc(name) + '" src="https://static-cdn.jtvnw.net/emoticons/v2/' + mk.id + '/default/dark/2.0">');
      pos = mk.e + 1;
    });
    if (pos < chars.length) out.push(words(chars.slice(pos).join("")));
    return out.join("");
  }

  window.IGTwitch = { connect: connect, loadThirdParty: loadThirdParty, renderText: renderText, parse: parse };
})();
