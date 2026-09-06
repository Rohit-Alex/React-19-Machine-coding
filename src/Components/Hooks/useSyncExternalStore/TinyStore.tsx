import { useSyncExternalStore } from "react";

/**
 * A minimal hand-rolled store — the same shape any third-party store
 * (Redux, Zustand, a WebSocket-fed cache) has: state that lives outside
 * React, a way to mutate it, and a subscriber list to notify on change.
 * This is what useSyncExternalStore is *for* — bridging state React
 * doesn't own into a component's render.
 */
let count = 0;
let listeners: Array<() => void> = [];

const counterStore = {
  increment() {
    count += 1;
    for (const listener of listeners) listener();
  },
  subscribe(listener: () => void) {
    listeners = [...listeners, listener];
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  },
  getSnapshot() {
    return count;
  },
};

function useCount() {
  return useSyncExternalStore(
    counterStore.subscribe,
    counterStore.getSnapshot,
  );
}

/**
 * Two independent components, no shared parent state, no Context provider
 * — each just subscribes to the same module-level store directly.
 */
function CounterReaderA() {
  const count = useCount();
  return <p>Reader A sees: {count}</p>;
}

function CounterReaderB() {
  const count = useCount();
  return <p>Reader B sees: {count}</p>;
}

/**
 * Scenario 2: a store outside React, read from two unrelated components.
 * Click either button — both readers update in lockstep, because they're
 * both subscribed to the same external source of truth rather than each
 * holding their own copy in useState.
 */
export const TinyStore = () => {
  return (
    <div className="demo-card">
      <h4>2. One external store, several independent subscribers</h4>
      <p>
        <code>counterStore</code> is a plain module-level object — not
        <code> useState</code>, not Context. Both readers below subscribe to
        it independently and re-render together on every change.
      </p>
      <div className="demo-actions">
        <button onClick={() => counterStore.increment()}>
          increment from here
        </button>
      </div>
      <CounterReaderA />
      <CounterReaderB />
    </div>
  );
};
