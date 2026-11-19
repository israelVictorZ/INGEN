import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DraftTv } from "@/components/draft/DraftTv";
import { TvStandby } from "@/components/draft/DraftRoom";
import { getDraftChampions } from "@/lib/draft/champions";
import { isTvId } from "@/lib/draft/tv";

/**
 * Link fixo de transmissão do draft (fonte de navegador do OBS). Como a sala, é todo dinâmico e fica fora do
 * Google; o cabeçalho e o rodapé do site somem aqui (HideInDraftRoom pega `/draft/<qualquer coisa>`).
 */
export const instant = false;

export const metadata: Metadata = {
  title: "Draft · transmissão",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

async function Tv({ params }: { params: PageProps<"/draft/tv/[id]">["params"] }) {
  const [{ id }, data] = await Promise.all([params, getDraftChampions()]);
  if (!isTvId(id)) notFound();
  return <DraftTv id={id} data={data} />;
}

export default function DraftTvPage({ params }: PageProps<"/draft/tv/[id]">) {
  return (
    <Suspense fallback={<TvStandby loading />}>
      <Tv params={params} />
    </Suspense>
  );
}
