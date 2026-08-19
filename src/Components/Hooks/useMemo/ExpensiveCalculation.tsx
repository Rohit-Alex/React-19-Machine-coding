import { useMemo, useState } from "react";

function calculateExpensiveValue(count: number) {
  console.log("[ExpensiveCalculation] recalculating...");
  const now = performance.now();
  while (performance.now() - now < 300) {
    // simulate a slow, pure calculation
  }
  return count * 2;
}

/**
 * Scenario 1: Skipping expensive recalculations.
 * Toggling `theme` re-renders the component but should NOT log a
 * recalculation — only changing `count` (an actual dependency) should.
 */
export const ExpensiveCalculation = () => {
  const [count, setCount] = useState(0);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const expensiveValue = useMemo(() => calculateExpensiveValue(count), [count]);

  return (
    <div className="demo-card">
      <h4>1. Skipping expensive recalculations</h4>
      <p>Open the console. Toggling theme should not trigger a recalculation.</p>
      <div className="demo-actions">
        <button onClick={() => setCount((prev) => prev + 1)}>
          increment count ({count})
        </button>
        <button
          onClick={() => setTheme((prev) => (prev === "light" ? "dark" : "light"))}
        >
          toggle theme ({theme})
        </button>
      </div>
      <p>expensive value: {expensiveValue}</p>
    </div>
  );
};
