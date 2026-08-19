# `useReducer`

> Source: [react.dev/reference/react/useReducer](https://react.dev/reference/react/useReducer) — verified against React 19 docs.

`useReducer` is `useState` with the update logic pulled out into a single
pure function (the **reducer**) instead of scattered across event handlers.
You dispatch plain objects ("actions") describing *what happened*; the
reducer decides *how state changes* in response.

```tsx
const [state, dispatch] = useReducer(reducer, initialArg, init?);
```

Two live demos: [`TodoReducer.tsx`](./useReducer/TodoReducer.tsx) (the
canonical switch-statement reducer — this is the "implement it live" ask)
and [`LazyInitializer.tsx`](./useReducer/LazyInitializer.tsx) (the 3-argument
form that avoids recomputing initial state — different call shape than
`useState`'s lazy init, worth knowing separately). Everything else below is
conceptual or already covered by another hook's doc/demo.

---

## Signature

```tsx
const [state, dispatch] = useReducer(reducer, initialArg, init?);
```

### Parameters

| Parameter | Description |
|---|---|
| `reducer` | Pure function `(state, action) => nextState`. Computes the next state from the current state and a dispatched action. |
| `initialArg` | The value used to compute initial state. Used directly as the initial state if `init` is not provided. |
| `init` *(optional)* | Initializer function. If provided, initial state = `init(initialArg)` instead of `initialArg` itself. |

### Returns

An array of exactly two values:
1. The current state — `init(initialArg)` or `initialArg` on the first render.
2. The `dispatch` function — call it with an action to trigger the reducer and a re-render. Has a **stable identity**, same as `useState`'s `set` function — safe to omit from `useEffect` deps (already established in [`useState.md`](./useState.md#caveats)).

---

## Writing the reducer

```tsx
function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "added": {
      return { ...state, items: [...state.items, action.item] };
    }
    case "deleted": {
      return { ...state, items: state.items.filter((i) => i.id !== action.id) };
    }
    default: {
      throw new Error(`Unknown action: ${action.type}`);
    }
  }
}
```

- Actions are conventionally objects with a `type` field, but can be any
  shape/type — React doesn't inspect them.
- **State is immutable here too** — same rule as `useState` (see
  [`useState.md`](./useState.md#rules)): never do `state.items.push(x)`, always
  return a new object/array. This is the #1 interview gotcha and is what
  [`TodoReducer.tsx`](./useReducer/TodoReducer.tsx) is built to demonstrate.
- Add a `default: throw new Error(...)` case — it turns a silently-dropped
  unknown action into a loud bug at dispatch time instead of a mysteriously
  `undefined` piece of state.

---

## `useReducer` vs `useState` — when to reach for which

| | `useState` | `useReducer` |
|---|---|---|
| Update logic location | Inline in each event handler | Centralized in one reducer function |
| Best for | Independent, simple values | Related values that update together, or many ways to update the same state |
| Testability | Logic mixed into components | Reducer is a plain function — testable with no React at all |
| Debugging | Have to inspect each `setX` call site | Every state change flows through one function — easy to log every action |

Rule of thumb: if you're writing more than 2–3 `setX` calls together for
related fields, or the "same" update happens from several different
places, a reducer usually reads better. For one or two independent
primitives, `useState` is simpler — don't reach for `useReducer` by
default.

---

## Caveats

- **Same snapshot behavior as `useState`.** `dispatch` doesn't update the
  `state` variable in the currently-running function — it schedules a
  re-render. Reading `state` right after `dispatch` still returns the old
  value. See [`useState.md`](./useState.md#caveats) — identical mechanic.
- **`Object.is` bails out re-renders** if the reducer returns a value equal
  to current state — same rule as `useState`/`useMemo`.
- **React batches dispatches** the same way it batches `set` calls — see
  [`useState/Batching.tsx`](./useState/Batching.tsx), not re-demoed here.
- **Must be called at the top level** — same Hook rule as everywhere else.
- **In Strict Mode (dev only)**, React calls **both** the reducer and the
  `init` initializer **twice** to surface impurities — same mechanic
  already covered for `useEffect`/`useState`. This is exactly why the
  reducer/initializer must stay pure (no side effects like logging or
  mutating outside state inside them).
- **"Too many re-renders"** — dispatching unconditionally during render
  (e.g. `onClick={handleClick()}` instead of `onClick={handleClick}`)
  causes an infinite render→dispatch loop. Same trap, same fix, as
  `useState` — see [`useState.md`](./useState.md#troubleshooting-from-the-docs).

---

## Usage scenarios worth knowing

### 1. The canonical reducer: multiple related actions over one state shape
A todo list is the standard interview example because it forces all three
update patterns at once: adding to an array, updating one item inside an
array, and removing from an array — all immutably. See
[`TodoReducer.tsx`](./useReducer/TodoReducer.tsx).

### 2. Avoiding recreating the initial state (3-argument form)
Same *goal* as `useState`'s lazy initializer (see
[`useState.md`](./useState.md#1-lazy-initialization)) but a different
*shape*: instead of passing a no-arg function as `initialState`, you pass
`init` as the **third** argument and the raw seed value as the second —
`useReducer(reducer, seed, init)` calls `init(seed)` once, on mount only.

```tsx
// ❌ Wasteful — createInitialState(username) runs on every render
useReducer(reducer, createInitialState(username));

// ✅ Efficient — React calls createInitialState(username) once, at mount
useReducer(reducer, username, createInitialState);
```

Pass the **function itself** as `init`, not its result. If `init` doesn't
need an input, pass `null` as `initialArg`. See
[`LazyInitializer.tsx`](./useReducer/LazyInitializer.tsx).

### 3. Immer for reducer ergonomics (conceptual only, not demoed)
Writing `{ ...state, items: [...state.items, x] }` by hand gets noisy for
deeply nested state. The `use-immer` package's `useImmerReducer` lets you
write reducer code that *looks* mutating (`draft.items.push(x)`) while
Immer produces an immutable update behind the scenes. Good to know it
exists and why — not core `react` API, so no demo here; don't reach for an
extra dependency to solve a problem two levels of `{ ...spread }` already
solves.

---

## Troubleshooting (from the docs)

| Symptom | Cause | Fix |
|---|---|---|
| Logged state after `dispatch` is stale | Same per-render snapshot behavior as `useState` | To predict the next value without waiting for re-render, manually call `reducer(state, action)` in a local variable. |
| Screen doesn't update after `dispatch` | Reducer mutated `state` and returned the same reference — `Object.is` sees no change | Always return a new object/array from every branch, never mutate the argument. |
| Part of the state becomes `undefined` after an update | Forgot to spread `...state` in one `case`, dropping the other fields | Always start each case with `{ ...state, ... }` unless intentionally replacing everything. |
| Entire state becomes `undefined` | A `case` doesn't `return` anything, or an action falls through with no matching case | Add `default: throw new Error(...)` so unmatched actions fail loudly instead of returning `undefined`. |
| Reducer/initializer logs/runs twice in dev | Strict Mode double-invoke to catch impurities | Expected if pure. If you see a duplicated side effect (item added twice), you mutated state — fix to return new references. |
