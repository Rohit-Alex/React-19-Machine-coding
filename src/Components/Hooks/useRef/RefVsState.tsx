import { useRef, useState } from "react";

/**
 * Scenario 1: refs don't trigger re-renders, state does.
 * Same click handler pattern, two different storage mechanisms.
 */
export const RefVsState = () => {
  const [stateCount, setStateCount] = useState(0);
  const refCount = useRef(0);
  const [, forceRender] = useState(0);

  const handleClick = () => {
    setStateCount((c) => c + 1);
  };

  const handleIncrementRef = () => {
    refCount.current += 1;
  };

  return (
    <div className="demo-card">
      <h4>1. Ref vs state: who actually updates the screen</h4>
      <p>
        Both counters increment on every click. Only the state counter
        re-renders and shows the new number immediately — the ref counter's{" "}
        <code>current</code> is updated too, but the screen won't reflect it
        until something else forces a re-render.
      </p>
      <div className="demo-actions">
        <button onClick={handleClick}>update count</button>
        <button onClick={handleIncrementRef}>update ref</button>
        <button onClick={() => forceRender((n) => n + 1)}>
          force a re-render (reveals the true ref value)
        </button>
      </div>
      <p>state count: {stateCount}</p>
      <p>ref count (stale until forced): {refCount.current}</p>
    </div>
  );
};
