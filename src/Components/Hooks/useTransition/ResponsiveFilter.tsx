import { memo, useState, useTransition, type ChangeEvent } from "react";

const ALL_ITEMS = Array.from({ length: 5000 }, (_, i) => `item ${i}`);

/**
 * memo is load-bearing here, not decorative: `text` (synchronous) and
 * `query` (transition) are sibling state in the same component, so every
 * keystroke also triggers a *synchronous* re-render of this tree with an
 * unchanged `query` prop. Without memo, ResultsList would rerun its 100ms
 * cost on that sync pass too — a non-interruptible render — which is what
 * froze the input.
 */
const ResultsList = memo(function ResultsList({ query }: { query: string }) {
  const start = performance.now();
  while (performance.now() - start < 100) {
    // artificial cost simulating an expensive filter + render
  }
  const filtered = ALL_ITEMS.filter((item) => item.includes(query)).slice(
    0,
    200,
  );
  return (
    <ul style={{ maxHeight: 150, overflow: "auto" }}>
      {filtered.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
});

/**
 * Scenario 2: the input's displayed value (`text`) updates synchronously
 * every keystroke, so typing never lags. The value that actually drives
 * the ~100ms-per-render filtered list (`query`) is set inside
 * startTransition, so the expensive list catches up on its own schedule.
 */
export const ResponsiveFilter = () => {
  const [text, setText] = useState("");
  const [query, setQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setText(value);
    startTransition(() => {
      setQuery(value);
    });
  };

  return (
    <div className="demo-card">
      <h4>2. Responsive input while filtering a large list</h4>
      <p>
        Type fast — the input never stutters even though each list render
        costs ~100ms, because only <code>query</code> (not the input's own
        value) is behind the transition.
      </p>
      <div className="demo-actions">
        <input
          value={text}
          onChange={handleChange}
          placeholder="filter 5,000 items…"
        />
      </div>
      {isPending && <p>⏳ updating list…</p>}
      <ResultsList query={query} />
    </div>
  );
};
