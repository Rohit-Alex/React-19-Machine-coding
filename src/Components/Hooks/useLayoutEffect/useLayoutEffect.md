# `useLayoutEffect`

> Source: [react.dev/reference/react/useLayoutEffect](https://react.dev/reference/react/useLayoutEffect) — verified against React 19 docs.

`useLayoutEffect` is `useEffect`'s twin with one difference that matters:
it fires **before the browser repaints**, and blocks that repaint until it
(and any state updates it triggers) finish. Signature, dependency-array
rules, `Object.is` comparison, and the Strict Mode double-invoke are all
**identical to `useEffect`** — see [`useEffect.md`](./useEffect.md) for
those, they aren't repeated here.

> **Docs' own pitfall callout:** "`useLayoutEffect` can hurt performance. Prefer `useEffect` when possible." Reach for it only when you have a *specific, observable* flicker to fix.

Three live demos: [`PaintBlocking.tsx`](./useLayoutEffect/PaintBlocking.tsx) (blocking paint until measured), [`PositionCalculation.tsx`](./useLayoutEffect/PositionCalculation.tsx) (the canonical measure-then-position use case), and [`EffectFlush.tsx`](./useLayoutEffect/EffectFlush.tsx) (the effect-flushing caveat). Everything else below is conceptual.

---

## Signature

```tsx
useLayoutEffect(setup, dependencies?);
```

Same parameters, return type (`undefined`), and rules as `useEffect` — see [`useEffect.md`](./useEffect.md#signature).

---

## The one thing that's actually different: blocking paint

| | `useEffect` | `useLayoutEffect` |
|---|---|---|
| Runs relative to paint | **After** the browser paints | **Before** the browser paints |
| Consequence | Any state update inside it causes a *second*, separately-painted render — visible as a flicker if the first render was visibly wrong | React holds the paint until this Effect (and any state update it triggers) settles, so the user only ever sees the final, correct result |
| Extra caveat | — | Triggering a state update inside `useLayoutEffect` makes React run **all** remaining Effects immediately, including `useEffect` |

**Canonical use case:** measuring a DOM node's real layout (e.g. `getBoundingClientRect()`) and using that measurement to decide how to render — a tooltip that must flip above/below its target depending on available space. This needs two passes: render once (position unknown), measure, render again (position corrected) — and that correction must happen **before** the user sees the first, wrong position. See [`PositionCalculation.tsx`](./useLayoutEffect/PositionCalculation.tsx) — it measures a box's position via `getBoundingClientRect()` inside the effect; swap the hook it uses (`useEffect` vs `useLayoutEffect`, per the comment in the file) to feel the difference: with `useEffect` the measured value visibly lags a render behind.

[`PaintBlocking.tsx`](./useLayoutEffect/PaintBlocking.tsx) isolates the same idea further: an artificially slow render (busy-wait) followed by a state update inside the effect flips a box's background color once "measured" — with `useLayoutEffect` the user only ever sees the final color, with `useEffect` there's a window where the stale color is on screen. Toggle which hook `MeasureBox` uses (one is commented out) to compare.

---

## Caveats

- All of `useEffect`'s caveats apply unchanged: top-level-only, Strict Mode dev double-invoke, unstable object/function dependencies re-firing too often, client-only (never runs during SSR). See [`useEffect.md`](./useEffect.md#caveats).
- **Blocks the browser from repainting** — the code inside it, and any state updates it schedules, run to completion before the next paint. Used excessively, this makes the whole app feel slower, since every layout Effect adds synchronous work to the critical rendering path.
- **A state update inside `useLayoutEffect` flushes all remaining Effects immediately**, `useEffect` included — so ordering assumptions about "layout effects run before passive effects" hold even more strictly than usual in that specific case. See [`EffectFlush.tsx`](./useLayoutEffect/EffectFlush.tsx) — its `useLayoutEffect` calls `setReady(true)`, and the console log order (`1. layout effect` → `2. useEffect` → re-render) shows React draining the pending `useEffect` before the browser gets to paint.

---

## SSR pitfall: "`useLayoutEffect` does nothing on the server" (conceptual — this repo is CSR-only, no live demo)

Server-rendered HTML has no real layout yet (nothing has painted), so `useLayoutEffect` can't run there — React warns if you use it in a component that's part of the server-rendered tree. Four documented fixes, in order of preference:

1. **Swap it for `useEffect`** if a one-paint delay is acceptable.
2. **Mark the component client-only**, letting React render a `<Suspense>` fallback for it during SSR.
3. **Defer rendering the real content until after hydration** — keep an `isMounted` boolean (set to `true` inside a `useEffect`), and render a fallback until then; only the post-hydration branch calls `useLayoutEffect`.
4. **Use `useSyncExternalStore` instead**, if the actual goal is syncing with an external store rather than measuring layout — it has SSR support built in.

---

## Troubleshooting (from the docs)

| Symptom | Cause | Fix |
|---|---|---|
| Warning: "`useLayoutEffect` does nothing on the server" | Component using it is part of a server-rendered tree | Apply one of the four SSR fixes above — usually swapping to `useEffect`, or gating behind an `isMounted` flag. |
| App feels sluggish after adding `useLayoutEffect` | It blocks paint; used for something that doesn't actually need pre-paint layout info | Switch back to `useEffect` unless you have an observable flicker/jump to fix. |
