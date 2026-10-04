import { useLiveFeed, type Transport } from "./useLiveFeed";

const INFO: Record<Transport, { title: string; note: string }> = {
  poll: { title: "Short polling (every 2s)", note: "Simple; up to 2s late; most requests return nothing new." },
  "long-poll": { title: "Long polling", note: "Server holds the request until there's news. Near-instant, plain HTTP." },
  sse: { title: "Server-Sent Events", note: "One HTTP stream, server → client. Auto-reconnect and resume built in." },
  ws: { title: "WebSocket", note: "One connection, both directions. Reconnect is your job." },
};

const STATUS_COLOR = { open: "#2f7d1f", connecting: "#999", reconnecting: "#e8a317", error: "#c4321c" };

export const TransportPanel = ({ transport }: { transport: Transport }) => {
  const { ticks, status, error, requests, fills, sendOrder } = useLiveFeed(transport);
  const latest = ticks.at(-1);
  const recent = ticks.slice(-10);
  const avgDelay = recent.length ? Math.round(recent.reduce((sum, t) => sum + t.delay, 0) / recent.length) : 0;

  return (
    <div className="demo-card" style={{ marginBottom: 0 }}>
      <h4>{INFO[transport].title}</h4>
      <p style={{ fontSize: 13 }}>{INFO[transport].note}</p>
      <p>
        <span aria-hidden="true" style={{ color: STATUS_COLOR[status] }}>
          ●
        </span>{" "}
        {status}
      </p>
      {error && <p style={{ color: "#c4321c", fontSize: 13 }}>{error}</p>}
      <p style={{ fontSize: 28, margin: "4px 0", fontVariantNumeric: "tabular-nums" }}>
        {latest ? `₹${latest.price.toFixed(2)}` : "—"}
      </p>
      <dl style={{ fontSize: 13, display: "grid", gridTemplateColumns: "auto 1fr", gap: "2px 8px", margin: 0 }}>
        <dt>Last tick</dt>
        <dd style={{ margin: 0 }}>#{latest?.seq ?? "—"}</dd>
        <dt>Avg delay</dt>
        <dd style={{ margin: 0 }}>{avgDelay} ms</dd>
        <dt>{transport === "poll" || transport === "long-poll" ? "HTTP requests" : "Connections"}</dt>
        <dd style={{ margin: 0 }}>{requests}</dd>
      </dl>
      {transport === "ws" && (
        <div style={{ marginTop: 8 }}>
          <button onClick={() => sendOrder(10)} disabled={status !== "open"}>
            Buy 10 (sent on the same socket)
          </button>
          <ul style={{ fontSize: 13, paddingLeft: 18 }}>
            {fills.map((fill, i) => (
              <li key={i}>
                Filled {fill.qty} @ ₹{fill.price.toFixed(2)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
