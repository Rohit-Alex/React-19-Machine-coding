# `useState`

> Source: [react.dev/reference/react/useState](https://react.dev/reference/react/useState) — verified against React 19 docs.

`useState` is a React Hook that lets you add a **state variable** to your
component. Calling its `set` function schedules a re-render with the new
value — it never mutates the variable you already have in scope.

```tsx
const [state, setState] = useState(initialState);
```

Working examples for the genuinely new/tricky scenarios live in
[`useState/`](./useState). The functional-updater form is **not** re-demoed
here — see [`useCallback/UpdaterFunction.tsx`](./useCallback/UpdaterFunction.tsx),
it's the exact same mechanic.

---

## Signature

```tsx
const [state, setState] = useState(initialState);
```

### Parameters

| Parameter | Description |
|---|---|
| `initialState` | The value state starts as. Ignored after the first render. **Special case:** if you pass a *function*, React treats it as an **initializer function** — called once with no arguments during initialization, and its return value becomes the initial state. |

### Returns

An array of exactly two values:
1. The current state — matches `initialState` on the first render.
2. The `set` function, which updates the state and triggers a re-render.

---

## The `set` function

```tsx
setState(nextState);       // direct value
setState(prev => prev + 1); // updater function
```

| Parameter | Description |
|---|---|
| `nextState` | The value to set. **Special case:** if you pass a *function*, React treats it as an **updater function** — it receives the pending state and must return the next state. React queues updaters and applies them in order during the next render. |

No return value.

---

## Rules

- **Top-level only.** Same as every Hook — call it only at the top level of a component or custom Hook, never in loops/conditions/nested functions.
- **`initialState`/updater functions must be pure.** No side effects, no mutating arguments.
- **State is immutable — replace, don't mutate.** For objects/arrays, always construct a new reference (`{...obj}`, `[...arr]`, `.map()`/`.filter()`) rather than assigning into the existing one. This is the single most common interview gotcha for this hook. See [`ImmutableUpdate.tsx`](./useState/ImmutableUpdate.tsx).

---

## Caveats

- **`setState` doesn't change the variable in the code that's already running** — it only affects what `useState` returns starting from the *next* render. State behaves like a snapshot of one render, not a live mutable box:
  ```tsx
  function handleClick() {
    console.log(count);  // 0
    setCount(count + 1);
    console.log(count);  // still 0
  }
  ```
  If you need the next value immediately in the same function, compute it into a local variable first (`const next = count + 1`) and use `next`, not `count`.
- **`Object.is` bails out re-renders.** If the new value is `Object.is`-equal to the current state, React skips re-rendering that component and its children entirely. (Same rule as `useMemo`/`useCallback` dependency comparisons — see [`useMemo.md`](./useMemo.md#rules).) This is *why* mutating an object in place and calling `setObj(obj)` silently does nothing: it's still the same reference.
- **React batches updates.** Multiple `set` calls inside one event handler are collapsed into a single re-render, applied after the handler finishes — not one re-render per call. See [`Batching.tsx`](./useState/Batching.tsx).
- **The `set` function has a stable identity** across re-renders, same as a `useCallback`-wrapped function — safe to omit from `useEffect` dependency arrays.
- **Calling `set` during render itself** is allowed only for the *currently rendering* component, and only inside a condition that actually changes the value (otherwise: infinite render loop → "Too many re-renders"). This is how you derive/store information from a previous render without an Effect — rare, but a known pattern. Conceptual only, no dedicated demo:
  ```tsx
  function CountLabel({ count }: { count: number }) {
    const [prevCount, setPrevCount] = useState(count);
    const [trend, setTrend] = useState<"up" | "down" | null>(null);
    if (prevCount !== count) {
      setPrevCount(count);
      setTrend(count > prevCount ? "up" : "down");
    }
    return <h1>{count} ({trend})</h1>;
  }
  ```
  Prefer deriving the value during render (no state at all) or resetting via `key` first — reach for this only when neither works.
- **In Strict Mode (dev only)**, React calls your initializer and updater functions **twice** to surface impurities, then discards one result. No effect in production.

---

## Usage scenarios worth knowing

### 1. Lazy initialization
Pass the initializer **function itself**, not its result — `useState(createInitialTodos)`, not `useState(createInitialTodos())`. The former only ever runs once, at mount; the latter re-runs on *every* render (its result is just thrown away on renders 2+), wasteful if the computation is non-trivial. See [`LazyInit.tsx`](./useState/LazyInit.tsx).

### 2. Immutable updates to objects/arrays
State is read-only — mutating and passing back the same reference is a no-op (`Object.is` bails out) and, worse, corrupts state that other closures may still be reading. Always build a new object/array. See [`ImmutableUpdate.tsx`](./useState/ImmutableUpdate.tsx).

### 3. Updating from previous state (functional updater)
Needed whenever you call `set` more than once for the same value inside one handler, or when the next value genuinely depends on the latest state rather than the value captured in the closure. Already demoed for `useCallback` — see [`useCallback/UpdaterFunction.tsx`](./useCallback/UpdaterFunction.tsx); the mechanic is identical here, just without the `useCallback` wrapper.

### 4. Batching
Several `set` calls in the same event handler produce **one** re-render, not one per call — React applies them all before committing. Easy to get wrong when reasoning about how many times a component "renders" per click. See [`Batching.tsx`](./useState/Batching.tsx).

### 5. Resetting state with `key`
Give a component a different `key` and React unmounts the old instance and mounts a fresh one — every `useState` in it (and its subtree) restarts from `initialState`. This is the idiomatic way to reset a form/child tree, cheaper and simpler than manually resetting every field. See [`ResetWithKey.tsx`](./useState/ResetWithKey.tsx).

---

## Troubleshooting (from the docs)

| Symptom | Cause | Fix |
|---|---|---|
| Logged value is stale right after calling `set` | State is a per-render snapshot, not a mutable variable | Store the next value in a local variable if you need it immediately: `const next = count + 1; setCount(next); console.log(next)`. |
| Screen doesn't update after calling `set` | New value is `Object.is`-equal to current state — usually from mutating an object/array in place before passing it back | Always construct a new reference: `setObj({ ...obj, x: 10 })`, never `obj.x = 10; setObj(obj)`. |
| `Too many re-renders` error | State is being set **unconditionally during render** — often from calling a handler (`onClick={handleClick()}`) instead of passing it (`onClick={handleClick}`) | Pass the function reference, don't invoke it. If setting state during render intentionally, gate it behind a condition that becomes false after the update. |
| Initializer/updater function runs twice | Strict Mode dev-only double-invoke to catch impurities | Expected in dev if pure; if you see duplicated side effects (e.g. an item added twice), you mutated state instead of replacing it. |
| `setFn(someOtherFunction)` calls the function instead of storing it | Passing a function to `useState`'s initial value or to `set` is interpreted as an initializer/updater, not a value to store | Wrap in an arrow function: `useState(() => someFunction)`, `setFn(() => someOtherFunction)`. |
