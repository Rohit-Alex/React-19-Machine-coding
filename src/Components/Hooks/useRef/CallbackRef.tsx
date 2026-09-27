import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Scenario 4: a node that shows up LATER than its parent.
 * useRef + useEffect([]) checks once, at parent mount, finds null, and
 * never looks again. A callback ref runs whenever the node itself attaches.
 */
export const CallbackRef = () => {
  const [showEffectInput, setShowEffectInput] = useState(false);
  const [showCallbackInput, setShowCallbackInput] = useState(false);
  const [typed, setTyped] = useState("");

  // 🚩 effect runs once, when the input isn't rendered yet → current is null
  const effectRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    effectRef.current?.focus();
  }, []);

  // ✅ React calls this with the node the moment it is attached.
  // useCallback keeps the same function across renders; an inline arrow
  // would be a new ref each render → cleanup + re-run → re-focus on every keystroke.
  const focusOnAttach = useCallback((node: HTMLInputElement | null) => {
    node?.focus();
  }, []);

  return (
    <div className="demo-card">
      <h4>4. Callback ref for a node that appears later</h4>
      <p>
        Show each input. The <code>useEffect</code> one stays unfocused — the
        effect already ran when there was no input. The callback-ref one focuses
        itself, because React calls the callback when the node attaches.
      </p>
      <div className="demo-actions">
        <button onClick={() => setShowEffectInput((s) => !s)}>
          toggle useEffect input
        </button>
        {showEffectInput && (
          <input ref={effectRef} placeholder="useRef + useEffect([])" />
        )}
      </div>
      <div className="demo-actions">
        <button onClick={() => setShowCallbackInput((s) => !s)}>
          toggle callback-ref input
        </button>
        {showCallbackInput && (
          <input
            ref={focusOnAttach}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="callback ref"
          />
        )}
      </div>
    </div>
  );
};
