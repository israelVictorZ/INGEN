/**
 * Gera o PDF de acompanhamento (docs/INGEN-planejamento.pdf) a partir de docs/pdf/planejamento.html.
 *
 *   npm run docs:pdf
 *
 * - Usa o Chrome (ou o Edge) sem janela. Outro navegador: CHROME_PATH=<caminho do executável>.
 * - O PDF vai SEMPRE para a pasta principal do projeto (onde o dono baixa o arquivo), mesmo rodando
 *   de uma sessão isolada (git worktree). Ele não vai para o git (docs/*.pdf no .gitignore).
 * - Ao mudar docs/planejamento.md, atualize também o HTML (mesmas seções) e rode este comando.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "..");
const src = join(repo, "docs", "pdf", "planejamento.html");

// pasta principal do projeto: a do .git compartilhado (em worktree, aponta para o checkout principal)
let mainRoot = repo;
try {
  const common = execFileSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], { cwd: repo, encoding: "utf8" }).trim();
  mainRoot = dirname(common);
} catch {}
const out = join(mainRoot, "docs", "INGEN-planejamento.pdf");

const candidates = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter(Boolean);
const browser = candidates.find((p) => existsSync(p));
if (!browser) {
  console.error("Chrome/Edge não encontrado. Rode com CHROME_PATH=<caminho do executável>.");
  process.exit(1);
}

mkdirSync(dirname(out), { recursive: true });
const profile = mkdtempSync(join(tmpdir(), "ingen-pdf-"));
try {
  execFileSync(
    browser,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-pdf-header-footer",
      `--user-data-dir=${profile}`,
      "--virtual-time-budget=10000", // espera as fontes do Google Fonts
      "--run-all-compositor-stages-before-draw",
      `--print-to-pdf=${out}`,
      pathToFileURL(src).href,
    ],
    { stdio: "pipe" },
  );
} finally {
  rmSync(profile, { recursive: true, force: true });
}
console.log(`PDF gerado: ${out} (${Math.round(statSync(out).size / 1024)} KB)`);
