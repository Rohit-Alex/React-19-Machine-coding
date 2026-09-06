import { useRef, useState } from "react";
import { useThrottle } from "./useThrottle";

export const ThrottledScrollTracker = () => {
  const [scrollTop, setScrollTop] = useState(0);
  const throttledScrollTop = useThrottle(scrollTop, 200);
  const rawEventCount = useRef(0);
  const [rawCount, setRawCount] = useState(0);

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    rawEventCount.current += 1;
    setRawCount(rawEventCount.current);
    setScrollTop(event.currentTarget.scrollTop);
  };

  return (
    <div>
      <h3>Throttling a scroll handler</h3>
      <p>
        Scrolling fires <code>onScroll</code> dozens of times a second, but{" "}
        <code>useThrottle(scrollTop, 200)</code> only lets the displayed value
        update at most once every 200ms — no matter how fast events keep
        arriving. Unlike debouncing, it doesn't wait for scrolling to stop.
      </p>
      <div
        onScroll={handleScroll}
        style={{
          height: 120,
          overflowY: "auto",
          border: "1px solid #ccc",
          padding: "0 1rem",
        }}
      >
        <div style={{ height: 800 }}>
          <p>Scroll me. Content is 800px tall in a 120px viewport.</p>
        </div>
      </div>
      <p>Raw scroll events: {rawCount}</p>
      <p>Throttled scrollTop: {Math.round(throttledScrollTop)}px</p>
    </div>
  );
};
