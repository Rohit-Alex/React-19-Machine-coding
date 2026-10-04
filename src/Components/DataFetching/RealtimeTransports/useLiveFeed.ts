import { useCallback, useEffect, useRef, useState } from "react";
import { wait } from "../RaceConditions/fakeApi";

export type Transport = "poll" | "long-poll" | "sse" | "ws";
export type Status = "connecting" | "open" | "reconnecting" | "error";

export interface Tick {
  seq: number;
  price: number;
  at: number; // Server time the tick was made.
}
export interface ReceivedTick extends Tick {
  delay: number; // How long it took to reach us.
}
export interface Fill {
  qty: number;
  price: number;
}

const POLL_MS = 2000;
const BASE = "/api/feed";

async function getTicks(url: string, signal: AbortSignal): Promise<Tick[]> {
  const res = await fetch(url, { signal });
  // In `vite preview` / production there's no feed server; the SPA fallback
  // answers with HTML. Say so instead of failing on JSON.parse.
  if (!res.ok || !res.headers.get("content-type")?.includes("json")) throw new Error("Feed server not running — start it with `yarn dev`.");
  return res.json();
}

/** One price feed, delivered by the transport you pick. Same output shape for all four. */
export function useLiveFeed(transport: Transport) {
  const [ticks, setTicks] = useState<ReceivedTick[]>([]);
  const [status, setStatus] = useState<Status>("connecting");
  const [error, setError] = useState("");
  const [requests, setRequests] = useState(0); // HTTP requests (polling) or connections opened (SSE, WS).
  const [fills, setFills] = useState<Fill[]>([]);
  // Last seq we have: asked for "everything after" on each poll / reconnect.
  const lastSeq = useRef(0);
  const socketRef = useRef<WebSocket | null>(null);

  const receive = useCallback((incoming: Tick[]) => {
    // Every transport can deliver a tick twice (a resend after reconnecting).
    // seq makes de-duplication one comparison.
    const fresh = incoming.filter((t) => t.seq > lastSeq.current);
    if (!fresh.length) return;
    lastSeq.current = fresh.at(-1)!.seq;
    const now = Date.now();
    setTicks((prev) => [...prev, ...fresh.map((t) => ({ ...t, delay: now - t.at }))].slice(-20));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    const fail = (e: unknown) => {
      if (signal.aborted) return;
      setStatus("error");
      setError((e as Error).message);
    };

    if (transport === "poll") {
      // Short polling: ask every 2s whether anything is new. Chained, not
      // setInterval, so a slow answer can't overlap the next request.
      (async () => {
        while (!signal.aborted) {
          try {
            setRequests((n) => n + 1);
            receive(await getTicks(`${BASE}/poll?since=${lastSeq.current}`, signal));
            setStatus("open");
            await wait(POLL_MS, signal);
          } catch (e) {
            return fail(e);
          }
        }
      })();
    }

    if (transport === "long-poll") {
      // Long polling: the server holds each request until there's news, then
      // we ask again at once. Near-instant, but still one request per batch.
      (async () => {
        while (!signal.aborted) {
          try {
            setRequests((n) => n + 1);
            setStatus("open");
            receive(await getTicks(`${BASE}/long-poll?since=${lastSeq.current}`, signal));
          } catch (e) {
            return fail(e);
          }
        }
      })();
    }

    if (transport === "sse") {
      // EventSource reconnects by itself and sends Last-Event-ID, so the
      // server can resend what we missed. We only listen.
      const source = new EventSource(`${BASE}/sse`);
      setRequests((n) => n + 1);
      source.onopen = () => setStatus("open");
      source.addEventListener("tick", (event) => receive([JSON.parse(event.data)]));
      source.onerror = () => {
        if (source.readyState === EventSource.CLOSED) fail(new Error("Stream closed — is the dev server running?"));
        else {
          setStatus("reconnecting"); // The browser is already retrying.
          setRequests((n) => n + 1);
        }
      };
      signal.addEventListener("abort", () => source.close());
    }

    if (transport === "ws") {
      // WebSocket: nothing reconnects for you. Back off 1s, 2s, 4s… and
      // resume with ?since= so nothing is missed or repeated.
      let attempt = 0;
      const connect = () => {
        const protocol = location.protocol === "https:" ? "wss:" : "ws:";
        const socket = new WebSocket(`${protocol}//${location.host}${BASE}/ws?since=${lastSeq.current}`);
        socketRef.current = socket;
        setRequests((n) => n + 1);
        socket.onopen = () => {
          attempt = 0;
          setStatus("open");
        };
        socket.onmessage = (event) => {
          const message = JSON.parse(event.data);
          if (message.type === "tick") receive([message.tick]);
          if (message.type === "fill") setFills((prev) => [{ qty: message.qty, price: message.price }, ...prev].slice(0, 3));
        };
        socket.onclose = () => {
          if (signal.aborted) return;
          setStatus("reconnecting");
          wait(Math.min(1000 * 2 ** attempt++, 10_000), signal).then(connect, () => {});
        };
      };
      connect();
      signal.addEventListener("abort", () => socketRef.current?.close());
    }

    return () => controller.abort();
  }, [transport, receive]);

  /** Only WebSocket can send on the same connection. */
  const sendOrder = (qty: number) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) socketRef.current.send(JSON.stringify({ type: "order", qty }));
  };

  return { ticks, status, error, requests, fills, sendOrder };
}
