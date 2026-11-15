"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { championIcon } from "@/lib/ddragon-urls";
import type { DraftChampionData } from "@/lib/draft/lanes";
import { TIMER_OPTIONS, type TeamKind } from "@/lib/draft/engine";
import { INGEN_LOGO, SIDE_COLOR, teamColor } from "@/lib/draft/theme";
import { CopyButton } from "@/components/ui/CopyButton";
import { ChampionPicker, LANE_LABEL, LogoPlate, processLogo } from "./shared";

type Roster = { aces: string[]; jokers: string[] };

type TeamForm = {
  kind: TeamKind;
  name: string;
  color: string | null;
  logo: string | null;
  logoTone: "light" | "dark";
  players: string[];
};

const KIND_LABEL: Record<TeamKind, string> = { aces: "INGEN Aces", jokers: "INGEN Jokers", guest: "Visitante" };
const SWATCHES = ["#e63946", "#f77f00", "#fcbf49", "#2a9d8f", "#3d8bff", "#7b2cbf", "#ff4fa3", "#9aa3ad"];
const LANES = ["TOP", "JUNGLE", "MID", "ADC", "SUPPORT"] as const;

const emptyTeam = (kind: TeamKind, roster: Roster): TeamForm => ({
  kind,
  name: "",
  color: null,
  logo: null,
  logoTone: "dark",
  players: kind === "guest" ? ["", "", "", "", ""] : [...roster[kind]],
});

export function DraftCreator({ data, roster }: { data: DraftChampionData; roster: Roster }) {
  const [teams, setTeams] = useState<[TeamForm, TeamForm]>(() => [emptyTeam("aces", roster), emptyTeam("guest", roster)]);
  /** time que começa no lado azul (fica à esquerda na tela) */
  const [firstBlue, setFirstBlue] = useState<0 | 1>(0);
  const [games, setGames] = useState(3);
  const [mode, setMode] = useState<"fearless" | "normal">("fearless");
  const [timer, setTimer] = useState<number>(30);
  const [disabled, setDisabled] = useState<string[]>([]);
  const [showDisabled, setShowDisabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);

  const champById = useMemo(() => new Map(data.champions.map((c) => [c.id, c])), [data.champions]);

  const setTeam = (i: 0 | 1, patch: Partial<TeamForm>) =>
    setTeams((t) => {
      const next = [...t] as [TeamForm, TeamForm];
      next[i] = { ...next[i], ...patch };
      return next;
    });

  const setKind = (i: 0 | 1, kind: TeamKind) => {
    const otherIdx = i === 0 ? 1 : 0;
    setTeams((t) => {
      const next = [...t] as [TeamForm, TeamForm];
      next[i] = emptyTeam(kind, roster);
      // as duas lines da INGEN não podem ser escolhidas duas vezes: o outro lado vira a outra line ou visitante
      if (kind !== "guest" && next[otherIdx].kind === kind) next[otherIdx] = emptyTeam(kind === "aces" ? "jokers" : "aces", roster);
      return next;
    });
  };

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teams, games, mode, disabled, firstBlue, timer }),
      });
      const json = (await res.json()) as { code?: string; error?: string };
      if (!res.ok || !json.code) throw new Error(json.error ?? "Não foi possível criar a sala.");
      setCode(json.code);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível criar a sala.");
    } finally {
      setBusy(false);
    }
  }

  if (code) {
    const link = `${window.location.origin}/draft/${code}`;
    return (
      <div className="clip-step mx-auto max-w-2xl bg-bg-2 p-8 text-center">
        <p className="label-mono">Sala criada</p>
        <h2 className="mt-3 font-display text-4xl font-black uppercase text-white">Link do draft</h2>
        <p className="mt-3 text-sm text-gray">
          Envie para os dois times. Quem abrir escolhe o time e se vai ser <strong className="text-white">drafter</strong> (um por time) ou{" "}
          <strong className="text-white">espectador</strong>. O link vale por 32 horas, com todos os jogos da série.
        </p>
        <p className="mt-6 break-all border border-line bg-bg-0 px-4 py-3 font-mono text-sm text-white">{link}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <CopyButton text={link} label="Copiar link" />
          <Link href={`/draft/${code}`} className="clip-step-sm inline-flex items-center gap-2 bg-[image:var(--grad-ingen-x)] px-5 py-2.5 font-mono text-[0.75rem] font-medium uppercase tracking-[0.16em] text-bg-0 hover:brightness-110">
            Entrar na sala →
          </Link>
          <button type="button" onClick={() => setCode(null)} className="px-4 py-2.5 font-mono text-[0.72rem] uppercase tracking-[0.16em] text-gray hover:text-white">
            Criar outra
          </button>
        </div>
      </div>
    );
  }

  const order: (0 | 1)[] = firstBlue === 0 ? [0, 1] : [1, 0];

  return (
    <div className="space-y-10">
      {/* Times e lados */}
      <section>
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="label-mono">1 · Times e lado inicial</p>
            <p className="mt-2 text-sm text-gray">O time da esquerda começa no lado azul. Nos jogos seguintes os lados se alternam sozinhos.</p>
          </div>
        </div>
        <div className="mt-5 grid items-stretch gap-4 lg:grid-cols-[1fr_auto_1fr]">
          <TeamCard i={order[0]} side="blue" form={teams[order[0]]} other={teams[order[1]]} setKind={setKind} setTeam={setTeam} />
          <div className="flex items-center justify-center">
            <button
              type="button"
              onClick={() => setFirstBlue(firstBlue === 0 ? 1 : 0)}
              className="clip-step-sm inline-flex items-center gap-2 bg-bg-3 px-4 py-3 font-mono text-[0.72rem] uppercase tracking-[0.16em] text-white hover:bg-white hover:text-bg-0"
              title="Trocar os lados iniciais"
            >
              ⇄ <span className="lg:hidden">Trocar lados</span>
            </button>
          </div>
          <TeamCard i={order[1]} side="red" form={teams[order[1]]} other={teams[order[0]]} setKind={setKind} setTeam={setTeam} />
        </div>
      </section>

      {/* Série */}
      <section className="grid gap-6 md:grid-cols-3">
        <Field label="2 · Número de jogos">
          <Segmented value={games} options={[1, 2, 3, 4, 5].map((n) => ({ value: n, label: String(n) }))} onChange={setGames} />
        </Field>
        <Field label="3 · Modo">
          <Segmented
            value={mode}
            options={[
              { value: "fearless", label: "Fearless" },
              { value: "normal", label: "Livre" },
            ]}
            onChange={setMode}
          />
          <p className="mt-2 text-xs text-gray">
            {mode === "fearless" ? "Campeão escolhido em um jogo fica bloqueado para os dois times no resto da série." : "Cada jogo começa com todos os campeões liberados."}
          </p>
        </Field>
        <Field label="4 · Tempo por ação">
          <Segmented value={timer} options={TIMER_OPTIONS.map((t) => ({ value: t, label: t ? `${t}s` : "Sem limite" }))} onChange={setTimer} />
        </Field>
      </section>

      {/* Campeões desativados */}
      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="label-mono">5 · Campeões banidos na série (opcional)</p>
            <p className="mt-2 text-sm text-gray">Ficam fora dos {games > 1 ? `${games} jogos` : "jogos"}, além dos bans normais do draft.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowDisabled((v) => !v)}
            className="clip-step-sm bg-bg-3 px-4 py-2.5 font-mono text-[0.72rem] uppercase tracking-[0.16em] text-white hover:bg-white hover:text-bg-0"
          >
            {showDisabled ? "Fechar lista" : disabled.length ? "Editar" : "Escolher campeões"}
          </button>
        </div>
        {disabled.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-2">
            {disabled.map((id) => (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => setDisabled((d) => d.filter((x) => x !== id))}
                  className="inline-flex items-center gap-2 border border-line bg-bg-2 py-1 pl-1 pr-2 text-xs text-white-dim hover:border-loss"
                  title="Remover"
                >
                  <Image src={championIcon(data.version, id)} alt="" width={24} height={24} className="size-6" />
                  {champById.get(id)?.name ?? id} <span className="text-gray">×</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {showDisabled && (
          <div className="mt-4 h-[26rem] border border-line bg-bg-0 p-4">
            <ChampionPicker
              champions={data.champions}
              version={data.version}
              dense
              className="h-full"
              selected={(id) => disabled.includes(id)}
              onPick={(id) => id && setDisabled((d) => (d.includes(id) ? d.filter((x) => x !== id) : [...d, id]))}
            />
          </div>
        )}
      </section>

      <div className="flex flex-col items-center gap-3 border-t border-line pt-8">
        {error && <p className="text-sm text-loss">{error}</p>}
        <button
          type="button"
          disabled={busy}
          onClick={create}
          className="clip-step-sm inline-flex items-center gap-3 bg-[image:var(--grad-ingen-x)] px-8 py-4 font-mono text-sm font-medium uppercase tracking-[0.18em] text-bg-0 transition hover:brightness-110 hover:shadow-[0_0_32px_var(--glow)] disabled:opacity-60"
        >
          {busy ? "Criando…" : "Criar sala e gerar link"} →
        </button>
        <p className="text-xs text-gray-dim">O link expira 32 horas depois de criado.</p>
      </div>
    </div>
  );
}

function TeamCard({
  i,
  side,
  form,
  other,
  setKind,
  setTeam,
}: {
  i: 0 | 1;
  side: "blue" | "red";
  form: TeamForm;
  other: TeamForm;
  setKind: (i: 0 | 1, k: TeamKind) => void;
  setTeam: (i: 0 | 1, p: Partial<TeamForm>) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const guest = form.kind === "guest";
  const accent = teamColor({ kind: form.kind, name: form.name, color: form.color, logo: null, players: [] });

  async function onFile(file: File | undefined) {
    if (!file) return;
    setLogoError(null);
    try {
      const r = await processLogo(file);
      setTeam(i, { logo: r.dataUrl, logoTone: r.tone, ...(form.color ? {} : { color: r.color }) });
    } catch (e) {
      setLogoError(e instanceof Error ? e.message : "Não foi possível usar essa imagem.");
    }
  }

  return (
    <div
      className="clip-step relative overflow-hidden bg-bg-2 p-5"
      style={{ boxShadow: `inset 0 3px 0 ${SIDE_COLOR[side]}`, background: guest && form.color ? `linear-gradient(160deg, ${form.color}26, transparent 55%), #131519` : undefined }}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-[0.7rem] uppercase tracking-[0.16em]" style={{ color: SIDE_COLOR[side] }}>
          {side === "blue" ? "Lado azul · esquerda" : "Lado vermelho · direita"}
        </p>
        <LogoPlate src={guest ? form.logo : INGEN_LOGO} tone={guest ? form.logoTone : "light"} color={accent} size={44} />
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Time">
        {(["aces", "jokers", "guest"] as TeamKind[]).map((k) => {
          const taken = k !== "guest" && other.kind === k;
          return (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={form.kind === k}
              onClick={() => setKind(i, k)}
              className={`border px-3 py-2 font-mono text-[0.7rem] uppercase tracking-[0.12em] transition-colors ${
                form.kind === k ? "border-green bg-green/10 text-white" : "border-line text-gray hover:text-white"
              }`}
              title={taken ? "Já escolhido no outro lado: os dois trocam" : undefined}
            >
              {KIND_LABEL[k]}
            </button>
          );
        })}
      </div>

      {guest && (
        <div className="mt-5 grid gap-4">
          <label className="block">
            <span className="label-mono">Nome do time</span>
            <input
              value={form.name}
              maxLength={32}
              onChange={(e) => setTeam(i, { name: e.target.value })}
              placeholder={`Time ${i + 1}`}
              className="mt-2 w-full border border-line bg-bg-0 px-3 py-2.5 text-white placeholder:text-gray-dim focus:border-green focus:outline-none"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <span className="label-mono">Escudo (opcional)</span>
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="border border-line px-3 py-2 font-mono text-[0.7rem] uppercase tracking-[0.12em] text-white hover:border-white"
                >
                  {form.logo ? "Trocar" : "Enviar imagem"}
                </button>
                {form.logo && (
                  <button type="button" onClick={() => setTeam(i, { logo: null })} className="px-2 py-2 text-xs text-gray hover:text-loss">
                    Remover
                  </button>
                )}
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0]).finally(() => (e.target.value = ""))} />
              </div>
              {logoError && <p className="mt-2 text-xs text-loss">{logoError}</p>}
            </div>
            <div>
              <span className="label-mono">Cor principal (opcional)</span>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {SWATCHES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Cor ${c}`}
                    onClick={() => setTeam(i, { color: c })}
                    className={`size-6 border ${form.color === c ? "border-white" : "border-transparent"}`}
                    style={{ background: c }}
                  />
                ))}
                <label className="relative size-6 cursor-pointer overflow-hidden border border-line" title="Outra cor">
                  <input type="color" value={form.color ?? "#3d8bff"} onChange={(e) => setTeam(i, { color: e.target.value })} className="absolute -inset-2 size-10 cursor-pointer" />
                </label>
                <button type="button" onClick={() => setTeam(i, { color: null })} className={`px-1.5 text-xs ${form.color ? "text-gray hover:text-white" : "text-white"}`}>
                  Sem cor
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <details className="mt-5 group" open={!guest}>
        <summary className="cursor-pointer list-none font-mono text-[0.7rem] uppercase tracking-[0.14em] text-gray hover:text-white">
          <span className="group-open:hidden">+ Nomes dos jogadores (opcional)</span>
          <span className="hidden group-open:inline">− Nomes dos jogadores</span>
        </summary>
        <div className="mt-3 grid gap-2">
          {LANES.map((l, k) => (
            <label key={l} className="grid grid-cols-[5.5rem_1fr] items-center gap-2">
              <span className="text-xs text-gray">{LANE_LABEL[l]}</span>
              <input
                value={form.players[k] ?? ""}
                maxLength={24}
                onChange={(e) => {
                  const players = [...form.players];
                  players[k] = e.target.value;
                  setTeam(i, { players });
                }}
                placeholder={`Jogador ${k + 1}`}
                className="w-full border border-line bg-bg-0 px-3 py-1.5 text-sm text-white placeholder:text-gray-dim focus:border-green focus:outline-none"
              />
            </label>
          ))}
        </div>
      </details>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="label-mono mb-3">{label}</p>
      {children}
    </div>
  );
}

function Segmented<T extends string | number>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex flex-wrap border border-line" role="radiogroup">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`min-w-11 px-3.5 py-2.5 font-mono text-[0.75rem] uppercase tracking-[0.12em] transition-colors ${
            value === o.value ? "bg-green text-bg-0" : "text-gray hover:bg-bg-3 hover:text-white"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
