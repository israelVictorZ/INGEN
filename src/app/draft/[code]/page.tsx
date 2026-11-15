import type { Metadata } from "next";
import { Suspense } from "react";
import { DraftRoom } from "@/components/draft/DraftRoom";
import { getDraftChampions } from "@/lib/draft/champions";

/** Sala do draft: link privado da série (fora do Google). O cabeçalho e o rodapé do site somem aqui (HideInDraftRoom). */
/**
 * A sala é toda dinâmica (código no endereço, estado ao vivo): não há casca estática para pré-gerar.
 * Sem isto, o `usePathname()` do layout (cabeçalho e HideInDraftRoom) acusa bloqueio de pré-renderização.
 */
export const instant = false;

export const metadata: Metadata = {
  title: "Sala de draft",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

async function Room({ params }: { params: PageProps<"/draft/[code]">["params"] }) {
  const [{ code }, data] = await Promise.all([params, getDraftChampions()]);
  return <DraftRoom code={code} data={data} />;
}

export default function DraftRoomPage({ params }: PageProps<"/draft/[code]">) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-bg-0">
          <span className="size-8 animate-spin rounded-full border-2 border-white/15 border-t-green" />
        </div>
      }
    >
      <Room params={params} />
    </Suspense>
  );
}
