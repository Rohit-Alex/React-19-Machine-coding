# `useOptimistic`

Source: https://react.dev/reference/react/useOptimistic — verified against React 19.

`useOptimistic` is a Hook that lets you show a different state while an
async Action is in progress — the "optimistic" state — and have React
automatically switch back to the real state once the Action finishes (or
reverts on error, since the optimistic value is never persisted anywhere).
This page covers two demos: `ToggleLikeButton.tsx` (no reducer, a single
optimistic boolean) and `OptimisticMessageThread.tsx` (a reducer that
appends a pending message to a list, wired into `<form action={...}>`).

## Signature

```ts
const [optimisticState, setOptimisticState] = useOptimistic(state);
// or, with a reducer:
const [optimisticState, setOptimisticState] = useOptimistic(state, updateFn);
```

### Parameters

| Parameter  | Type                                                        | Notes                                                                                                                                                                                                                   |
| ---------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `state`    | any                                                         | The value to return when no Action is pending. This is the "real"/confirmed state.                                                                                                                                      |
| `updateFn` | `(currentState, optimisticValue) => mergedState` (optional) | Pure function called with the current state and whatever was passed to `setOptimisticState`; returns the merged optimistic state. If omitted, `setOptimisticState`'s argument is used directly as the optimistic state. |

### Returns

| Return               | Type            | Notes                                                                                                                                                         |
| -------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `optimisticState`    | same as `state` | Equal to `state`, unless an Action is pending — in which case it's `updateFn(state, optimisticValue)` (or the raw value passed to `set`, with no `updateFn`). |
| `setOptimisticState` | function        | Call during an Action to render an optimistic value; takes any value (typically the "optimistic" delta/payload). Returns nothing.                             |

## How optimistic state works

Optimistic state works by immediately showing a temporary value while an
Action is in progress. When `setOptimisticState` is called inside that
Action, React re-renders right away with the temporary value — before the
`await` in the Action has resolved. Once the Action finishes and the real
`state` is updated to match, the optimistic and real states converge in a
single render; there's no extra step to "clear" the optimistic value:

```js
const [value, setValue] = useState('a');
const [optimistic, setOptimistic] = useOptimistic(value);

startTransition(async () => {
  setOptimistic('b');               // render 'b' immediately
  const newValue = await saveChanges('b');
  setValue(newValue);               // real state catches up; optimistic converges
});
```

### How the final state is determined

The `state` argument passed into `useOptimistic` determines what displays
once the Action finishes — and how depends on which pattern is used:

- **A hardcoded value**, e.g. `useOptimistic(false)`: after the Action,
  `optimisticState` falls back to `false` again. Useful for pending states
  that always start from the same baseline.
- **Props or state passed in**, e.g. `useOptimistic(isLiked)`: if the
  parent updates `isLiked` while the Action is running, that new value is
  what's shown once the Action completes — this is how the UI ends up
  reflecting the real result of the Action, not just what was optimistically
  guessed.
- **The reducer pattern**, e.g. `useOptimistic(items, updateFn)`: if `items`
  itself changes while the Action is still pending, React re-runs `updateFn`
  against the new `items` to recompute the optimistic state — so an
  optimistic addition stays layered on top of the latest real data instead
  of a stale snapshot from when the Action started.

## Rules & caveats

- `setOptimisticState` **must be called from inside a Transition or an Action** — wrap it in `startTransition(...)`, or call it directly inside a function passed as `<form action={...}>` (or dispatched from another Action). Calling it from a plain event handler, outside a transition, triggers a React warning ("An optimistic state update occurred outside a Transition or Action") and the optimistic state briefly renders, then immediately reverts.
- Calling `setOptimisticState` **during render** throws "Cannot update optimistic state while rendering" — it's only valid inside event handlers, effects, or Action callbacks like `startTransition`.
- `optimisticState` only ever reflects the pending update while an Action is in flight; once the Action settles, React falls back to `state`. This means the "real" state (e.g. `isLiked`/`messages` in the demos) must eventually be updated to match — `useOptimistic` never persists anything on its own.
- Prefer relative updates (`setOptimisticState(current => current + 1)`) over passing an absolute value when the surrounding `state` might change while the Action is pending — an absolute value can render stale data if `state` updates concurrently. (Confirmed via the `QuantityStepper` example on the `useActionState` reference page: `setOptimisticValue(c => c + 1)`.)
- You can detect "is this optimistic update still pending" by comparing `state !== optimisticState`, instead of tracking a separate `isPending` flag from `useTransition`.

## Usage scenarios

### `ToggleLikeButton.tsx` — no-reducer optimistic boolean

`useOptimistic(isLiked)` with no `updateFn` — `setOptimisticIsLiked` is
called with the new boolean directly, inside `startTransition`. Once
`toggleLikeOnServer` resolves, a nested `startTransition` commits the real
`isLiked` state, and `optimisticIsLiked` falls back to it.

### `OptimisticMessageThread.tsx` — reducer + form action

`useOptimistic(messages, updateFn)` where `updateFn` appends
`{ text, sending: true }` to whatever the current list is (not a frozen
snapshot) — so it stays correct if `messages` changes while the Action is
pending. `addOptimisticMessage` is called directly inside `formAction`,
which is already an Action because it's passed to
`<form action={formAction}>`; no extra `startTransition` wrapper is needed.

## `useOptimistic` vs. manual "fake state + rollback on error"

| Concern                          | Manual `useState` + rollback                                                  | `useOptimistic`                                                                   |
| -------------------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Showing a pending value          | Set fake state yourself, remember to revert it on error/success               | `optimisticState` automatically falls back to `state` once the Action settles     |
| Concurrent state changes         | Easy to show stale data if `state` changes mid-flight unless handled manually | Updater form (`updateFn`) merges relative to current state automatically          |
| Risk of a stuck optimistic value | A missed rollback path leaves the fake state showing forever                  | Optimistic state can never outlive the Action — no persistence, no manual cleanup |
| Wiring into `<form action>`      | Requires manual `preventDefault`/`FormData` handling                          | Works directly inside the function passed to `<form action={...}>`                |
