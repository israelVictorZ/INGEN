import Image from "next/image";
import { EXTERNAL_LINK, isExternal } from "@/lib/links";
import Link from "next/link";
import { Split } from "@/components/motion/Split";
import type { Rank } from "@/lib/data";
import { emblemUrl, rankLabel, TIER_META, pct } from "@/lib/format";

/** Cabeçalho de seção: número gigante em pixel, label mono e título em dois tons. */
export function SectionHead({
  n,
  label,
  title,
  muted,
  children,
}: {
  n: string;
  label: string;
  title: string;
  muted?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="grid gap-6 md:grid-cols-[180px_1fr] md:gap-10">
      <div className="flex items-start gap-4 md:flex-col md:gap-3">
        <span data-reveal="fade" className="font-pixel text-6xl leading-none text-white/10 md:text-8xl">
          {n}
        </span>
        <span className="label-mono flex items-center gap-2 pt-2 md:pt-0">
          <span className="inline-block size-0 border-y-[4px] border-l-[6px] border-y-transparent border-l-green" />
          {label}
        </span>
      </div>
      <div>
        <Split className="max-w-4xl font-display text-4xl font-extrabold uppercase leading-[0.95] text-white md:text-6xl">
          {title} {muted && <span className="text-gray-dim">{muted}</span>}
        </Split>
        {children}
      </div>
    </div>
  );
}

export function RankEmblem({ tier, size = 40 }: { tier: string; size?: number }) {
  return (
    <Image
      src={emblemUrl(tier)}
      alt={TIER_META[tier]?.label ?? tier}
      width={size}
      height={size}
      className="object-contain"
      style={{ width: size, height: size, transform: "scale(3.1)" }}
    />
  );
}

export function RankLine({ rank, compact = false }: { rank: Rank | null; compact?: boolean }) {
  if (!rank)
    return <span className="font-mono text-xs uppercase tracking-widest text-gray-dim">Sem ranqueada</span>;
  const color = TIER_META[rank.tier]?.color ?? "#fff";
  return (
    <span className="inline-flex items-center gap-2">
      <span className="size-2 rotate-45" style={{ background: color, boxShadow: `0 0 12px ${color}` }} />
      <span className="font-mono text-xs uppercase tracking-wider" style={{ color }}>
        {rankLabel(rank.tier, rank.division)}
      </span>
      {!compact && <span className="font-mono text-xs text-gray">{rank.lp} PDL</span>}
    </span>
  );
}

export function WinrateBar({ value, wins, losses }: { value: number; wins?: number; losses?: number }) {
  return (
    <div>
      <div className="flex justify-between font-mono text-[0.68rem] uppercase tracking-wider text-gray">
        <span>{wins != null ? `${wins}V ${losses}D` : "Winrate"}</span>
        <span className={value >= 0.5 ? "text-green" : "text-white-dim"}>{pct(value)}</span>
      </div>
      <div className="mt-1.5 h-1 w-full bg-bg-3">
        <div data-reveal="bar" className="h-full bg-[image:var(--grad-ingen-x)]" style={{ width: `${Math.round(value * 100)}%` }} />
      </div>
    </div>
  );
}

export function ButtonLink({
  href,
  children,
  variant = "primary",
  external,
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "ghost";
  /** padrão: detectado pelo endereço (http/https abre em nova aba) */
  external?: boolean;
  className?: string;
}) {
  external ??= isExternal(href);
  const base =
    "group clip-step-sm inline-flex items-center gap-3 px-5 py-3 font-mono text-[0.75rem] font-medium uppercase tracking-[0.16em] transition-all duration-300";
  const styles =
    variant === "primary"
      ? "bg-[image:var(--grad-ingen-x)] text-bg-0 hover:brightness-110 hover:shadow-[0_0_32px_var(--glow)]"
      : "bg-bg-3 text-white hover:bg-white hover:text-bg-0";
  const arrow = (
    <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">{external ? "↗" : "→"}</span>
  );
  return external ? (
    <a href={href} {...EXTERNAL_LINK} className={`${base} ${styles} ${className}`}>
      {children}
      {arrow}
    </a>
  ) : (
    <Link href={href} className={`${base} ${styles} ${className}`}>
      {children}
      {arrow}
    </Link>
  );
}

export function TeamTag({ accent, name }: { accent: string; name: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap font-mono text-[0.68rem] uppercase tracking-[0.16em] ${
        accent === "silver" ? "text-silver" : "text-green"
      }`}
    >
      <span className={`size-1.5 ${accent === "silver" ? "bg-silver" : "bg-green"}`} />
      {name}
    </span>
  );
}
