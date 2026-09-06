import { useState } from "react";
import { useThrottleCallback } from "./useThrottleCallback";

export const ThrottledClickCounter = () => {
  const [clickCount, setClickCount] = useState(0);
  const [runCount, setRunCount] = useState(0);

  const registerClick = useThrottleCallback(
    () => setRunCount((count) => count + 1),
    1000,
  );

  const handleClick = () => {
    setClickCount((count) => count + 1);
    registerClick();
  };

  return (
    <div>
      <h3>Throttling a callback</h3>
      <p>
        Click as fast as you can: <code>useThrottleCallback</code> runs the
        callback immediately on the first click, then at most once every
        1000ms no matter how many more clicks land in between. The last click
        in a burst still gets a run at the end of the window — that's what
        separates throttling from debouncing, which would wait for you to
        stop clicking entirely.
      </p>
      <button onClick={handleClick}>Click me</button>
      <p>Clicks: {clickCount}</p>
      <p>Callback actually ran: {runCount} time(s)</p>
    </div>
  );
};
