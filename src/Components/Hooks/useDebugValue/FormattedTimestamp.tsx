import { useDebugValue, useEffect, useState } from "react";

function useClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useDebugValue(now, (date) => date.toDateString());

  return now;
}

export const FormattedTimestamp = () => {
  const now = useClock();

  return (
    <div>
      <h3>Deferring formatting with the optional format function</h3>
      <p>
        <code>useClock</code> ticks every second, so calling{" "}
        <code>date.toDateString()</code> on every render would be wasted
        work almost every time. Passing it as{" "}
        <code>useDebugValue(now, date =&gt; date.toDateString())</code>{" "}
        instead means React only runs the formatter when this component is
        actually inspected in DevTools — the raw <code>Date</code> is what
        gets stored, the string is computed on demand.
      </p>
      <p>{now.toLocaleTimeString()}</p>
    </div>
  );
};
