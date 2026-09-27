# `useRef`

> Source: [react.dev/reference/react/useRef](https://react.dev/reference/react/useRef) — verified against React 19 docs.

`useRef` gives you a mutable box — `{ current: value }` — that survives
across re-renders but, unlike state, **changing it never triggers a
re-render**. That single property is the whole hook; everything else is
what you do with the box.

Five live demos: [`RefVsState.tsx`](./RefVsState.tsx) (the core
"why does the UI not update" contrast), [`DomRef.tsx`](./DomRef.tsx)
(DOM manipulation + React 19's `ref`-as-prop, no `forwardRef` needed),
[`LazyInit.tsx`](./LazyInit.tsx) (avoiding recreating expensive ref
contents on every render), [`CallbackRef.tsx`](./CallbackRef.tsx) (a
callback ref for a node that shows up later), and
[`RefList.tsx`](./RefList.tsx) (refs for a list rendered with `.map()`).
Everything else below is conceptual.

---

## Signature

```tsx
const ref = useRef(initialValue);
```

- **`initialValue`** — anything; used only for the _first_ render, ignored after.
- **Returns** a plain object `{ current: initialValue }`. The same object identity is returned on every subsequent render — React never replaces it.

---

## The one thing that matters: refs don't cause re-renders

|                                  | `useState`                      | `useRef`                                                                                                                                                           |
| -------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Survives re-renders              | Yes                             | Yes                                                                                                                                                                |
| Changing it triggers a re-render | Yes                             | **No**                                                                                                                                                             |
| Read/write during render         | Read yes, write no (would loop) | **Never** (see pitfall below)                                                                                                                                      |
| Use for                          | Anything shown in the UI        | Anything the UI doesn't need to react to: timers/interval IDs, previous values, DOM nodes, mutable instance-style fields, latest-value-in-a-closure escape hatches |

See [`RefVsState.tsx`](./RefVsState.tsx) — two counters side by
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

See [`DomRef.tsx`](./DomRef.tsx), which focuses a real `<input>`
imperatively and passes the ref straight through a custom child component
as a prop — no `forwardRef` in sight.

---

## Avoiding recreating ref contents on every render

`initialValue` in `useRef(initialValue)` is only _used_ on the first
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
[`LazyInit.tsx`](./LazyInit.tsx) — it counts constructor calls
under both patterns to make the wasted allocations visible.

---

## Callback refs: when the node shows up later

A ref doesn't have to be an object. You can pass a **function**:

```tsx
<input
  ref={(node) => {
    node?.focus();
  }}
/>
```

React calls it with the DOM node when the node is attached. In React 19
the function can **return a cleanup**, which React calls when the node is
removed (like an Effect's cleanup):

```tsx
<div
  ref={(node) => {
    console.log("attached", node);
    return () => console.log("removed", node);
  }}
/>
```

**Why you need it.** A common mistake is to think "`useRef` + `useEffect`
will always see my node". It won't if the node appears _after_ the
component mounted — for example behind `{show && <input ... />}`:

```tsx
const ref = useRef<HTMLInputElement>(null);
useEffect(() => {
  ref.current?.focus(); // 🚩 runs once, at mount — input isn't there yet → null
}, []);
```

The effect ran once, found `null`, and has no reason to run again —
`ref.current` changing never triggers anything (that's the whole point of
a ref). A callback ref flips it around: instead of _you_ checking whether
the node exists, _React_ tells you the moment it does.

Analogy: `useEffect([])` is checking the mailbox once, the day you move
in. A callback ref is a doorbell — it rings whenever the parcel actually
arrives, however late.

See [`CallbackRef.tsx`](./CallbackRef.tsx) — two toggled inputs side by
side: the `useEffect` one stays unfocused, the callback-ref one focuses
itself on appear.

**Caveat — keep the function stable when it has side effects.** An inline
arrow is a _new function every render_. React treats a new function as a
new ref: it runs the old cleanup (or calls the old one with `null`), then
calls the new one with the node. For a "focus on attach" ref that means
**re-focusing on every re-render** (every keystroke, if the input is
controlled). Wrap it in `useCallback(fn, [])`, or define it outside the
component. For cheap, idempotent work (like the `Map.set` below) the
churn is harmless and inline is fine.

---

## Refs for a dynamically mapped list

You can't do this:

```tsx
{
  items.map((item) => {
    const ref = useRef(null); // 🚩 hook inside a loop — breaks the rules of hooks
    return <li ref={ref}>...</li>;
  });
}
```

Hooks must be called the same number of times, in the same order, on
every render. A list that grows or shrinks breaks that.

The fix: **one** `useRef` that holds a `Map` of id → node, and a callback
ref on each item that registers itself:

```tsx
const nodesRef = useRef<Map<number, HTMLLIElement> | null>(null);
const getMap = () => {
  if (nodesRef.current === null) nodesRef.current = new Map(); // lazy init
  return nodesRef.current;
};

{
  items.map((item) => (
    <li
      key={item.id}
      ref={(node) => {
        if (!node) return;
        const map = getMap();
        map.set(item.id, node);
        return () => {
          map.delete(item.id); // ✅ React 19: cleanup when the <li> is removed
        };
      }}
    >
      {item.label}
    </li>
  ));
}

// later, in an event handler:
getMap().get(id)?.scrollIntoView();
```

Analogy: a coat check. You don't hire one attendant per coat (one
`useRef` per item). You have one rack (the `Map`) — each coat hangs itself
up on arrival and takes itself down on leaving (the cleanup).

**Why the cleanup matters.** Without it, removed items stay in the `Map`
pointing at detached DOM nodes: `scrollTo` silently does nothing, and the
nodes can't be garbage-collected. Before React 19 you handled this by
checking for `node === null` in the callback; returning a cleanup is the
cleaner way now. (If you return a cleanup, React does **not** also call
the function with `null`.)

Key the `Map` by a **stable id**, not the array index — the index of an
item changes when something before it is removed, so the `Map` would
point at the wrong node.

See [`RefList.tsx`](./RefList.tsx) — scroll-to buttons for each item,
plus add/remove; after removing, "read Map size" matches the item count,
because each removed `<li>`'s cleanup deleted its entry.

---

## Troubleshooting (from the docs)

| Symptom                                                                               | Cause                                                                         | Fix                                                                                                              |
| ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `TypeError: Cannot read properties of null` when passing `ref` to your own component  | Your component doesn't accept/forward a `ref` prop                            | Declare `ref` as a prop and pass it to the inner DOM node (React 19; no `forwardRef` needed) — see `DomRef.tsx`. |
| `ref.current` is `null` inside `useEffect(..., [])` for a conditionally rendered node | The Effect ran at mount, before the node existed, and never runs again        | Use a callback ref — see `CallbackRef.tsx`.                                                                      |
| Callback ref runs on every render (input keeps re-focusing, logs spam)                | Inline arrow = new function each render = React detaches and re-attaches      | Wrap the callback in `useCallback`, or move it outside the component.                                            |
| Need a ref per item in a `.map()`                                                     | Can't call `useRef` in a loop                                                 | One `useRef(Map)` + callback ref per item with a cleanup — see `RefList.tsx`.                                    |
| Ref update doesn't show up on screen                                                  | Changing `ref.current` never triggers a re-render — that's the point of a ref | If the value needs to be displayed, it belongs in `useState`, not `useRef`.                                      |
