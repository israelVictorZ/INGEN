import type { Role } from "@/db/schema";

/**
 * Ícones de lane próprios da INGEN: um minimapa quadrado com a rota destacada.
 * A rota ativa usa o gradiente da marca; o resto do mapa fica em linha fina.
 */
export function LaneIcon({ role, className = "size-6", active = true }: { role: Role; className?: string; active?: boolean }) {
  const hot = active ? "url(#lane-grad)" : "currentColor";
  const dim = "rgb(255 255 255 / .18)";
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-label={role} role="img">
      <defs>
        <linearGradient id="lane-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7cf94f" />
          <stop offset=".5" stopColor="#3dfd4e" />
          <stop offset="1" stopColor="#00f07f" />
        </linearGradient>
      </defs>
      {/* moldura do mapa */}
      <rect x="2.5" y="2.5" width="19" height="19" stroke={dim} strokeWidth="1" />
      {role === "TOP" && (
        <>
          <path d="M3 21V5.5a2.5 2.5 0 0 1 2.5-2.5H21" stroke={dim} strokeWidth="1" />
          <path d="M4.5 21V7a2.5 2.5 0 0 1 2.5-2.5H21" stroke={hot} strokeWidth="3" strokeLinecap="square" />
          <rect x="5" y="5" width="4" height="4" fill={hot} />
        </>
      )}
      {role === "MID" && (
        <>
          <path d="M4 20 20 4" stroke={hot} strokeWidth="3" strokeLinecap="square" />
          <rect x="10" y="10" width="4" height="4" fill={hot} transform="rotate(45 12 12)" />
        </>
      )}
      {(role === "ADC" || role === "SUPPORT") && (
        <>
          <path d="M3 19.5h15.5V3" stroke={dim} strokeWidth="1" />
          <path d="M3 19.5h14a2.5 2.5 0 0 0 2.5-2.5V3" stroke={hot} strokeWidth="3" strokeLinecap="square" />
          {role === "ADC" ? (
            <path d="M12 9.5 15 7l-1 4-2-1.5Z M8 15l5-5" stroke={hot} strokeWidth="1.6" />
          ) : (
            <path d="M8.5 9.5 11 7l2.5 2.5L11 14Z" fill={hot} />
          )}
        </>
      )}
      {role === "JUNGLE" && (
        <>
          <path d="M4 20 20 4" stroke={dim} strokeWidth="1" />
          <path d="M7 17c1.5-4 1-7 0-10 2.5 2 4 4.5 4.2 7.5.8-3 2.3-5.3 4.8-6.5-1.6 2.6-2.2 5.6-1.8 9" stroke={hot} strokeWidth="2" strokeLinejoin="round" />
        </>
      )}
    </svg>
  );
}
