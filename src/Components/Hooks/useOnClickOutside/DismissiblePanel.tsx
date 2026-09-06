import { useCallback, useRef, useState } from "react";
import { useOnClickOutside } from "./useOnClickOutside";

export const DismissiblePanel = () => {
  const [open, setOpen] = useState(true);
  const panelRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);

  useOnClickOutside(panelRef, close);

  return (
    <div>
      <h3>Closing a panel on outside click</h3>
      <p>
        <code>useOnClickOutside(panelRef, close)</code> attaches a document-wide{" "}
        <code>pointerdown</code> listener and calls <code>close</code> only
        when the click lands outside the element <code>panelRef</code> points
        to. Clicking inside the box below does nothing; clicking anywhere
        else dismisses it.
      </p>
      {!open && (
        <button type="button" onClick={() => setOpen(true)}>
          Reopen panel
        </button>
      )}
      {open && (
        <div
          ref={panelRef}
          style={{ border: "1px solid #ccc", padding: "1rem", maxWidth: 260 }}
        >
          <p>Click inside me and I stay open.</p>
          <p>Click anywhere outside and I close.</p>
        </div>
      )}
    </div>
  );
};
