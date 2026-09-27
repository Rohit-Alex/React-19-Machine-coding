import { useEffect, useState } from "react";
import { formatStopwatch, useStopwatch } from "./useStopwatch";

export const Stopwatch = () => {
  const { status, elapsed, laps, start, pause, lap, reset } = useStopwatch();

  // The naive version, for comparison: add 10ms every 10ms.
  const [naive, setNaive] = useState(0);
  useEffect(() => {
    if (status !== "running") return;
    const id = setInterval(() => setNaive((n) => n + 10), 10);
    return () => clearInterval(id);
  }, [status]);

  const isRunning = status === "running";

  return (
    <div className="demo-card">
      <h4>Stopwatch with laps</h4>
      <p>
        Start it, switch to another browser tab for about 10 seconds, then come
        back. The real stopwatch is right. The naive one, which counts timer
        ticks, has fallen far behind.
      </p>

      <p
        role="timer"
        style={{
          fontSize: 40,
          margin: "8px 0",
          fontVariantNumeric: "tabular-nums", // Every digit the same width, so the display doesn't wobble.
        }}
      >
        {formatStopwatch(elapsed)}
      </p>
      <p style={{ fontVariantNumeric: "tabular-nums" }}>
        naive tick-counting version: {formatStopwatch(naive)}
      </p>

      <div className="demo-actions">
        <button onClick={isRunning ? pause : start}>
          {isRunning ? "Pause" : status === "paused" ? "Resume" : "Start"}
        </button>
        <button onClick={lap} disabled={!isRunning}>
          Lap
        </button>
        <button
          onClick={() => {
            reset();
            setNaive(0);
          }}
          disabled={status === "idle"}
        >
          Reset
        </button>
      </div>

      {laps.length > 0 && (
        <ol
          reversed
          aria-live="polite"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {laps
            .map((total, i) => ({
              lapNumber: i + 1,
              total,
              split: total - (i === 0 ? 0 : laps[i - 1]),
            }))
            .reverse()
            .map(({ lapNumber, total, split }) => (
              <li key={lapNumber}>
                {formatStopwatch(split)}{" "}
                <small>(total {formatStopwatch(total)})</small>
              </li>
            ))}
        </ol>
      )}
    </div>
  );
};
