import { useState } from "react";
import { CommitTable, ProfiledPage } from "./ProfiledPage";
import { commitLog } from "./commitLog";
import "../../Hooks/hook-demo.css";

export const ProfilerDemo = () => {
  const [fixed, setFixed] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  return (
    <section>
      <h2>Diagnosing unnecessary re-renders</h2>
      <p>
        Writeup: <code>src/Components/Performance/Profiler/Profiler.md</code>. A clock ticks every
        second. The question is what else re-renders with it.
      </p>
      <div className="demo-card">
        <div className="demo-actions">
          <button onClick={() => setIsRunning((r) => !r)}>{isRunning ? "Stop" : "Start the page"}</button>
          <label>
            <input type="checkbox" checked={fixed} onChange={(e) => setFixed(e.target.checked)} /> Fix: move the clock's
            state into its own component
          </label>
          <button onClick={commitLog.clear}>Clear log</button>
        </div>
        {isRunning && <ProfiledPage fixed={fixed} />}
        <p style={{ fontSize: 13 }}>
          Unfixed: a commit every second costing ~30ms (red) — the dashboard re-renders for nothing.
          Fixed: still a commit every second, but well under 1ms; <code>baseDuration</code> stays
          ~30ms, because that's what a full re-render <em>would</em> cost.
        </p>
        <CommitTable />
      </div>
    </section>
  );
};
