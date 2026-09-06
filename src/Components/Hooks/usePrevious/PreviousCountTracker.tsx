import { useState } from "react";
import { usePrevious } from "./usePrevious";

export const PreviousCountTracker = () => {
  const [count, setCount] = useState(0);
  const previousCount = usePrevious(count);

  return (
    <div>
      <h3>Tracking a value's previous render</h3>
      <p>
        <code>usePrevious(count)</code> returns whatever <code>count</code>{" "}
        was during the <em>previous</em> render — it lags one render behind
        on purpose. On the very first render there is no previous value, so
        it starts out as <code>undefined</code>.
      </p>
      <p>Current count: {count}</p>
      <p>Previous count: {previousCount === undefined ? "undefined" : previousCount}</p>
      <button type="button" onClick={() => setCount((c) => c + 1)}>
        Increment
      </button>
      <button type="button" onClick={() => setCount((c) => c - 1)}>
        Decrement
      </button>
    </div>
  );
};
