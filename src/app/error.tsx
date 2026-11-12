"use client";

import Link from "next/link";
import { useEffect } from "react";

/** Erro numa página (ex.: banco fora do ar): mantém cabeçalho e rodapé e oferece tentar de novo. */
export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  const digest = error instanceof Error && "digest" in error ? String((error as Error & { digest?: string }).digest ?? "") : "";

  return (
    <section className="relative flex min-h-[80svh] items-center overflow-hidden pt-16">
      <div className="pointer-events-none absolute inset-0 bg-lines" />
      <div className="wrap relative">
        <p className="label-mono">Erro</p>
        <h1 className="mt-4 font-display text-[clamp(3.5rem,12vw,10rem)] font-black uppercase leading-[0.82] text-white">
          Caiu a <span className="grad-text">conexão.</span>
        </h1>
        <p className="mt-6 max-w-md text-gray">
          Não conseguimos carregar os dados agora. Normalmente volta em alguns segundos. Tente de novo.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => retry()}
            className="clip-step-sm bg-green px-6 py-3.5 font-mono text-[0.75rem] font-semibold uppercase tracking-[0.16em] text-bg-0 transition-colors hover:bg-white"
          >
            Tentar de novo
          </button>
          <Link href="/" className="clip-step-sm bg-bg-3 px-6 py-3.5 font-mono text-[0.75rem] uppercase tracking-[0.16em] text-white transition-colors hover:bg-white hover:text-bg-0">
            Voltar para a base
          </Link>
        </div>
        {digest && <p className="mt-8 font-mono text-[0.6rem] text-gray-dim">Código: {digest}</p>}
      </div>
    </section>
  );
}
