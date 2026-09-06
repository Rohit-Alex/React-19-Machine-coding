# `useRef`

> Source: [react.dev/reference/react/useRef](https://react.dev/reference/react/useRef) — verified against React 19 docs.

`useRef` gives you a mutable box — `{ current: value }` — that survives
across re-renders but, unlike state, **changing it never triggers a
re-render**. That single property is the whole hook; everything else is
what you do with the box.

Three live demos: [`RefVsState.tsx`](./useRef/RefVsState.tsx) (the core
"why does the UI not update" contrast), [`DomRef.tsx`](./useRef/DomRef.tsx)
(DOM manipulation + React 19's `ref`-as-prop, no `forwardRef` needed), and
[`LazyInit.tsx`](./useRef/LazyInit.tsx) (avoiding recreating expensive ref
contents on every render). Everything else below is conceptual.

---

## Signature

```tsx
const ref = useRef(initialValue);
```

- **`initialValue`** — anything; used only for the *first* render, ignored after.
- **Returns** a plain object `{ current: initialValue }`. The same object identity is returned on every subsequent render — React never replaces it.

---

## The one thing that matters: refs don't cause re-renders

| | `useState` | `useRef` |
|---|---|---|
| Survives re-renders | Yes | Yes |
| Changing it triggers a re-render | Yes | **No** |
| Read/write during render | Read yes, write no (would loop) | **Never** (see pitfall below) |
| Use for | Anything shown in the UI | Anything the UI doesn't need to react to: timers/interval IDs, previous values, DOM nodes, mutable instance-style fields, latest-value-in-a-closure escape hatches |

See [`RefVsState.tsx`](./useRef/RefVsState.tsx) — two counters side by
side, incremented by the same click; the state one re-renders and shows
the new number immediately, the ref one silently updates `current` and
the screen doesn't change until something else forces a re-render.

---

## Caveats

- **You can mutate `ref.current` directly** — unlike state, no setter, no immutability requirement (unless the ref holds an object also used for rendering, which you shouldn't mutate).
- **Do not read or write `ref.current` during rendering** — except for one-time lazy initialization (see below). Do it in event handlers or Effects instead. Violating this breaks the "component body is a pure function of props/state" contract that newer React features assume.
- **Strict Mode double-invoke applies the same way it does for `useState`/`useEffect`** — see [`useEffect.md`](./useEffect.md#caveats). In dev, your component function runs twice, so the ref object itself is technically created twice, but one copy is discarded — a pure component won't notice.
- **`ref.current` on a DOM ref starts as `null`**, becomes the real DOM node after React commits it to the screen, and **goes back to `null`** when that node is removed. Never assume it's non-null on first render.

---

## DOM refs + React 19's `ref`-as-prop

Passing `ref={someRef}` to a JSX DOM node (`<input ref={inputRef} />`) is
built into React — after commit, `inputRef.current` is the real DOM node.

For **your own components**, refs used to require wrapping in
`forwardRef((props, ref) => ...)` to be forwarded to an inner DOM node.
**React 19 removed that requirement** — `ref` can now be declared as a
regular prop:

```tsx
function MyInput({ ref }: { ref?: React.Ref<HTMLInputElement> }) {
  return <input ref={ref} />;
}
```

See [`DomRef.tsx`](./useRef/DomRef.tsx), which focuses a real `<input>`
imperatively and passes the ref straight through a custom child component
as a prop — no `forwardRef` in sight.

---

## Avoiding recreating ref contents on every render

`initialValue` in `useRef(initialValue)` is only *used* on the first
render — but the expression is still **evaluated on every render**:

```tsx
// 🚩 `new VideoPlayer()` runs on every render, result discarded except first time
const playerRef = useRef(new VideoPlayer());
```

Fix by guarding the assignment so the expensive constructor only ever
runs once, using the one exception to "don't write during render":

```tsx
const playerRef = useRef(null);
if (playerRef.current === null) {
  playerRef.current = new VideoPlayer();
}
```

This is safe specifically because the condition is deterministic and
only ever fires on the true first render. See
[`LazyInit.tsx`](./useRef/LazyInit.tsx) — it counts constructor calls
under both patterns to make the wasted allocations visible.

---

## Troubleshooting (from the docs)

| Symptom | Cause | Fix |
|---|---|---|
| `TypeError: Cannot read properties of null` when passing `ref` to your own component | Your component doesn't accept/forward a `ref` prop | Declare `ref` as a prop and pass it to the inner DOM node (React 19; no `forwardRef` needed) — see `DomRef.tsx`. |
| Ref update doesn't show up on screen | Changing `ref.current` never triggers a re-render — that's the point of a ref | If the value needs to be displayed, it belongs in `useState`, not `useRef`. |
