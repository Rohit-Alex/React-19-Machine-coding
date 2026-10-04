import { useCallback, useEffect, useRef, useState } from "react";
import { connectSocket, fetchMessagesSince, sendMessage, type Message } from "./fakeServer";

export type Transport = "polling" | "socket";
export type Connection = "connecting" | "connected" | "reconnecting";

interface Pending {
  clientId: string;
  text: string;
  status: "sending" | "failed";
}

const POLL_MS = 2000;

export function useChat(transport: Transport) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [pending, setPending] = useState<Pending[]>([]);
  const [connection, setConnection] = useState<Connection>("connecting");
  // Highest seq we have. Read inside timers and socket callbacks, so a ref.
  const lastSeq = useRef(0);

  // The one way messages get in, from polls, sockets and send responses
  // alike. The same message can arrive twice (send response + socket), so
  // de-duplicate by id and keep server order.
  const merge = useCallback((incoming: Message[]) => {
    if (incoming.length === 0) return;
    lastSeq.current = Math.max(lastSeq.current, ...incoming.map((m) => m.seq));
    setMessages((prev) => {
      const byId = new Map(prev.map((m) => [m.id, m]));
      incoming.forEach((m) => byId.set(m.id, m));
      return [...byId.values()].sort((a, b) => a.seq - b.seq);
    });
  }, []);

  // Polling: ask every 2s. A chained setTimeout, not setInterval, so a slow
  // response can't overlap the next request. Skips while the tab is hidden.
  useEffect(() => {
    if (transport !== "polling") return;
    let stopped = false;
    let timeoutId = 0;
    const poll = async () => {
      if (document.visibilityState === "visible") {
        try {
          const fresh = await fetchMessagesSince(lastSeq.current);
          if (stopped) return;
          merge(fresh);
          setConnection("connected");
        } catch {
          setConnection("reconnecting");
        }
      }
      if (!stopped) timeoutId = window.setTimeout(poll, POLL_MS);
    };
    poll();
    return () => {
      stopped = true;
      clearTimeout(timeoutId);
    };
  }, [transport, merge]);

  // Socket: subscribe, then catch up on anything missed while disconnected.
  // Subscribe *first*: a message sent between the catch-up fetch and the
  // subscribe would otherwise be lost. Duplicates are fine — merge drops them.
  useEffect(() => {
    if (transport !== "socket") return;
    let stopped = false;
    let attempt = 0;
    let retryId = 0;
    let disconnect = () => {};

    const connect = () => {
      setConnection(attempt === 0 ? "connecting" : "reconnecting");
      disconnect = connectSocket(
        (message) => merge([message]),
        () => {
          if (stopped) return;
          setConnection("reconnecting");
          // Back off: 1s, 2s, 4s… up to 10s, so a server that's down isn't
          // hammered by every client at once.
          retryId = window.setTimeout(connect, Math.min(1000 * 2 ** attempt++, 10_000));
        },
      );
      fetchMessagesSince(lastSeq.current).then((fresh) => {
        if (stopped) return;
        merge(fresh);
        attempt = 0;
        setConnection("connected");
      });
    };

    connect();
    return () => {
      stopped = true;
      disconnect();
      clearTimeout(retryId);
    };
  }, [transport, merge]);

  const deliver = useCallback(
    async (clientId: string, text: string) => {
      setPending((prev) => prev.map((p) => (p.clientId === clientId ? { ...p, status: "sending" } : p)));
      try {
        merge([await sendMessage(clientId, text)]);
        setPending((prev) => prev.filter((p) => p.clientId !== clientId));
      } catch {
        setPending((prev) => prev.map((p) => (p.clientId === clientId ? { ...p, status: "failed" } : p)));
      }
    },
    [merge],
  );

  const send = (text: string) => {
    // Shown straight away; the clientId links it to the server's copy, and
    // makes a retry safe (the server won't post it twice).
    const clientId = crypto.randomUUID();
    setPending((prev) => [...prev, { clientId, text, status: "sending" }]);
    deliver(clientId, text);
  };

  const retry = (item: Pending) => deliver(item.clientId, item.text);

  // Hide a pending copy as soon as the real one has arrived by any route.
  const confirmed = new Set(messages.map((m) => m.clientId));
  return { messages, pending: pending.filter((p) => !confirmed.has(p.clientId)), connection, send, retry };
}
