import { memo, useDeferredValue, useState, type ChangeEvent } from "react";

const ALL_ITEMS = Array.from({ length: 5000 }, (_, i) => `item ${i}`);

function slowFilter(query: string) {
  const start = performance.now();
  while (performance.now() - start < 100) {
    // artificial cost simulating an expensive filter + render
  }
  return ALL_ITEMS.filter((item) => item.includes(query)).slice(0, 200);
}

const SlowListMemo = memo(function SlowListMemo({ query }: { query: string }) {
  const filtered = slowFilter(query);
  return (
    <ul style={{ maxHeight: 120, overflow: "auto" }}>
      {filtered.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
});

function SlowListUnmemoized({ query }: { query: string }) {
  const filtered = slowFilter(query);
  return (
    <ul style={{ maxHeight: 120, overflow: "auto" }}>
      {filtered.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

/**
 * Scenario 1: deferredQuery lags behind query while the input itself
 * stays synchronous. Toggle "memoize" off to see the gotcha — without
 * memo, the deferred value buys nothing: the list re-renders on every
 * keystroke exactly as if useDeferredValue weren't there at all.
 */
export const DeferredInput = () => {
  const [query, setQuery] = useState("");
  const [memoized, setMemoized] = useState(true);
  const deferredQuery = useDeferredValue(query);
  const isStale = query !== deferredQuery;

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  return (
    <div className="demo-card">
      <h4>1. Deferred value + the memo gotcha</h4>
      <p>
        With "memoize" checked, typing stays smooth — the list only
        re-renders once <code>deferredQuery</code> catches up. Uncheck it
        and the list re-renders on every keystroke anyway, because an
        unmemoized component re-renders regardless of whether its props
        actually changed.
      </p>
      <label>
        <input
          type="checkbox"
          checked={memoized}
          onChange={(e) => setMemoized(e.target.checked)}
        />{" "}
        memoize the list
      </label>
      <div className="demo-actions">
        <input
          value={query}
          onChange={handleChange}
          placeholder="filter 5,000 items…"
        />
      </div>
      <p>stale: {isStale ? "yes" : "no"}</p>
      {memoized ? (
        <SlowListMemo query={deferredQuery} />
      ) : (
        <SlowListUnmemoized query={deferredQuery} />
      )}
    </div>
  );
};
