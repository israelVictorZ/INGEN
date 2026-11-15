"use client";

import Image from "next/image";
import { useDeferredValue, useMemo, useState } from "react";
import { LaneIcon } from "@/components/brand/LaneIcon";
import { championIcon } from "@/lib/ddragon-urls";
import { DRAFT_LANES, type DraftChampion, type DraftLane } from "@/lib/draft/lanes";

export const LANE_LABEL: Record<DraftLane, string> = { TOP: "Topo", JUNGLE: "Selva", MID: "Meio", ADC: "Atirador", SUPPORT: "Suporte" };

/**
 * Escudo dentro de uma placa que contrasta com o DESENHO (não com o fundo da tela): escudo claro vai em
 * placa escura e vice-versa, com borda na cor do time. Assim um escudo azul num time de fundo azul não some.
 */
export function LogoPlate({
  src,
  tone,
  color,
  size = 48,
  className = "",
}: {
  src: string | null;
  tone: "light" | "dark";
  color?: string;
  size?: number;
  className?: string;
}) {
  if (!src) return null;
  return (
    <span
      className={`clip-step-sm inline-flex shrink-0 items-center justify-center ${className}`}
      style={{
        width: size,
        height: size,
        padding: Math.max(3, size * 0.12),
        background: tone === "light" ? "#0b0c0f" : "#eef0f2",
        boxShadow: `inset 0 0 0 1.5px ${color ?? "rgb(255 255 255 / .25)"}`,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="size-full object-contain" draggable={false} />
    </span>
  );
}

/** Remove acentos e caixa para a busca ("Kai'Sa" ≈ "kaisa", "Nunu e Willump" ≈ "nunu"). */
export const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase();

export type ChampStatus = "ok" | "used" | "fearless" | "disabled";

/** Barra de filtro (lanes + busca) e a grade de campeões. */
export function ChampionPicker({
  champions,
  version,
  statusOf,
  selected,
  onPick,
  canPick = true,
  noneTile,
  dense = false,
  autoFocus = false,
  className = "",
  gridClassName = "",
}: {
  champions: DraftChampion[];
  version: string;
  statusOf?: (id: string) => ChampStatus;
  /** campeões marcados (selecionado agora, ou desativados na criação) */
  selected?: (id: string) => boolean;
  onPick?: (id: string | null) => void;
  canPick?: boolean;
  /** mostra o quadro "Sem ban" (escolha vazia) */
  noneTile?: string;
  dense?: boolean;
  autoFocus?: boolean;
  className?: string;
  gridClassName?: string;
}) {
  const [lane, setLane] = useState<DraftLane | null>(null);
  const [query, setQuery] = useState("");
  const q = norm(useDeferredValue(query));

  const list = useMemo(
    () => champions.filter((c) => (!lane || c.lanes.includes(lane)) && (!q || norm(c.name).includes(q) || norm(c.id).includes(q))),
    [champions, lane, q],
  );

  return (
    <div className={`flex min-h-0 flex-col ${className}`}>
      <div className="flex flex-wrap items-center gap-1.5">
        <FilterButton active={!lane} onClick={() => setLane(null)} label="Todas">
          <span className="font-mono text-[0.68rem] uppercase tracking-[0.12em]">Todas</span>
        </FilterButton>
        {DRAFT_LANES.map((l) => (
          <FilterButton key={l} active={lane === l} onClick={() => setLane(lane === l ? null : l)} label={LANE_LABEL[l]}>
            <LaneIcon role={l} className="size-5" active={lane === l} />
            <span className="hidden font-mono text-[0.68rem] uppercase tracking-[0.12em] xl:inline">{LANE_LABEL[l]}</span>
          </FilterButton>
        ))}
        <label className="relative ml-auto min-w-[9rem] flex-1 sm:max-w-[16rem]">
          <span className="sr-only">Buscar campeão</span>
          <input
            type="search"
            value={query}
            autoFocus={autoFocus}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter" || !canPick) return;
              // Enter escolhe o campeão quando a busca deixa um só disponível (filtra na hora, sem esperar a lista)
              const nq = norm(query);
              const hits = champions.filter(
                (c) => (!lane || c.lanes.includes(lane)) && (norm(c.name).includes(nq) || norm(c.id).includes(nq)) && (statusOf?.(c.id) ?? "ok") === "ok",
              );
              const exact = hits.find((c) => norm(c.name) === nq);
              if (exact || hits.length === 1) onPick?.((exact ?? hits[0]).id);
            }}
            placeholder="Buscar campeão"
            className="w-full border border-[var(--d-line,#262b33)] bg-black/40 px-3 py-2 text-sm text-white placeholder:text-gray-dim focus:border-[var(--d-accent,#3dfd4e)] focus:outline-none"
          />
        </label>
      </div>

      <div
        data-lenis-prevent
        className={`mt-3 grid min-h-0 flex-1 content-start overflow-y-auto overscroll-contain pr-1 ${
          dense ? "grid-cols-[repeat(auto-fill,minmax(52px,1fr))] gap-1.5" : "grid-cols-[repeat(auto-fill,minmax(64px,1fr))] gap-2"
        } ${gridClassName}`}
      >
        {noneTile && !q && !lane && (
          <button
            type="button"
            disabled={!canPick}
            onClick={() => onPick?.(null)}
            className={`group flex flex-col items-center gap-1 text-center ${canPick ? "" : "cursor-default"}`}
          >
            <span
              className={`flex aspect-square w-full items-center justify-center border border-dashed text-2xl text-gray transition-colors ${
                selected?.("") ? "border-[var(--d-accent)] text-[var(--d-accent)]" : "border-white/20 group-hover:border-white/50"
              }`}
            >
              ⦸
            </span>
            <span className="w-full truncate text-[0.68rem] text-gray">{noneTile}</span>
          </button>
        )}
        {list.map((c) => {
          const st = statusOf?.(c.id) ?? "ok";
          const sel = selected?.(c.id) ?? false;
          const blocked = st !== "ok";
          return (
            <button
              key={c.id}
              type="button"
              title={blocked ? `${c.name}: ${STATUS_LABEL[st]}` : c.name}
              disabled={!canPick || blocked}
              onClick={() => onPick?.(c.id)}
              className={`group relative flex flex-col items-center gap-1 text-center ${canPick && !blocked ? "cursor-pointer" : "cursor-default"}`}
            >
              <span
                className={`relative block aspect-square w-full overflow-hidden transition-[box-shadow,transform] duration-150 ${
                  sel ? "shadow-[0_0_0_2px_var(--d-accent,#3dfd4e),0_0_18px_var(--d-accent,#3dfd4e)]" : canPick && !blocked ? "group-hover:shadow-[0_0_0_2px_rgb(255_255_255/.6)]" : ""
                }`}
              >
                <Image
                  src={championIcon(version, c.id)}
                  alt=""
                  width={120}
                  height={120}
                  loading="lazy"
                  className={`size-full scale-[1.08] object-cover transition-[filter,opacity] ${blocked ? "opacity-35 grayscale" : ""}`}
                  draggable={false}
                />
                {st === "used" && <span className="absolute inset-0 bg-[linear-gradient(135deg,transparent_47%,#ff4d5e_47%,#ff4d5e_53%,transparent_53%)]" />}
                {st === "fearless" && (
                  <span className="absolute inset-x-0 bottom-0 bg-black/75 py-0.5 font-mono text-[0.55rem] uppercase tracking-[0.1em] text-white/80">fearless</span>
                )}
                {c.isNew && st === "ok" && (
                  <span className="absolute left-0 top-0 bg-[var(--d-accent,#3dfd4e)] px-1 font-mono text-[0.5rem] font-bold uppercase text-[var(--d-on-accent,#04060a)]">
                    novo
                  </span>
                )}
                {sel && dense && <span className="absolute inset-0 bg-[linear-gradient(135deg,transparent_47%,#ff4d5e_47%,#ff4d5e_53%,transparent_53%)]" />}
              </span>
              <span className={`w-full truncate text-[0.68rem] ${blocked ? "text-gray-dim" : "text-white-dim"}`}>{c.name}</span>
            </button>
          );
        })}
        {!list.length && <p className="col-span-full py-6 text-center text-sm text-gray">Nenhum campeão encontrado.</p>}
      </div>
    </div>
  );
}

const STATUS_LABEL: Record<ChampStatus, string> = {
  ok: "disponível",
  used: "já escolhido ou banido neste jogo",
  fearless: "usado em um jogo anterior (fearless)",
  disabled: "desativado nesta série",
};

function FilterButton({ active, onClick, label, children }: { active: boolean; onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`inline-flex h-9 items-center gap-1.5 border px-2.5 transition-colors ${
        active ? "border-[var(--d-accent,#3dfd4e)] bg-white/[0.06] text-white" : "border-[var(--d-line,#262b33)] text-gray hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

/**
 * Prepara o escudo enviado: reduz para no máximo 256 px, converte para WebP (PNG se o navegador não
 * suportar), mede o brilho do desenho (para a placa) e sugere a cor principal.
 */
export async function processLogo(file: File): Promise<{ dataUrl: string; tone: "light" | "dark"; color: string | null }> {
  if (!file.type.startsWith("image/")) throw new Error("Envie uma imagem (PNG, JPG, WebP ou SVG).");
  if (file.size > 8 * 1024 * 1024) throw new Error("Imagem muito grande (máximo 8 MB).");
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new window.Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("Não foi possível abrir essa imagem."));
      i.src = url;
    });
    for (const max of [256, 192, 128]) {
      const w = img.naturalWidth || max;
      const h = img.naturalHeight || max;
      const k = Math.min(1, max / Math.max(w, h));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(w * k));
      canvas.height = Math.max(1, Math.round(h * k));
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      let dataUrl = canvas.toDataURL("image/webp", 0.9);
      if (!dataUrl.startsWith("data:image/webp")) dataUrl = canvas.toDataURL("image/png");
      if (dataUrl.length > 380_000) continue;
      const { tone, color } = analyze(ctx.getImageData(0, 0, canvas.width, canvas.height).data);
      return { dataUrl, tone, color };
    }
    throw new Error("Imagem muito detalhada; tente um PNG menor.");
  } finally {
    URL.revokeObjectURL(url);
  }
}

function analyze(px: Uint8ClampedArray): { tone: "light" | "dark"; color: string | null } {
  let lum = 0;
  let n = 0;
  const buckets = new Map<number, { n: number; r: number; g: number; b: number }>();
  for (let i = 0; i < px.length; i += 4) {
    const [r, g, b, a] = [px[i], px[i + 1], px[i + 2], px[i + 3]];
    if (a < 128) continue;
    const l = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    lum += l;
    n++;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    if (max - min < 40 || max < 40) continue; // cinzas, pretos e brancos não viram cor do time
    const key = ((r >> 5) << 6) | ((g >> 5) << 3) | (b >> 5);
    const bk = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
    bk.n++;
    bk.r += r;
    bk.g += g;
    bk.b += b;
    buckets.set(key, bk);
  }
  const top = [...buckets.values()].sort((a, b) => b.n - a.n)[0];
  const color =
    top && top.n > n * 0.04
      ? `#${[top.r, top.g, top.b].map((v) => Math.round(v / top.n).toString(16).padStart(2, "0")).join("")}`
      : null;
  return { tone: n && lum / n > 0.5 ? "light" : "dark", color };
}
