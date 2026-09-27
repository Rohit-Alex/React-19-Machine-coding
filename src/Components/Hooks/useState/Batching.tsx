import { useState } from "react";

/**
 * Scenario 3: Batching.
 * Both buttons call setCount three times. Despite that, "render count"
 * (logged during render) only increments by 1 per click, not 3 — React
 * batches all set calls inside one event handler into a single re-render.
 */
export const Batching = () => {
  const [count, setCount] = useState(0);
  const [renders, setRenders] = useState(0);

  console.log("[Batching] rendering, count =", count);

  const handleClickDirect = () => {
    setCount(count + 1);
    setCount(count + 1);
    setCount(count + 1); // still only +1: each reads the same stale `count`
    setRenders((r) => r + 1);
  };

  const handleClickUpdater = () => {
    setCount((c) => c + 1);
    setCount((c) => c + 1);
    setCount((c) => c + 1); // +3: each reads the latest queued value
    setRenders((r) => r + 1);
  };

  const handlePuzzled = () => {
    setCount(count + 1); // 0 + 1
    setCount(count + 1); // 0 + 1
    setCount(count + 1); // 0 + 1
    setCount((c) => c + 1); // prev value + 1
    setCount((c) => c + 1); // prev value + 1 => 3
    setRenders((r) => r + 1);
  };

  const handlePuzzled2 = () => {
    setCount(count + 1); // 0 + 1
    setCount(count + 1); // 0 + 1
    setCount(count + 1); // 0 + 1
    setCount((c) => c + 1); // prev value + 1
    setCount((c) => c + 1); // prev value + 1
    setCount(count + 1); // 0 + 1 => 1
    setRenders((r) => r + 1);
  };

  return (
    <div className="demo-card">
      <h4>3. Batching</h4>
      <p>
        Open the console. Each click calls <code>setCount</code> 3 times but
        only triggers one re-render (one new log line per click).
      </p>
      <div className="demo-actions">
        <button onClick={handleClickDirect}>+1 (direct value)</button>
        <button onClick={handleClickUpdater}>+1 (updater)</button>
        <button onClick={handlePuzzled}>+? (mixed)</button>
        <button onClick={handlePuzzled2}>+? (mixed2)</button>
      </div>
      <p>
        count: {count}, clicks so far: {renders}
      </p>
    </div>
  );
};
