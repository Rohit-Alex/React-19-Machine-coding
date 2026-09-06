import { useRef, useState } from "react";
import { useEventListener } from "./useEventListener";

export const HoverTracker = () => {
  const boxRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(
    null,
  );

  useEventListener(
    "mousemove",
    (event) => {
      const rect = boxRef.current?.getBoundingClientRect();
      if (!rect) return;
      setPosition({
        x: Math.round(event.clientX - rect.left),
        y: Math.round(event.clientY - rect.top),
      });
    },
    boxRef,
  );

  return (
    <div>
      <h3>Listening on a specific element</h3>
      <p>
        Passing a ref as the target scopes the listener to that element
        instead of <code>window</code>. Move your mouse over the box below.
      </p>
      <div
        ref={boxRef}
        style={{
          height: 100,
          border: "1px solid #ccc",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {position ? `x: ${position.x}, y: ${position.y}` : "Hover over me"}
      </div>
    </div>
  );
};
