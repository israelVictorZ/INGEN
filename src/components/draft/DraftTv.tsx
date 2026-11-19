"use client";

import { useCallback, useEffect, useState } from "react";
import type { DraftChampionData } from "@/lib/draft/lanes";
import { DraftRoom, TvStandby } from "./DraftRoom";
import { deviceId } from "./useDraftSync";

/** Sem o Ably (ou com ele fora do ar): pergunta à resposta em cache da Vercel, que não acorda o banco. */
const POLL_MS = 15_000;

/**
 * Link fixo de transmissão (`/draft/tv/<id>`), cadastrado uma vez no OBS. Mostra a sala que está no ar para
 * este link e troca sozinho quando alguém cria um draft com "Mostrar na transmissão".
 *
 * Custo: com o Ably, a tela pergunta uma vez ao abrir e depois só escuta o canal `draft:tv-<id>` (o mesmo
 * clientId do aparelho que a sala usa: o OBS conta um usuário no mês). Sem o Ably, pergunta a cada 15 s a uma
 * resposta em cache.
 */
export function DraftTv({ id, data }: { id: string; data: DraftChampionData }) {
  /** undefined: ainda lendo; null: nenhuma sala no ar */
  const [code, setCode] = useState<string | null | undefined>(undefined);
  const [rt, setRt] = useState(false);
  /** o canal do Ably está no ar: não precisa perguntar */
  const [rtLive, setRtLive] = useState(false);

  const read = useCallback(async () => {
    try {
      const res = await fetch(`/api/draft-tv/${id}`);
      if (!res.ok) return void setCode((c) => (c === undefined ? null : c));
      const d = (await res.json()) as { code: string | null; rt: boolean };
      setCode(d.code);
      setRt(d.rt);
    } catch {
      setCode((c) => (c === undefined ? null : c));
    }
  }, [id]);

  useEffect(() => {
    // primeira leitura (depois da montagem, como a da sala)
    const first = setTimeout(read, 0);
    return () => clearTimeout(first);
  }, [read]);

  // reserva: sem o Ably no ar, pergunta de tempo em tempo
  useEffect(() => {
    if (rtLive) return;
    const t = setInterval(read, POLL_MS);
    return () => clearInterval(t);
  }, [rtLive, read]);

  // tempo real: escuta o aviso de troca de sala
  useEffect(() => {
    if (!rt) return;
    let closed = false;
    let attachedOnce = false;
    let client: import("@ably/pubsub-device").PubSubClient | null = null;
    const did = deviceId();
    (async () => {
      const { createClient, WebSocketTransport, FetchRequest } = await import("@ably/pubsub-device/modular");
      if (closed) return;
      client = createClient({
        authUrl: `/api/draft-tv/${id}/ably`,
        authMethod: "POST",
        authParams: did ? { did } : {},
        plugins: { WebSocketTransport, FetchRequest },
        closeOnUnload: true,
      });
      const channel = client.channels.get(`draft:tv-${id}`);
      client.connection.on((change) => {
        if (change.current !== "connected") setRtLive(false);
        else if (channel.state === "attached") setRtLive(true);
      });
      channel.on((change) => {
        if (change.current === "attached") {
          // voltou sem retomar o que perdeu: lê de novo
          if (attachedOnce && !change.resumed) read();
          attachedOnce = true;
          setRtLive(client?.connection.state === "connected");
        } else if (change.current !== "attaching") setRtLive(false);
      });
      await channel.subscribe("room", (msg) => {
        const d = (typeof msg.data === "string" ? JSON.parse(msg.data) : msg.data) as { code?: unknown };
        if (typeof d?.code === "string") setCode(d.code);
      });
    })().catch((e) => {
      console.warn("draft: tempo real da transmissão indisponível, usando consultas", e);
      setRtLive(false);
    });
    return () => {
      closed = true;
      setRtLive(false);
      try {
        client?.close();
      } catch {
        /* já fechado */
      }
    };
  }, [rt, id, read]);

  if (code === undefined) return <TvStandby loading />;
  if (!code) return <TvStandby />;
  return <DraftRoom key={code} code={code} data={data} tv />;
}
