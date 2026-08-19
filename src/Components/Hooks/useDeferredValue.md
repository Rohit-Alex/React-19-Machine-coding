# `useDeferredValue`

> Source: [react.dev/reference/react/useDeferredValue](https://react.dev/reference/react/useDeferredValue) — verified against React 19 docs.

`useDeferredValue` gives you a lagging copy of a value: on an update, React
first re-renders with the **old** deferred value (keeping urgent UI like
typing responsive), then re-renders again in the background with the new
value once it's ready. It solves the same "don't let this slow thing block
the fast thing" problem as `useTransition`, but you hand it a **value**,
not a `set` call — use it when you don't own the setter (e.g. the value
arrives as a prop, or from a hook you don't control).

```tsx
const deferredValue = useDeferredValue(value, initialValue?);
```

Two live demos: [`DeferredInput.tsx`](./useDeferredValue/DeferredInput.tsx)
(the responsive-input-over-a-slow-list pattern — and the single biggest
gotcha: it does nothing without `memo`) and
[`StaleIndicator.tsx`](./useDeferredValue/StaleIndicator.tsx) (visually
flagging that what's on screen is behind what was typed). Everything else
below is conceptual.

---

## Signature

```tsx
const deferredValue = useDeferredValue(value, initialValue?);
```

### Parameters

| Parameter | Description |
|---|---|
| `value` | The value to defer. Any type, but should be a primitive or a stable object created **outside** render — a fresh object literal every render always looks "different," defeating the point. |
| `initialValue` *(optional)* | Value to return on the **initial** render only. Without it, the first render isn't deferred at all (there's no prior value to lag behind) — `value` is returned immediately. |

### Returns

- **First render:** `initialValue` if given, else `value` itself.
- **On updates:** React first re-renders with the **previous** deferred
  value (stale, but fast), then attempts a background re-render with the
  new `value`. Once that background render completes, the deferred value
  "catches up" and a fresh render is committed.

---

## Rules / caveats

- **Top-level only** — same Hook rule as everywhere else.
- **Inside an active Transition, this is a no-op** — `useDeferredValue`
  always returns the new value immediately, because the surrounding
  Transition is already deferring the update; there's nothing left to lag.
- **The background re-render is interruptible.** A new `value` change
  before the background render finishes abandons it and restarts — rapid
  typing means the slow child only ever catches up once typing pauses.
- **Doesn't reduce network requests by itself.** If a data-fetching child
  reads `deferredValue`, the request still fires per keystroke (its
  timing just doesn't block the input) — pair with actual request-level
  debouncing/caching if that's the goal, don't expect this hook to do it.
- **The single biggest gotcha: memoize the consumer.** During the render
  where `value` changed but `deferredValue` hasn't caught up yet, the
  deferred value's *props* are unchanged — but only a `memo`-wrapped
  consumer will actually skip re-rendering because of that. An unwrapped
  component re-renders anyway and the deferral buys nothing. See
  [`DeferredInput.tsx`](./useDeferredValue/DeferredInput.tsx).

---

## Usage scenarios worth knowing

### 1. Keeping an input responsive while a slow child lags behind
Give the input its raw, synchronous `value`; pass a `memo`-wrapped slow
child the `deferredValue` instead. The child renders behind the input by
however long it takes, without ever blocking a keystroke. This is the same
goal as [`useTransition/ResponsiveFilter.tsx`](./useTransition/ResponsiveFilter.tsx)
solved a different way — reach for `useDeferredValue` specifically when
you're deriving from a value you don't own the setter for (a prop, a
value from another hook); reach for `useTransition` when you do own the
`set` call. See [`DeferredInput.tsx`](./useDeferredValue/DeferredInput.tsx).

### 2. Indicating that content is stale
Compare `value !== deferredValue` to know whether what's currently
rendered is behind what the user just typed, and style it accordingly
(dim it, add a subtle transition) so the lag is intentional-looking rather
than looking broken. See
[`StaleIndicator.tsx`](./useDeferredValue/StaleIndicator.tsx).

### 3. Showing stale content while fresh Suspense content loads (conceptual only)
Passing `deferredQuery` into a `<Suspense>`-wrapped, data-fetching child
means a query change re-suspends the boundary in the background instead of
immediately swapping the whole subtree for the fallback — the user keeps
seeing old results until new ones are ready. Requires `Suspense` for data
fetching, which gets its own writeup later in the roadmap (Phase 5) — not
demoed here since the pieces aren't built yet.

---

## `useDeferredValue` vs. debouncing/throttling

| | Debounce/throttle | `useDeferredValue` |
|---|---|---|
| Delay | Fixed, hand-picked timeout | None — starts immediately, adapts to how long the render actually takes |
| Interruptible | No — a pending timer still fires | Yes — a newer value abandons the in-flight background render |
| What it defers | Anything (network calls, calculations) | Specifically a React re-render |

They're not mutually exclusive: keep debouncing for things `useDeferredValue`
doesn't help with, like cutting down actual network request volume.

---

## `useDeferredValue` vs. `useTransition`

| | `useDeferredValue` | `useTransition` |
|---|---|---|
| Input | A **value** | A **`set` call** wrapped in a callback |
| Use when | You don't control the setter (prop, another hook's return value) | You do control the setter |
| Gives you a pending flag | No — compare `value !== deferredValue` yourself | Yes — `isPending` |
| Inside an active transition | No-op (returns new value immediately) | N/A — it *is* the transition |

See [`useTransition.md`](./useTransition.md) for the setter-owning side of
this same tradeoff.
