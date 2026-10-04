import { useState } from "react";
import { MemoBrokenByProps, MemoWithStableProps, NoMemo, StateMovedDown } from "./MemoScenarios";
import "../../Hooks/hook-demo.css";

const SCENARIOS = {
  none: { label: "A. No memo", Component: NoMemo },
  broken: { label: "B. memo, but inline props", Component: MemoBrokenByProps },
  stable: { label: "C. memo + useCallback / useMemo", Component: MemoWithStableProps },
  moved: { label: "D. No memo — state moved down", Component: StateMovedDown },
};
type Key = keyof typeof SCENARIOS;

export const MemoizationDemo = () => {
  const [key, setKey] = useState<Key>("none");
  const { Component } = SCENARIOS[key];
  return (
    <section>
      <h2>memo, useMemo, useCallback — when they help</h2>
      <p>
        Writeup: <code>src/Components/Performance/Memoization/Memoization.md</code>. The list takes
        ~40ms to render on purpose. Click the unrelated counter fast in each version and watch the
        list's render count — and how sluggish the button feels.
      </p>
      <div className="demo-card">
        <fieldset style={{ border: 0, padding: 0 }}>
          <legend>Version</legend>
          {(Object.keys(SCENARIOS) as Key[]).map((k) => (
            <label key={k} style={{ display: "block" }}>
              <input type="radio" name="memo-scenario" checked={key === k} onChange={() => setKey(k)} /> {SCENARIOS[k].label}
            </label>
          ))}
        </fieldset>
        {/* key: switching versions starts each from zero. */}
        <Component key={key} />
      </div>
    </section>
  );
};
