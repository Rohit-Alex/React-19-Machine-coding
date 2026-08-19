import { useDeferredValue, useState, type ChangeEvent } from "react";

function slowResults(query: string) {
  const start = performance.now();
  while (performance.now() - start < 150) {
    // artificial cost so the staleness window is actually visible
  }
  return `results for "${query}"`;
}

/**
 * Scenario 2: query !== deferredQuery tells you the screen is behind
 * what was typed — dim it while stale so the lag reads as intentional.
 */
export const StaleIndicator = () => {
  const [query, setQuery] = useState("react");
  const deferredQuery = useDeferredValue(query);
  const isStale = query !== deferredQuery;

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  return (
    <div className="demo-card">
      <h4>2. Flagging stale content</h4>
      <p>
        The results panel dims while <code>query !== deferredQuery</code> —
        a visual cue that what's showing hasn't caught up to the input yet.
      </p>
      <div className="demo-actions">
        <input value={query} onChange={handleChange} />
      </div>
      <div
        style={{
          opacity: isStale ? 0.5 : 1,
          transition: isStale ? "opacity 0.2s 0.2s linear" : "opacity 0s",
        }}
      >
        {slowResults(deferredQuery)}
      </div>
    </div>
  );
};
