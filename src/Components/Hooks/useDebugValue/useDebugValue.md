# useDebugValue

Source: https://react.dev/reference/react/useDebugValue (verified against React 19)

`useDebugValue` lets you add a label to a **custom Hook** in React DevTools.
It has no effect on what your app renders — the only place you'll ever see
its output is the "hooks" list in the DevTools Components panel when you
select a component that calls the custom Hook. This page covers both demos:
`OnlineStatusIndicator.tsx` (labeling a hook's value directly) and
`FormattedTimestamp.tsx` (deferring an expensive format with the optional
second argument).

## Signature

```ts
useDebugValue(value, format?)
```

### Parameters

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `value` | any | Yes | The value you want to display in React DevTools, read from your custom Hook. |
| `format` | `(value) => any` | No | A formatting function. React calls `format(value)` only when the component is actually inspected in DevTools, then displays the returned value instead of `value` itself. |

### Returns

`useDebugValue` returns `undefined`.

## Rules & caveats

- **Only call it at the top level of a custom Hook.** Don't call it inside a
  regular component, and don't call it conditionally or inside loops — same
  rules as every other Hook.
- **It changes nothing at runtime.** No re-render is triggered, no value is
  passed to your component tree — it's purely metadata for the DevTools
  extension.
- **Use it judiciously.** Most custom Hooks don't need it. It's most useful
  for Hooks that are part of a **shared library** (so consumers get a
  meaningful label instead of a generic one) or that hold **complex internal
  state** that's otherwise hard to make sense of from the DevTools panel.
  Sprinkling it into every custom Hook in an app just adds noise.
- **Prefer the `format` argument for expensive values.** If computing a
  display string is costly (formatting a `Date`, serializing an object),
  pass a formatter function as the second argument instead of formatting
  inline. React defers calling it until the component is actually inspected,
  so it doesn't run on every render — only when someone opens DevTools and
  looks.
- **No effect without React DevTools installed.** If the browser extension
  isn't installed, `useDebugValue` is a no-op you'll never see evidence of.

## Usage scenarios

### 1. `OnlineStatusIndicator.tsx` — labeling a hook's value

A custom `useOnlineStatus` Hook wraps `useSyncExternalStore` to track
`navigator.onLine`, then calls
`useDebugValue(isOnline ? "Online" : "Offline")`. Without this call, DevTools
would show this Hook's row as an unlabeled `SyncExternalStore` entry with a
raw boolean; with it, the row is labeled `OnlineStatus: "Online"` (or
`"Offline"`), which is exactly the docs' canonical example for this Hook.
The rendered UI (an emoji + status text) is identical either way — the only
difference is what you see when inspecting the component's hooks in
DevTools.

### 2. `FormattedTimestamp.tsx` — deferring formatting

A custom `useClock` Hook holds a `Date` in state, updated every second via
`setInterval`. Calling `useDebugValue(now, date => date.toDateString())`
means the (comparatively expensive) `toDateString()` call only runs when
DevTools is open and this component is selected — not once per second on
every tick. The raw `Date` object is what's actually stored in the debug
value; the formatter only runs on demand.

## Comparison: `useDebugValue` vs. other debugging approaches

| Approach | Visible in | Runs on every render? | Best for |
| --- | --- | --- | --- |
| `useDebugValue` | React DevTools Components panel only | No — formatter runs only when inspected | Shared-library custom Hooks, Hooks with non-obvious internal state |
| `console.log` | Browser console | Yes, every time it's reached | One-off debugging, tracing renders/effects |
| React DevTools Profiler | React DevTools Profiler tab | N/A (records render timings, not values) | Diagnosing *why* something re-rendered, not *what* a Hook's value is |
| Naming state variables clearly | DevTools Components panel (built-in) | N/A | Simple Hooks where the state shape is already self-explanatory |
