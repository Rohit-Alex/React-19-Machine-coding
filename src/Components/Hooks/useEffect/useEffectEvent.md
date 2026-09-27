# `useEffectEvent`

> Source: [react.dev/reference/react/useEffectEvent](https://react.dev/reference/react/useEffectEvent) — stable as of React 19.2 (this project is on 19.2).

`useEffectEvent` lets you **separate events from Effects**. An Effect Event is
part of your Effect's logic, but it behaves like an event handler: it always
reads the *latest* props/state at the time it's called, and — because of
that — it's never listed in the Effect's dependency array.

```tsx
const onEvent = useEffectEvent(callback);
```

A working demo lives in [`EffectEvent.tsx`](./EffectEvent.tsx) (scenario 4 of
[`useEffect.md`](./useEffect.md#4-reading-the-latest-propsstate-without-reacting-to-them-useeffectevent)).
This file is the deep-dive reference; it doesn't re-demo that scenario.

---

## Signature

```tsx
useEffectEvent(callback);
```

### Parameters

| Parameter  | Description                                                                                                                                                                            |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `callback` | The logic for your Effect Event. Can take any arguments and return anything. When you call the returned function, `callback` always sees the latest committed values from render — not the values from whenever the Effect that's calling it last ran. |

### Returns

An Effect Event function with the same signature as `callback`. Callable only from inside `useEffect`, `useLayoutEffect`, `useInsertionEffect`, or from inside another Effect Event in the same component.

---

## Rules

- **Top-level only** — same as every Hook; can't be called inside loops/conditions. If you need one conditionally, extract a component and put the Effect Event there instead.
- **Callable only from Effects (or other Effect Events)** — never during render, never handed to an event handler, and never passed down as a prop to another component. `eslint-plugin-react-hooks` enforces this.
- **Never list it as a dependency.** It's the one function in React explicitly designed to be omitted from a dependency array — see the Deep Dive below for why that's safe.
- **Don't reach for it just to silence the exhaustive-deps linter.** It exists for logic that is genuinely non-reactive (an event that happens to fire from inside an Effect), not as a generic escape hatch from listing dependencies you don't want to think about.

---

## Caveats

- **Effect Event functions do not have a stable identity** — unlike a `set` function from `useState` or a `ref`, the identity intentionally changes on every render.
- Calling one during rendering throws: *"A function wrapped in useEffectEvent can't be called during rendering."*
- The linter separately rejects two other misuses: listing an Effect Event in a dependency array, and calling one from anywhere other than an Effect/another Effect Event in the same component (event handler, child prop, etc.).

---

## Deep dive: why Effect Events aren't stable

It's tempting to expect `useEffectEvent` to behave like `useCallback` — a
memoized function you can safely depend on. It's the opposite, on purpose.

```tsx
// Wrong — ESLint flags this
useEffect(() => {
  onSomething();
}, [onSomething]);
```

Effect Events are only ever meant to be called locally, from Effects in the
*same* component — never passed to children, never put in a dependency
array. Because of that restriction, giving them a stable identity would buy
nothing. Instead, React deliberately gives every Effect Event a **new**
identity on every render, and turns that into a runtime tripwire: if your
code accidentally treats one as if it needed a stable reference (e.g. you
list it as a dependency), the Effect starts re-running on every render, and
the bug becomes impossible to miss instead of silently wrong.

The instability is the point — it's what keeps an Effect Event from quietly
turning into "a second, less honest dependency array."

---

## Usage scenarios worth knowing

### 1. A timer that reads the latest state without restarting

```tsx
const onTick = useEffectEvent(() => {
  setCount((c) => c + increment);
});

useEffect(() => {
  const id = setInterval(onTick, 1000);
  return () => clearInterval(id);
}, []); // no `increment` here — onTick always reads the latest one
```

Changing `increment` changes what the *next* tick adds — but the interval
itself is never torn down and recreated. Compare with putting `increment` in
the effect's own array: the timer would restart on every change, resetting
its 1-second cadence each time.

### 2. An event listener that reads a toggle without re-attaching

```tsx
const onMove = useEffectEvent((e: PointerEvent) => {
  if (canMove) setPosition({ x: e.clientX, y: e.clientY });
});

useEffect(() => {
  window.addEventListener("pointermove", onMove);
  return () => window.removeEventListener("pointermove", onMove);
}, []); // canMove is read fresh on every call, never re-subscribes
```

Toggling `canMove` takes effect immediately on the next pointer move, but
`addEventListener` runs exactly once, at mount.

### 3. Reconnecting only on the value that should actually reconnect

The chat-room example from the docs: reconnect when `roomId` changes, but
never reconnect just because `muted` (used only to decide whether to show a
notification) changed.

```tsx
const onConnected = useEffectEvent((roomId: string) => {
  console.log(`Connected to ${roomId} (muted: ${muted})`);
  if (!muted) showNotification(`Connected to ${roomId}`);
});

useEffect(() => {
  const connection = createConnection(roomId);
  connection.on("connected", () => onConnected(roomId));
  connection.connect();
  return () => connection.disconnect();
}, [roomId]); // muted intentionally excluded
```

This is the pattern behind scenario 4 in [`useEffect.md`](./useEffect.md) and
[`EffectEvent.tsx`](./EffectEvent.tsx) — same mechanic, `notifyCount` in
place of `muted`.

> **Pitfall — don't use an Effect Event to hide a dependency that should
> stay reactive.** If `query` should cause a fresh log entry every time it
> changes, wrapping it inside the Effect Event and leaving the Effect's
> array empty doesn't just skip a lint warning — it silently stops the
> Effect from ever running again after mount. Live, breakable demo:
> [`EffectEventPitfall.tsx`](./EffectEventPitfall.tsx) — toggle between the
> buggy and fixed version and watch the log stop growing.

### 4. Wrapping a caller-supplied callback inside a custom Hook

```tsx
function useInterval(callback: () => void, delay: number | null) {
  const onTick = useEffectEvent(callback);

  useEffect(() => {
    if (delay === null) return;
    const id = setInterval(onTick, delay);
    return () => clearInterval(id);
  }, [delay]);
}
```

Without `useEffectEvent`, a caller passing an inline arrow function
(`useInterval(() => setCount(c => c + incrementBy), 1000)`) would give a new
`callback` reference every render, forcing the Effect to tear down and
recreate the interval on every render too — even though only `delay` should
ever do that. Wrapping `callback` in an Effect Event absorbs that instability
before it reaches the dependency array. Live demo:
[`EffectEventCustomHook.tsx`](./EffectEventCustomHook.tsx) — bump "increment
by" and the ticking rhythm never skips; only "delay" restarts it.

---

## Troubleshooting (from the docs)

| Symptom / error                                                                              | Cause                                                                     | Fix                                                                                                                    |
| --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `A function wrapped in useEffectEvent can't be called during rendering`                       | Calling the Effect Event directly in the component body instead of inside an Effect | Move the call into `useEffect` (or another Effect Event). If you need the logic during render, don't wrap it in `useEffectEvent` at all — call it directly. |
| Lint: `Functions returned from useEffectEvent must not be included in the dependency array`   | Listed the Effect Event in `[...]`                                       | Remove it from the array — it's designed to be omitted, not to be a dependency.                                             |
| Lint: `... is a function created with useEffectEvent, and can only be called from Effects`    | Called it from an event handler, or passed it as a prop to a child        | Call it only from an Effect/Effect Event in the same component. For event handlers or child props, use a plain function or `useCallback` instead. |
