/*
 * Dev-only backend for the "Polling vs WebSockets vs SSE" demo. One price
 * feed (a tick every second), served four ways:
 *
 *   GET /api/feed/poll?since=N       short polling: answer now
 *   GET /api/feed/long-poll?since=N  long polling: hold until there's news
 *   GET /api/feed/sse                Server-Sent Events stream
 *   WS  /api/feed/ws?since=N         WebSocket (two-way: accepts orders)
 *   POST /api/feed/drop              cut every open stream (to test reconnects)
 *
 * No dependencies: the WebSocket handshake and frames are done by hand, which
 * is also the clearest way to see what a WebSocket actually is.
 */
import { createHash } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Duplex } from "node:stream";
import type { Plugin } from "vite";

interface Tick {
  seq: number;
  price: number;
  at: number; // Server time, so clients can show how stale each tick is.
}

const LONG_POLL_MS = 20_000;
const KEEP = 100;

export function liveFeedPlugin(): Plugin {
  return {
    name: "live-feed",
    apply: "serve",
    configureServer(server) {
      const ticks: Tick[] = [];
      let price = 100;
      const longPollWaiters = new Set<() => void>();
      const sseClients = new Set<ServerResponse>();
      const wsClients = new Set<Duplex>();

      const since = (seq: number) => ticks.filter((t) => t.seq > seq);

      const timer = setInterval(() => {
        price = Math.max(1, +(price + (Math.random() - 0.5) * 2).toFixed(2));
        const tick = { seq: (ticks.at(-1)?.seq ?? 0) + 1, price, at: Date.now() };
        ticks.push(tick);
        if (ticks.length > KEEP) ticks.shift();
        longPollWaiters.forEach((wake) => wake());
        sseClients.forEach((res) => writeSse(res, tick));
        wsClients.forEach((socket) => sendWs(socket, { type: "tick", tick }));
      }, 1000);
      // SSE comment lines keep proxies from closing an idle stream.
      const heartbeat = setInterval(() => sseClients.forEach((res) => res.write(": ping\n\n")), 15_000);
      server.httpServer?.on("close", () => {
        clearInterval(timer);
        clearInterval(heartbeat);
      });

      server.middlewares.use((req, res, next) => {
        const url = new URL(req.url ?? "", "http://localhost");
        const after = Number(url.searchParams.get("since") ?? 0);

        if (url.pathname === "/api/feed/poll") return json(res, since(after));

        if (url.pathname === "/api/feed/long-poll") {
          if (since(after).length) return json(res, since(after));
          // Nothing new: keep the request open until a tick arrives or we time out.
          const finish = () => {
            clearTimeout(timeoutId);
            longPollWaiters.delete(finish);
            if (!res.writableEnded) json(res, since(after));
          };
          const timeoutId = setTimeout(finish, LONG_POLL_MS);
          longPollWaiters.add(finish);
          req.on("close", () => {
            clearTimeout(timeoutId);
            longPollWaiters.delete(finish);
          });
          return;
        }

        if (url.pathname === "/api/feed/sse") {
          res.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          });
          res.write("retry: 2000\n\n"); // Tell EventSource to reconnect after 2s.
          // EventSource sends the last id it saw when it reconnects: resend what it missed.
          const lastId = Number(req.headers["last-event-id"] ?? 0);
          if (lastId) since(lastId).forEach((tick) => writeSse(res, tick));
          sseClients.add(res);
          req.on("close", () => sseClients.delete(res));
          return;
        }

        if (url.pathname === "/api/feed/drop" && req.method === "POST") {
          sseClients.forEach((r) => r.destroy());
          sseClients.clear();
          wsClients.forEach((s) => s.destroy());
          wsClients.clear();
          return json(res, { dropped: true });
        }

        next();
      });

      // WebSocket starts life as an HTTP request asking to "upgrade".
      // Vite's own HMR socket uses this event too; it ignores other paths.
      server.httpServer?.on("upgrade", (req: IncomingMessage, socket: Duplex) => {
        const url = new URL(req.url ?? "", "http://localhost");
        if (url.pathname !== "/api/feed/ws") return;
        const key = req.headers["sec-websocket-key"];
        if (!key) return socket.destroy();

        const accept = createHash("sha1").update(key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11").digest("base64");
        socket.write(
          "HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n" +
            `Sec-WebSocket-Accept: ${accept}\r\n\r\n`,
        );
        wsClients.add(socket);
        // Catch up from where the client says it got to (it passes ?since=).
        since(Number(url.searchParams.get("since") ?? 0)).forEach((tick) => sendWs(socket, { type: "tick", tick }));

        readWsMessages(socket, (text) => {
          // Two-way: the client can send orders on the same connection.
          const message = JSON.parse(text) as { type: string; qty: number };
          if (message.type === "order") {
            sendWs(socket, { type: "fill", qty: message.qty, price, at: Date.now() });
          }
        });
        socket.on("close", () => wsClients.delete(socket));
        socket.on("error", () => wsClients.delete(socket));
      });
    },
  };
}

function json(res: ServerResponse, body: unknown) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

function writeSse(res: ServerResponse, tick: Tick) {
  // id: lets the browser resume after a reconnect. Blank line ends the event.
  res.write(`id: ${tick.seq}\nevent: tick\ndata: ${JSON.stringify(tick)}\n\n`);
}

/** Server → client frame: FIN + text opcode, unmasked, then the length. */
function sendWs(socket: Duplex, message: unknown) {
  const payload = Buffer.from(JSON.stringify(message));
  const length = payload.length;
  const header =
    length < 126
      ? Buffer.from([0x81, length])
      : length < 65536
        ? Buffer.from([0x81, 126, length >> 8, length & 0xff])
        : Buffer.concat([Buffer.from([0x81, 127]), (() => { const b = Buffer.alloc(8); b.writeBigUInt64BE(BigInt(length)); return b; })()]);
  socket.write(Buffer.concat([header, payload]));
}

/**
 * Client → server frames are always masked. Data can arrive split across
 * chunks, so buffer until a whole frame is there.
 */
function readWsMessages(socket: Duplex, onText: (text: string) => void) {
  let buffer = Buffer.alloc(0);
  socket.on("data", (chunk: Buffer) => {
    buffer = Buffer.concat([buffer, chunk]);
    while (buffer.length >= 2) {
      const opcode = buffer[0] & 0x0f;
      let length = buffer[1] & 0x7f;
      let offset = 2;
      if (length === 126) {
        if (buffer.length < 4) return;
        length = buffer.readUInt16BE(2);
        offset = 4;
      } else if (length === 127) {
        return socket.destroy(); // ponytail: no 64-bit frames; nothing here sends one.
      }
      if (buffer.length < offset + 4 + length) return; // Wait for the rest.
      const mask = buffer.subarray(offset, offset + 4);
      const data = Buffer.from(buffer.subarray(offset + 4, offset + 4 + length).map((byte, i) => byte ^ mask[i % 4]));
      buffer = buffer.subarray(offset + 4 + length);

      if (opcode === 0x1) onText(data.toString());
      else if (opcode === 0x8) return socket.end(Buffer.from([0x88, 0])); // Close: reply close.
      else if (opcode === 0x9) socket.write(Buffer.concat([Buffer.from([0x8a, data.length]), data])); // Ping → pong.
    }
  });
}
