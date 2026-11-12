// Gera o widget de alertas para o StreamElements (Custom Widget) a partir dos mesmos arquivos do pack.
// Uso: node scripts/build-stream-se.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "stream");
const read = (p) => readFileSync(join(root, p), "utf8");
const out = join(root, "streamelements", "alertas");
mkdirSync(out, { recursive: true });

const logo = "data:image/png;base64," + readFileSync(join(root, "assets", "ingen-logo-alert.png")).toString("base64");

const html = `<!-- INGEN · Alertas (gerado por scripts/build-stream-se.mjs; edite public/stream/core e rode o build) -->
<div class="stage" id="stage"></div>
`;

const css = `/* INGEN · Alertas para StreamElements (gerado) */
${read("core/ingen.css")}
${read("core/alerts.css")}
`;

const adapter = `
/* ---- StreamElements ---- */
(function () {
  var LOGO = "${logo}";
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
`;

const js = `/* INGEN · Alertas para StreamElements (gerado) */
window.INGEN_CONFIG = {};
${read("core/ingen.js")}
${read("core/alerts.js")}
${adapter}`;

const yesNo = { sim: "Sim", nao: "Não" };
const fields = {
  time: { type: "dropdown", label: "Time", value: "black", options: { black: "INGEN Black", silver: "INGEN Silver" } },
  posicao: { type: "dropdown", label: "Posição na tela", value: "topo", options: { topo: "Topo", centro: "Centro", baixo: "Embaixo" } },
  tempo: { type: "number", label: "Tempo na tela (segundos)", value: 6, min: 3, max: 20, step: 1 },
  som: { type: "dropdown", label: "Som", value: "sim", options: { sim: "Ligado", nao: "Desligado" } },
  volume: { type: "slider", label: "Volume", value: 0.35, min: 0, max: 1, step: 0.05 },
  follow: { type: "dropdown", label: "Alertar follows", value: "sim", options: yesNo },
  bits: { type: "dropdown", label: "Alertar bits", value: "sim", options: yesNo },
  tips: { type: "dropdown", label: "Alertar doações", value: "sim", options: yesNo },
};

writeFileSync(join(out, "html.html"), html);
writeFileSync(join(out, "css.css"), css);
writeFileSync(join(out, "js.js"), js);
writeFileSync(join(out, "fields.json"), JSON.stringify(fields, null, 2) + "\n");
writeFileSync(join(out, "data.json"), "{}\n");
console.log("StreamElements: widget gerado em", out);
