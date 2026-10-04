import { useEffect, useState } from "react";

// 1 = a light, 0 = an empty gap. Same idea as a letter-shape index mapping,
// but laid out as the grid looks, so it's easy to change the shape.
const CONFIG = [
  [1, 1, 1],
  [1, 0, 1],
  [1, 1, 1],
];
const COLUMNS = CONFIG[0].length;
const CELLS = CONFIG.flat();
const LIGHT_COUNT = CELLS.filter(Boolean).length;
const DEACTIVATE_DELAY_MS = 300;

export const GridLights = () => {
  // Cell indexes in the order they were turned on. The order *is* the state:
  // switching off in reverse is just popping from the end, like a stack.
  const [order, setOrder] = useState<number[]>([]);
  const [isDeactivating, setIsDeactivating] = useState(false);

  // Switch one light off every 300ms. Each pop changes `order`, which re-runs
  // this effect and schedules the next one. One timer at a time, and the
  // cleanup clears it on unmount.
  useEffect(() => {
    if (!isDeactivating) return;
    const timeoutId = setTimeout(() => {
      const next = order.slice(0, -1);
      setOrder(next);
      if (next.length === 0) setIsDeactivating(false);
    }, DEACTIVATE_DELAY_MS);
    return () => clearTimeout(timeoutId);
  }, [isDeactivating, order]);

  const activate = (index: number) => {
    // Ignore clicks while switching off, and on lights already on.
    if (isDeactivating || order.includes(index)) return;
    const next = [...order, index];
    setOrder(next);
    // Check the *new* list, not the old state.
    if (next.length === LIGHT_COUNT) setIsDeactivating(true);
  };

  return (
    <div className="demo-card">
      <h4>Grid lights</h4>
      <p>
        Click every light. Once all are on, they switch off one by one in the
        reverse order you clicked them.
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${COLUMNS}, 56px)`,
          gap: 12,
          padding: 12,
          border: "1px solid",
          width: "fit-content",
        }}
      >
        {CELLS.map((isLight, index) => {
          // Keep an empty div for a gap so the grid keeps its shape.
          if (!isLight) return <div key={index} />;
          const isOn = order.includes(index);
          return (
            <button
              key={index}
              type="button"
              aria-label={`Light ${index + 1}`}
              aria-pressed={isOn}
              onClick={() => activate(index)}
              style={{
                width: 56,
                height: 56,
                border: "1px solid",
                borderRadius: 0,
                background: isOn ? "#2f7d1f" : "transparent",
                cursor: isDeactivating || isOn ? "default" : "pointer",
              }}
            />
          );
        })}
      </div>
      <p aria-live="polite">
        {isDeactivating
          ? "Switching off…"
          : `${order.length} of ${LIGHT_COUNT} on`}
      </p>
    </div>
  );
};
