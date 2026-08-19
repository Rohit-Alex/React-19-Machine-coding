import { useRef, useState } from "react";

let naiveConstructions = 0;
let lazyConstructions = 0;

class ExpensiveThing {
  constructor(onConstruct: () => void) {
    onConstruct();
  }
}

/**
 * Scenario 3: useRef(expensive()) re-evaluates the expression every
 * render (result discarded except on the first). Guard with an
 * `if (ref.current === null)` check to only construct once.
 */
export const LazyInit = () => {
  const [, forceRender] = useState(0);

  // 🚩 naive: `new ExpensiveThing()` runs on every render
  useRef(new ExpensiveThing(() => naiveConstructions++));

  // ✅ lazy: constructor only ever runs once
  const lazyRef = useRef<ExpensiveThing | null>(null);
  if (lazyRef.current === null) {
    lazyRef.current = new ExpensiveThing(() => lazyConstructions++);
  }

  return (
    <div className="demo-card">
      <h4>3. Avoiding recreating ref contents</h4>
      <p>
        Re-render this component and watch the counts: the naive pattern's
        constructor count climbs with every render, the guarded pattern
        stays at 1.
      </p>
      <div className="demo-actions">
        <button onClick={() => forceRender((n) => n + 1)}>re-render</button>
      </div>
      <p>naive constructions: {naiveConstructions}</p>
      <p>lazy-init constructions: {lazyConstructions}</p>
    </div>
  );
};
