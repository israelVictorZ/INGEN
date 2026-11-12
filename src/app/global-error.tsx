"use client";

/** Último recurso: o próprio layout falhou. Precisa de <html>/<body> e estilos próprios (sem o CSS do site). */
export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, minHeight: "100vh", display: "grid", placeItems: "center", background: "#04060a", color: "#f4f6f8", fontFamily: "system-ui, sans-serif" }}>
        <main style={{ padding: 24, maxWidth: 480 }}>
          <p style={{ color: "#3dfd4e", fontFamily: "monospace", letterSpacing: 3, fontSize: 12, textTransform: "uppercase" }}>INGEN · erro</p>
          <h1 style={{ fontSize: 48, lineHeight: 1, margin: "12px 0", textTransform: "uppercase" }}>Algo saiu do mapa.</h1>
          <p style={{ color: "#8a8f98" }}>O site não conseguiu carregar. Tente de novo em alguns segundos.</p>
          <button
            type="button"
            onClick={() => retry()}
            style={{ marginTop: 20, padding: "12px 20px", background: "#3dfd4e", color: "#04060a", border: 0, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: 2, cursor: "pointer" }}
          >
            Tentar de novo
          </button>
        </main>
      </body>
    </html>
  );
}
