import Link from "next/link";
import Image from "next/image";
import { FEATURES } from "@/lib/features";

export function Footer() {
  return (
    <footer className="no-print relative mt-32 overflow-hidden border-t border-line bg-bg-0">
      <div className="pointer-events-none absolute inset-0 bg-lines opacity-60" />
      <div className="wrap relative grid gap-12 py-16 md:grid-cols-[1.3fr_1fr_1fr]">
        <div>
          <Image src="/brand/ingen-logo.webp" alt="INGEN" width={120} height={100} />
          <p className="mt-6 max-w-sm text-sm text-gray">
            Organização brasileira de League of Legends. Dois elencos, um só escudo.
          </p>
        </div>
        <div>
          <p className="label-mono mb-4">Times</p>
          <ul className="space-y-2 text-sm">
            <li><Link className="text-white-dim hover:text-green" href="/elenco#black">INGEN Black</Link></li>
            <li><Link className="text-white-dim hover:text-green" href="/elenco#silver">INGEN Silver</Link></li>
            <li><Link className="text-white-dim hover:text-green" href="/scouting/black">Scouting</Link></li>
          </ul>
        </div>
        <div>
          <p className="label-mono mb-4">Site</p>
          <ul className="space-y-2 text-sm">
            <li><Link className="text-white-dim hover:text-green" href="/ranking">Ranking interno</Link></li>
            <li><Link className="text-white-dim hover:text-green" href="/comparar">Comparar jogadores</Link></li>
            {FEATURES.news && <li><Link className="text-white-dim hover:text-green" href="/noticias">Notícias</Link></li>}
          </ul>
        </div>
      </div>
      <div className="wrap relative border-t border-line py-8">
        <p className="max-w-4xl text-[0.7rem] leading-relaxed text-gray-dim">
          INGEN isn&apos;t endorsed by Riot Games and doesn&apos;t reflect the views or opinions of Riot Games or anyone officially
          involved in producing or managing Riot Games properties. Riot Games, and all associated properties are trademarks
          or registered trademarks of Riot Games, Inc.
        </p>
        <p className="mt-4 font-mono text-[0.68rem] uppercase tracking-[0.16em] text-gray-dim">
          © {2026} INGEN · Dados via Riot Games API
        </p>
      </div>
      <p
        aria-hidden
        className="pointer-events-none select-none text-center font-display text-[24vw] font-black leading-[0.75] tracking-tight text-white/[0.035]"
      >
        INGEN
      </p>
    </footer>
  );
}
