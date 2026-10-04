import { useState } from "react";
import { ProviderWithChildren, SplitContexts, StateInParent } from "./Scenarios";
import "../../Hooks/hook-demo.css";

const VERSIONS = {
  a: { label: "A. One context, state in the page's parent", Component: StateInParent },
  b: { label: "B. One context, provider takes children", Component: ProviderWithChildren },
  c: { label: "C. Split contexts + separate actions", Component: SplitContexts },
};
type Key = keyof typeof VERSIONS;

export const ContextPerformanceDemo = () => {
  const [key, setKey] = useState<Key>("a");
  const { Component } = VERSIONS[key];
  return (
    <section>
      <h2>Context re-renders: splitting and composition</h2>
      <p>
        Writeup: <code>src/Components/Performance/ContextPerformance/ContextPerformance.md</code>.
        Press "Add to cart" in each version. Only the cart icon <em>needs</em> to re-render.
      </p>
      <div className="demo-card">
        <fieldset style={{ border: 0, padding: 0 }}>
          <legend>Version</legend>
          {(Object.keys(VERSIONS) as Key[]).map((k) => (
            <label key={k} style={{ display: "block" }}>
              <input type="radio" name="context-version" checked={key === k} onChange={() => setKey(k)} /> {VERSIONS[k].label}
            </label>
          ))}
        </fieldset>
        <Component key={key} />
      </div>
    </section>
  );
};
