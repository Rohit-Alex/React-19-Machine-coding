import { Profiler, useEffect, useState, useSyncExternalStore } from "react";
import { RenderCount, slowDown } from "../RenderCount";
import { commitLog, onRender } from "./commitLog";

const useNow = () => {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
};

const SlowDashboard = () => {
  slowDown(30);
  return (
    <p style={{ fontSize: 13 }}>
      📊 Dashboard (30ms to render) <RenderCount label="Dashboard" />
    </p>
  );
};

// ❌ The clock's state lives in the page, so every tick re-renders the page,
// including the slow dashboard that doesn't use the time at all.
const PageWithClockInside = () => {
  const now = useNow();
  return (
    <div>
      <p>
        🕒 {now.toLocaleTimeString()} <RenderCount label="Page" />
      </p>
      <SlowDashboard />
    </div>
  );
};

// ✅ The clock owns its own state. A tick re-renders only <Clock />.
const Clock = () => <>🕒 {useNow().toLocaleTimeString()}</>;
const PageWithClockOutside = () => (
  <div>
    <p>
      <Clock /> <RenderCount label="Page" />
    </p>
    <SlowDashboard />
  </div>
);

export const ProfiledPage = ({ fixed }: { fixed: boolean }) => (
  // The same API the DevTools Profiler uses, readable from code.
  <Profiler id={fixed ? "Page (fixed)" : "Page"} onRender={onRender}>
    {fixed ? <PageWithClockOutside /> : <PageWithClockInside />}
  </Profiler>
);

export const CommitTable = () => {
  const commits = useSyncExternalStore(commitLog.subscribe, commitLog.get);
  return (
    <table style={{ fontSize: 12, fontVariantNumeric: "tabular-nums", borderCollapse: "collapse" }}>
      <caption style={{ textAlign: "left" }}>Last commits (newest first)</caption>
      <thead>
        <tr>
          {["#", "Profiler id", "phase", "actualDuration", "baseDuration"].map((h) => (
            <th key={h} style={{ textAlign: "left", padding: "2px 8px" }}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {commits.map((c) => (
          <tr key={c.n}>
            <td style={{ padding: "2px 8px" }}>{c.n}</td>
            <td style={{ padding: "2px 8px" }}>{c.id}</td>
            <td style={{ padding: "2px 8px" }}>{c.phase}</td>
            <td style={{ padding: "2px 8px", color: c.actualDuration > 16 ? "#c4321c" : undefined }}>{c.actualDuration.toFixed(1)} ms</td>
            <td style={{ padding: "2px 8px" }}>{c.baseDuration.toFixed(1)} ms</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
