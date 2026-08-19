import { memo, useCallback, useState } from "react";

function useCounter(initial: number) {
  const [count, setCount] = useState(initial);

  const increment = useCallback(() => setCount((c) => c + 1), []);
  const reset = useCallback(() => setCount(initial), []);

  return { count, increment, reset };
}

const IncrementButton = memo(({ onClick }: { onClick: () => void }) => {
  console.log("[IncrementButton] rendering");
  return <button onClick={onClick}>+1</button>;
});

/**
 * Scenario 4: Optimizing a custom Hook.
 * `useCounter` wraps its returned functions in useCallback, so
 * IncrementButton never re-renders on unrelated state — a guarantee the
 * consumer of this hook couldn't provide for themselves otherwise.
 */
export const CustomHookOptimization = () => {
  const { count, increment, reset } = useCounter(0);
  const [unrelated, setUnrelated] = useState(0);

  return (
    <div className="demo-card">
      <h4>2. Optimizing a custom Hook</h4>
      <p>
        Open the console. Forcing a re-render should not re-render{" "}
        <code>IncrementButton</code>.
      </p>
      <div className="demo-actions">
        <button onClick={() => setUnrelated((prev) => prev + 1)}>
          unrelated re-render ({unrelated})
        </button>
        <button onClick={reset}>reset</button>
      </div>
      <p>count: {count}</p>
      <IncrementButton onClick={increment} />
    </div>
  );
};
