import { useSyncExternalStore } from "react";

const subscribe = (callback: () => void) => {
  window.addEventListener("resize", callback);
  return () => window.removeEventListener("resize", callback);
};

/**
 * Scenario 1: window.innerWidth lives entirely outside React — there's no
 * setState call anywhere that changes it, only the browser's own resize
 * event. useSyncExternalStore is what lets a component read that value and
 * re-render exactly when it changes, without polling or a useEffect that
 * manually calls setState on every resize.
 */
export const WindowWidth = () => {
  const width = useSyncExternalStore(subscribe, () => window.innerWidth);

  return (
    <div className="demo-card">
      <h4>1. Subscribing to a browser API (window.innerWidth)</h4>
      <p>
        Resize the browser window — this number tracks{" "}
        <code>window.innerWidth</code> live. Nothing here calls{" "}
        <code>setState</code>; React is subscribed to the browser's own{" "}
        <code>resize</code> event via <code>subscribe</code>, and reads the
        current value via <code>getSnapshot</code>.
      </p>
      <p style={{ fontSize: 24, fontWeight: 600 }}>{width}px</p>
    </div>
  );
};
