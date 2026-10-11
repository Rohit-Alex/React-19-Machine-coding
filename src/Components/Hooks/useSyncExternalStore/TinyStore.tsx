import { useSyncExternalStore } from "react";

/**
 * A minimal hand-rolled store — the same shape any third-party store
 * (Redux, Zustand, a WebSocket-fed cache) has: state that lives outside
 * React, a way to mutate it, and a subscriber list to notify on change.
 * This is what useSyncExternalStore is *for* — bridging state React
 * doesn't own into a component's render.
 */
let listeners: Array<() => void> = [];

const userStore = {
  count: 1,
  increment() {
    this.count++;
    for (const listener of listeners) {
      listener();
    }
  },
  getCount() {
    return this.count;
  },
};

const subscribe = (cb: () => void) => {
  listeners = [...listeners, cb];

  return () => {
    listeners = listeners.filter((listener) => listener !== cb);
  };
};

/**
 * Two independent components, no shared parent state, no Context provider
 * — each just subscribes to the same module-level store directly.
 */
function CounterReaderA() {
  const count = useSyncExternalStore(subscribe, () => userStore.getCount());
  return (
    <section>
      <h4>Reader A</h4>
      <div style={{ display: "inline-flex", gap: 4 }}>
        <strong>Count</strong>
        {"  "}
        <em>{count1}</em>
      </div>
      <div>
        <button onClick={() => userStore.increment()}>Increment Count</button>
      </div>
    </section>
  )
}

function CounterReaderB() {
  const count = useSyncExternalStore(subscribe, () => userStore.getCount());
  return (
      <section>
        <h4>Reader B</h4>
        <div style={{ display: "inline-flex", gap: 4 }}>
          <strong>Count</strong>
          {"  "}
          <em>{count1}</em>
        </div>
        <div>
          <button onClick={() => userStore.increment()}>Increment Count</button>
        </div>
      </section>
  )
}

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
