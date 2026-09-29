import { useState } from "react";
import { useClickOrHold } from "./useClickOrHold";

export const ClickOrHoldButton = () => {
  const [log, setLog] = useState<string[]>([]);
  const add = (entry: string) => setLog((l) => [entry, ...l].slice(0, 5));

  const pressProps = useClickOrHold({
    onClick: () => add("click"),
    onHold: () => add("hold (500ms)"),
  });

  return (
    <div className="demo-card">
      <h4>Click vs hold</h4>
      <p>
        Tap or click for a click; keep it pressed for half a second for a hold.
        Press, drag off the button, then release: nothing. Tab to it and press
        Enter: a click.
      </p>
      <div className="demo-actions">
        <button
          {...pressProps}
          // iOS shows its own callout on long press, and text gets selected.
          style={{ WebkitTouchCallout: "none", userSelect: "none" }}
        >
          Press me
        </button>
      </div>
      <ol reversed>
        {log.map((entry, i) => (
          <li key={log.length - i}>{entry}</li>
        ))}
      </ol>
    </div>
  );
};
