import { lazy, Suspense, useState, useTransition, type ComponentType } from "react";
import { wait } from "../../DataFetching/RaceConditions/fakeApi";
import { ChunkErrorBoundary } from "./ChunkErrorBoundary";
import "../../Hooks/hook-demo.css";

// Demo knobs: real chunks load fast on localhost, so add a delay to make the
// fallback visible, and an optional failure.
const knobs = { delayMs: 1200, fail: false };
async function slowImport<T>(load: () => Promise<T>) {
  await wait(knobs.delayMs);
  if (knobs.fail) throw new Error("Failed to fetch dynamically imported module (simulated)");
  return load();
}

// Keep the download promise, so hover and click share one download instead
// of starting two. (Real import() is cached by the browser anyway; this also
// covers the demo's fake delay.) Forget it on failure, so a retry re-downloads.
function once<T>(load: () => Promise<T>) {
  let promise: Promise<T> | undefined;
  return () =>
    (promise ??= load().catch((error) => {
      promise = undefined;
      throw error;
    }));
}
const loadReport = once(() => slowImport(() => import("./HeavyReport")));
const loadSettings = once(() => slowImport(() => import("./HeavySettings")));
// Preloading is best-effort: a failure here shows up properly on click.
const preloadReport = () => void loadReport().catch(() => {});

// At module level, never inside a component: lazy() inside a component makes
// a new component type every render, which remounts and refetches forever.
const makeReport = () => lazy(loadReport);
const Settings = lazy(loadSettings);

export const CodeSplittingDemo = () => {
  const [showReport, setShowReport] = useState(false);
  // lazy() remembers a failure forever. Retrying means a fresh lazy component.
  // makeReport is passed as a function on purpose: a component is itself a
  // function, so useState(Report) would *call* it. Same for setReport below.
  const [Report, setReport] = useState<ComponentType>(makeReport);
  const [tab, setTab] = useState<"overview" | "settings">("overview");
  const [isPending, startTransition] = useTransition();
  const [delay, setDelay] = useState(knobs.delayMs);
  const [fail, setFail] = useState(false);

  return (
    <section>
      <h2>Code splitting &amp; lazy loading</h2>
      <p>
        Writeup: <code>src/Components/Performance/CodeSplitting/CodeSplitting.md</code>. The report
        and settings panels are separate files the browser downloads only when needed (see the
        Network tab).
      </p>

      <div className="demo-card">
        <div className="demo-actions">
          <label>
            Simulated download time{" "}
            <select
              value={delay}
              onChange={(e) => {
                knobs.delayMs = Number(e.target.value);
                setDelay(knobs.delayMs);
              }}
            >
              <option value={0}>0s</option>
              <option value={1200}>1.2s</option>
              <option value={3000}>3s</option>
            </select>
          </label>
          <label>
            <input
              type="checkbox"
              checked={fail}
              onChange={(e) => {
                knobs.fail = e.target.checked;
                setFail(e.target.checked);
              }}
            />{" "}
            Make chunk downloads fail
          </label>
        </div>
      </div>

      <div className="demo-card">
        <h4>1. Load on demand, preload on hover</h4>
        <p>
          Hovering the button starts the download, so by the time you click it's often ready. (Only
          the first time — after that it's loaded; reload the page to try again.)
        </p>
        <button onMouseEnter={preloadReport} onFocus={preloadReport} onClick={() => setShowReport((s) => !s)}>
          {showReport ? "Hide report" : "Show report"}
        </button>
        {showReport && (
          <ChunkErrorBoundary onRetry={() => setReport(makeReport)}>
            <Suspense fallback={<p aria-busy="true">Loading report…</p>}>
              <Report />
            </Suspense>
          </ChunkErrorBoundary>
        )}
      </div>

      <div className="demo-card">
        <h4>2. Switch without the flash: useTransition</h4>
        <p>
          A tab switch inside a transition keeps the old tab on screen (dimmed) until the new one
          is ready, instead of replacing it with a spinner.
        </p>
        <div className="demo-actions" role="tablist" aria-label="Report sections">
          {(["overview", "settings"] as const).map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => startTransition(() => setTab(t))}>
              {t}
            </button>
          ))}
          {isPending && <span>Loading…</span>}
        </div>
        <div role="tabpanel" style={{ opacity: isPending ? 0.5 : 1 }}>
          <Suspense fallback={<p>Loading settings… (only shown on a first load outside a transition)</p>}>
            {tab === "overview" ? <p>Overview: everything at a glance.</p> : <Settings />}
          </Suspense>
        </div>
      </div>
    </section>
  );
};
