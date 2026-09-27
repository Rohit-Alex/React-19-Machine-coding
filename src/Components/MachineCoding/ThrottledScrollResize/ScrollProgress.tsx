import { useCallback, useEffect, useRef, useState } from "react";
import { useThrottleCallback } from "../../Hooks/useThrottle/useThrottleCallback";
import { useRafThrottle } from "./useRafThrottle";

type Mode = "raw" | "raf" | "throttle";

const MODE_LABEL: Record<Mode, string> = {
  raw: "every event",
  raf: "requestAnimationFrame",
  throttle: "throttle 100ms",
};

export const ScrollProgress = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const eventsRef = useRef(0);
  const runsRef = useRef(0);

  const [mode, setMode] = useState<Mode>("raf");
  const [stats, setStats] = useState({ progress: 0, events: 0, runs: 0 });

  const update = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    runsRef.current += 1;
    const max = el.scrollHeight - el.clientHeight;
    setStats({
      progress: max > 0 ? el.scrollTop / max : 0,
      events: eventsRef.current,
      runs: runsRef.current,
    });
  }, []);

  const rafUpdate = useRafThrottle(update);
  const throttledUpdate = useThrottleCallback(update, 100);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onScroll = () => {
      eventsRef.current += 1;
      if (mode === "raf") rafUpdate();
      else if (mode === "throttle") throttledUpdate();
      else update();
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [mode, rafUpdate, throttledUpdate, update]);

  const changeMode = (next: Mode) => {
    eventsRef.current = 0;
    runsRef.current = 0;
    setStats({ progress: 0, events: 0, runs: 0 });
    setMode(next);
  };

  return (
    <div className="demo-card">
      <h4>Scroll progress: coalescing a firehose</h4>
      <p>
        Scroll the box below, then compare the two counters. Every mode sees the
        same number of scroll events — what changes is how many of them turn
        into a render.
      </p>

      <div className="demo-actions">
        {(Object.keys(MODE_LABEL) as Mode[]).map((value) => (
          <button
            key={value}
            onClick={() => changeMode(value)}
            aria-pressed={mode === value}
            style={{
              fontWeight: mode === value ? 700 : 400,
            }}
          >
            {MODE_LABEL[value]}
          </button>
        ))}
      </div>

      <div
        style={{
          height: 8,
          background: "rgba(128,128,128,0.25)",
          borderRadius: 4,
          overflow: "hidden",
          margin: "8px 0",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${(stats.progress * 100).toFixed(1)}%`,
            background: "currentColor",
          }}
        />
      </div>

      <div
        ref={scrollRef}
        style={{
          height: 140,
          overflowY: "auto",
          border: "1px solid rgba(128,128,128,0.4)",
          borderRadius: 6,
          padding: "0 12px",
        }}
      >
        <div style={{ height: 1200, paddingTop: 12 }}>
          Scroll me — 1200px of content in a 140px window.
        </div>
      </div>

      <p>
        scroll events: <strong>{stats.events}</strong> · handler runs:{" "}
        <strong>{stats.runs}</strong>
        {stats.runs > 0 && (
          <>
            {" "}
            · {(stats.events / stats.runs).toFixed(1)} events collapsed into
            each run
          </>
        )}
      </p>
      <p>
        In <code>every event</code> the two counters stay locked together — one
        render per event, which is the jank. <code>requestAnimationFrame</code>{" "}
        collapses them to one per frame, so you never compute a position the
        screen will not get a chance to show.
      </p>
    </div>
  );
};
