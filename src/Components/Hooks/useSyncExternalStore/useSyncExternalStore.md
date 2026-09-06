# `useSyncExternalStore`

> Source: [react.dev/reference/react/useSyncExternalStore](https://react.dev/reference/react/useSyncExternalStore) — verified against React 19 docs.

`useSyncExternalStore` reads and subscribes to state that lives **outside**
React — a browser API (`window.innerWidth`, `navigator.onLine`), a
third-party store (Redux, Zustand), a WebSocket-fed cache, anything that
can change without going through a React `setState` call. The problem it
solves specifically: if you subscribe to an external store with a plain
`useEffect` + `useState`, concurrent rendering can read the store at two
different points in time during a single render pass and show different
parts of the UI two different values for what should be one snapshot —
"tearing." `useSyncExternalStore` guarantees every consumer sees the same
snapshot within a render, even under concurrent features like
`useTransition`.

```tsx
const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot?);
```

Two live demos: [`WindowWidth.tsx`](./useSyncExternalStore/WindowWidth.tsx)
(subscribing to a real browser API, with `getServerSnapshot`) and
[`TinyStore.tsx`](./useSyncExternalStore/TinyStore.tsx) (a hand-rolled
external store read by two unrelated components, staying in sync without
Context or prop drilling). Everything else below is conceptual.

---

## Signature

```tsx
const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot?);
```

### Parameters

| Parameter                        | Description                                                                                                                                                                                                                                                                                                                             |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `subscribe`                      | A function that takes a single callback and registers it with the store, returning an unsubscribe function. You do not pass this callback yourself—React creates an internal onStoreChange callback and passes it to subscribe. Your store should call that callback whenever its state changes so React knows to re-read the snapshot. |
| `getSnapshot`                    | A function with no arguments that returns the store's **current** value. Must return the exact same reference if nothing has changed — see the caveat below.                                                                                                                                                                            |
| `getServerSnapshot` _(optional)_ | A function returning the snapshot to use for server rendering and for client hydration's first render. Omitting it while server-rendering throws.                                                                                                                                                                                       |

### Returns

The current snapshot of the store — whatever `getSnapshot` returns. React
re-renders the component whenever the snapshot changes (identified by
`Object.is` on successive calls).

---

## Rules / caveats

- **Top-level only** — same Hook rule as everywhere else.
- **`getSnapshot` must return a cached, stable reference when nothing has
  changed.** Returning a fresh object/array literal on every call (`return
{ todos: store.todos }`) means every call looks "different" by
  `Object.is`, and React detects this and throws to avoid an infinite
  re-render loop. Either return the store's own immutable data directly,
  or memoize the derived value yourself.
- **`subscribe` should be a stable function reference.** Define it outside
  the component (as in both demos here) or wrap it in `useCallback` if it
  needs to close over props — otherwise React sees a "new" `subscribe` on
  every render and needlessly unsubscribes/resubscribes.
- **Omitting `getServerSnapshot` breaks server rendering** — the component
  throws if rendered on the server without one. If the value genuinely
  doesn't exist on the server (`window.innerWidth`), return a reasonable
  placeholder rather than throwing yourself.
- **Existing React state (`useState`/`useReducer`) doesn't need this at
  all.** Reach for `useSyncExternalStore` specifically when the state's
  source of truth is _not_ React — if you're tempted to use it for state
  your own component owns and sets via `setState`, that's a sign to just
  use `useState`.
- **This is what most state-management libraries use under the hood** to
  make `useStore()`-style hooks safe under concurrent rendering — you're
  unlikely to hand-roll a full store often, but recognizing the shape (and
  why plain `useEffect` + `useState` subscriptions can tear) is the
  interview-relevant part.

---

## Usage scenarios worth knowing

### 1. Subscribing to a browser API

`window`, `navigator`, and friends change outside any React render cycle.
`subscribe` wires up the native event listener; `getSnapshot` reads the
current value; wrap both in a custom hook (`useWindowWidth`,
`useOnlineStatus`) so consuming components don't see the plumbing. See
[`WindowWidth.tsx`](./useSyncExternalStore/WindowWidth.tsx).

### 2. Reading a store shared across unrelated components

When two components need the same externally-owned state and aren't in a
parent/child relationship that makes prop drilling natural, subscribing
each one directly to the store (rather than routing the value through
Context) keeps them in sync with no coordination code. See
[`TinyStore.tsx`](./useSyncExternalStore/TinyStore.tsx).

### 3. Avoiding tearing under concurrent rendering (conceptual)

Picture a transition that re-renders a large tree while an external store
changes mid-render. A naive `useEffect`-based subscription can let some
already-rendered components keep their old value while others further down
pick up the new one in the same commit — visibly inconsistent UI for one
frame. `useSyncExternalStore` forces a synchronous re-check of the
snapshot before commit so every subscriber in that render agrees. Not
demoed live here since reliably reproducing tearing needs a large tree and
a race that's timing-dependent — the mechanism is the interview-relevant
part, not watching it happen.

---

## `useSyncExternalStore` vs. `useEffect` + `useState`

|                                              | `useEffect` + `useState` subscription        | `useSyncExternalStore`                           |
| -------------------------------------------- | -------------------------------------------- | ------------------------------------------------ |
| Safe under concurrent rendering (no tearing) | No                                           | Yes                                              |
| Works during server rendering                | No — effects don't run on the server         | Yes, via `getServerSnapshot`                     |
| Boilerplate                                  | Manual subscribe/unsubscribe/setState wiring | Same wiring, but React owns the re-render timing |
| When to use                                  | State React itself owns                      | State an external source owns                    |
