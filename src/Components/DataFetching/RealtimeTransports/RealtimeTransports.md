# Polling vs WebSockets vs SSE

> **The question:** "Your page needs live updates — prices, notifications, a
> chat, a build log. How do you get them from the server?"
>
> There are four answers, and the senior part is picking one with reasons
> instead of saying "WebSockets" by reflex. Most live features only need data
> going *one way*, and that changes the answer.

Runnable demo: [`index.tsx`](./index.tsx) (needs `yarn dev`) · client hook:
[`useLiveFeed.ts`](./useLiveFeed.ts) · panels: [`TransportPanel.tsx`](./TransportPanel.tsx) ·
server: [`dev-server/liveFeedPlugin.ts`](../../../../dev-server/liveFeedPlugin.ts)

The demo uses the real browser APIs (`fetch`, `EventSource`, `WebSocket`)
against a real server: a small Vite plugin serves one price feed (a tick a
second) four ways. The WebSocket side is written by hand on `node:http` — no
library — so you can see what the protocol actually does. All four endpoints
were checked from the command line: poll answers at once, long poll holds the
request until the next tick, SSE resumes from `Last-Event-ID`, and the
WebSocket streams ticks, answers an order on the same connection, and closes
when the server drops it. Vite's own hot-reload socket still works alongside.

---

## 1. The four options

| | Short polling | Long polling | SSE | WebSocket |
| --- | --- | --- | --- | --- |
| How | `fetch` every N seconds | `fetch`; server holds it until there's news; repeat | One HTTP response that never ends; server writes events into it | HTTP request "upgraded" into a two-way connection |
| Direction | client asks | client asks | server → client | both ways |
| Delay | up to N seconds | almost none | almost none | almost none |
| Requests | one per interval, mostly empty | one per batch of news | one, kept open | one, kept open |
| Reconnect / resume | n/a — every request is fresh | n/a — loop again | **built in** (`retry:`, `Last-Event-ID`) | **you write it** |
| Works through proxies, CDNs, firewalls | ✅ plain HTTP | ✅ (watch proxy timeouts) | ✅ HTTP, but proxies must not buffer | usually; some corporate proxies block it |
| Server cost | many short requests | many waiting requests | many open responses | many open sockets |
| Browser API | `fetch` | `fetch` | `EventSource` | `WebSocket` |

Analogy: getting news about a parcel.
- **Short polling**: you ring the depot every 10 minutes. "Any news?" "No."
- **Long polling**: you ring, and they stay on the line until there *is*
  news, then you ring again.
- **SSE**: you subscribe to text updates. They message you; you can't reply
  on that channel.
- **WebSocket**: an open phone line. Either side talks whenever.

---

## 2. Which one, when

- **Short polling** — updates every minute or so are fine (a dashboard, "is
  my export ready?"). Simplest, cacheable, no long-lived connections. Pick
  the interval from how stale the data may be.
- **Long polling** — you need near-instant updates but can only do plain
  request/response (old infrastructure, serverless functions with no
  streaming). Mostly a fallback today.
- **SSE** — the server pushes and the client mostly listens: notifications,
  live scores, prices, progress of a long job, **streaming AI responses**
  (token by token). Client actions still go over normal `fetch` POSTs.
  Reconnect and resume come free.
- **WebSocket** — both sides send often, with low delay: chat with typing
  indicators, multiplayer games, collaborative editing, trading with orders.

**The common mistake** is WebSocket for everything. A notifications bell
sends nothing back on the socket; SSE gives the same live updates with
automatic reconnect and less code. Ask "does the client send a stream of
messages too?" If not, SSE (or polling).

---

## 3. Short polling, done right

```ts
while (!signal.aborted) {
  receive(await getTicks(`/poll?since=${lastSeq}`, signal));
  await wait(2000, signal);
}
```

- **Chain the waits, don't `setInterval`.** If a response takes longer than
  the interval, `setInterval` starts the next request before the last one
  finished — they pile up, and answers can arrive out of order.
- **Ask for "since"**, not "everything" — cheap answers when nothing changed.
- **Pause while the tab is hidden** (`visibilitychange`), and back off on
  errors. Thousands of hidden tabs polling every 2s is a real server bill.
  (The demo skips both, so the four panels stay comparable; a poll error
  just stops that panel.)
- Cancel with an `AbortSignal` on unmount ([RaceConditions](../RaceConditions/RaceConditions.md)).

## 4. Long polling

The server answers straight away if it has news; otherwise it keeps the
request open until a tick arrives (or 20s pass and it answers empty). The
client immediately asks again. Near-instant, but each batch still costs a
full request, and the server holds one waiting request per client. The
timeout must be shorter than any proxy's idle limit, or the proxy cuts it.

## 5. SSE

```ts
const source = new EventSource("/api/feed/sse");
source.addEventListener("tick", (e) => receive([JSON.parse(e.data)]));
```

The wire format is plain text:

```
retry: 2000

id: 42
event: tick
data: {"seq":42,"price":101.3}

```

- **`id:`** — the browser remembers the last one. When the connection drops,
  it reconnects on its own after `retry` ms and sends a **`Last-Event-ID`**
  header; the server resends what was missed. Click *Drop connections* in the
  demo and watch SSE fill the gap without any client code.
- **Heartbeats** (`: ping` comment lines every 15s) keep proxies and load
  balancers from closing an idle stream.
- **Limits**: text only; server → client only; `EventSource` can't set
  headers (use cookies, or a token in the URL — careful, URLs get logged);
  on HTTP/1.1 browsers allow about **6 connections per domain**, so many
  SSE tabs can starve your other requests (HTTP/2 removes this). Proxies
  like nginx buffer responses unless told not to (`X-Accel-Buffering: no`).

## 6. WebSocket

```ts
const socket = new WebSocket(`ws://host/api/feed/ws?since=${lastSeq}`);
socket.onmessage = (e) => handle(JSON.parse(e.data));
socket.send(JSON.stringify({ type: "order", qty: 10 }));
```

What the hand-written server shows:
- It starts as an **HTTP request with `Upgrade: websocket`**. The server
  answers `101 Switching Protocols` with a hash of the client's key; from then
  on the TCP connection carries **frames**, not HTTP.
- **Client → server frames are masked** (XOR with a 4-byte key), server →
  client frames aren't. Data can arrive split across chunks, so the reader
  buffers until a whole frame is there.
- Control frames: **close** (reply with close), **ping** (reply with pong).

What you must build yourself on the client:
- **Reconnect with backoff** (1s, 2s, 4s… capped), so a server restart isn't
  hit by every client at once. Add random jitter in production.
- **Resume**: reconnect with "since my last seq", and de-duplicate by seq.
- **Heartbeats**: a connection can die silently (phone switched networks).
  Ping every ~30s; no pong → reconnect.
- **Your own message protocol**: `{ type, … }` messages, request ids if you
  need replies, and a plan for messages sent while disconnected (queue or
  drop).

Libraries like Socket.IO exist mostly to provide that list — plus fallback to
long polling.

---

## 7. One output shape for every transport

`useLiveFeed(transport)` returns the same `{ ticks, status, requests }`
whatever the transport. The panels don't know how data arrived. That keeps
the choice of transport a one-line change — and in an interview, it's the
design point: **the component asks for a stream of updates; the transport is
a detail behind the hook.**

Every transport funnels into one `receive(ticks)` that drops anything with a
`seq` it already has. Duplicates happen with all of them (resends after
reconnect), and `seq` makes them harmless.

---

## 8. Follow-ups to expect

| They ask | Short answer |
| --- | --- |
| "Millions of clients." | Open connections are the cost: dedicated connection servers, a pub/sub layer (Redis, Kafka) to fan out messages to whichever server holds each client, sticky sessions or a shared session store. HLD territory. |
| "Auth on SSE / WebSocket." | Cookies work for both (same site). Browser `WebSocket` can't set headers either: send a short-lived token as the first message, or in the URL. Re-check auth on reconnect. |
| "Several tabs open." | Each tab opens its own connection. Share one with a `SharedWorker`, or elect a leader tab with `BroadcastChannel` / Web Locks and relay to the others. |
| "Streaming an AI answer." | SSE (or a `fetch` response body read as a stream). One-way, text, resumable — exactly SSE's shape. |
| "Mobile app goes to background." | Connections get killed. On return: reconnect, then fetch "since last seq". Push notifications for when the app is closed. |
| "React side: where does the socket live?" | One connection per app, not per component: a module-level client or a provider, with components subscribing to message types (`useSyncExternalStore`). Never open a socket inside a list item. |
| "WebTransport?" | Newer, over HTTP/3: several streams, unreliable datagrams for games. Not in every browser yet; mention it, don't build on it. |

---

## 9. Scoring notes

- **Mid:** knows polling and WebSockets; reaches for WebSockets by default;
  `setInterval` polling; no reconnect plan.
- **Senior:** compares all four with direction, delay, cost and
  infrastructure; picks SSE for server → client and can say why; chained
  polling with "since" and pausing when hidden; knows SSE's built-in
  reconnect and `Last-Event-ID`, its connection limit and proxy buffering;
  knows what a WebSocket client must add (backoff, resume, heartbeat,
  protocol); de-duplicates by sequence number; and hides the transport
  behind one hook.
