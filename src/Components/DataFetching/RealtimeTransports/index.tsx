import { useState } from "react";
import { TransportPanel } from "./TransportPanel";
import type { Transport } from "./useLiveFeed";
import "../../Hooks/hook-demo.css";

const TRANSPORTS: Transport[] = ["poll", "long-poll", "sse", "ws"];

export const RealtimeTransportsDemo = () => {
  // Bumping the key remounts the panels: a clean start for every transport.
  const [run, setRun] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  return (
    <section>
      <h2>Polling vs WebSockets vs SSE</h2>
      <p>
        Writeup: <code>src/Components/DataFetching/RealtimeTransports/RealtimeTransports.md</code>.
        The same price feed (a tick a second) over four transports, from a small server inside
        the Vite dev server (<code>dev-server/liveFeedPlugin.ts</code>) — so this demo needs{" "}
        <code>yarn dev</code>.
      </p>
      <div className="demo-actions">
        {/* Off by default: four live connections shouldn't run just because the tab is open. */}
        <button onClick={() => setIsRunning((r) => !r)}>{isRunning ? "Stop all" : "Start all four"}</button>
        <button
          disabled={!isRunning}
          onClick={() => fetch("/api/feed/drop", { method: "POST" })}
          title="The server cuts every open stream"
        >
          Drop connections
        </button>
        <button disabled={!isRunning} onClick={() => setRun((r) => r + 1)}>
          Restart
        </button>
      </div>
      <p style={{ fontSize: 13 }}>
        Watch: the delay (polling is up to 2s late), the request count (polling keeps asking), and
        what each does after <em>Drop connections</em> — SSE and WebSocket reconnect and fill the gap
        from the last seq they had.
      </p>
      {isRunning && (
        <div key={run} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          {TRANSPORTS.map((transport) => (
            <TransportPanel key={transport} transport={transport} />
          ))}
        </div>
      )}
    </section>
  );
};
