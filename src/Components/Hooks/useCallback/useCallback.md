# `useCallback`

> Source: [react.dev/reference/react/useCallback](https://react.dev/reference/react/useCallback) — verified against React 19 docs.

`useCallback` is a React Hook that lets you **cache a function definition
between re-renders**. It's the sibling of [`useMemo`](../useMemo/useMemo.md.md) — read
that first, most of what's true there is true here.

```tsx
const cachedFn = useCallback(fn, dependencies);
```

Working examples live in [`useCallback/`](./useCallback).

---

## Signature

### Parameters

| Parameter      | Description                                                                                                                                                                                                                                                                                                         |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fn`           | The function to cache. Takes any arguments, returns anything. React **returns it back to you, it never calls it.** On the initial render you get `fn` itself. On later renders, you get the same cached function if `dependencies` are unchanged (per `Object.is`), otherwise you get the new `fn` you just passed. |
| `dependencies` | Same rules as `useMemo`: array of every reactive value read inside `fn`, fixed length, written inline, compared with `Object.is`.                                                                                                                                                                                   |

### Returns

The function itself — cached or fresh, per the render described above.

---

## `useCallback` vs `useMemo` — the one thing to actually understand

```tsx
// This is conceptually what useCallback does internally:
function useCallback(fn, dependencies) {
  return useMemo(() => fn, dependencies);
}
```

- **`useMemo` caches the _result_ of calling a function** — React calls it during render.
- **`useCallback` caches _the function reference itself_** — React never calls it, just hands back the same reference.

They solve the exact same problem (referential stability breaking `memo` /
Hook dependencies) for two different kinds of values: **data vs.
functions.** [`useMemo/MemoizeFunction.tsx`](../useMemo/MemoizeFunction.tsx)
already demonstrates both side by side against the same `memo`-wrapped
child — that example _is_ the useCallback "skip child re-render" scenario
too, so it isn't repeated here.

---

## Rules (identical to `useMemo`)

- **Top-level only** — no loops, no conditions. Need one per list item? Extract a component and call `useCallback` inside _that_ component's top level (or skip memoization and wrap the item component in `memo` instead — same tradeoff as `useMemo`'s [loop restriction](../useMemo/useMemo.md#troubleshooting-from-the-docs)).
- The dependency array isn't optional if you want caching — `useCallback(fn)` with no deps returns a new function every render.
- **TypeScript makes `dependencies` required**, same as `useMemo`, so the "forgot the array" mistake is a compile error here too, not a silent perf bug.

## Caveats (identical to `useMemo`)

- React may discard the cached function even when dependencies haven't changed (file edits in dev, Suspense during initial mount, possible future scenarios). **Treat it as a performance hint only** — never rely on it for correctness. If correctness depends on a stable reference, that's a job for a ref or state, not `useCallback`.

## When it's actually worth it

Same three conditions as `useMemo`, function-flavored:

1. It's passed to a `memo`-wrapped component and you need the reference stable to actually skip its re-render.
2. It's a dependency of another Hook (another `useCallback`, or `useEffect`) that would otherwise re-run every render.
3. You're authoring a **custom Hook** and returning functions from it (see below) — you don't know how the consumer will use them, so stabilize by default.

`useCallback` doesn't stop the function from being _created_ every render —
you're always creating a new one; React just throws it away and hands you
the cached one if deps match. There's no real cost to over-using it beyond
readability, but a single always-new prop is enough to defeat memoization
for an entire subtree, so it's not free either.

---

## What's actually new here (not just "useMemo for functions")

### Updating state from a memoized callback — the updater-function trick

If a callback reads state only to compute the _next_ state
(`setTodos([...todos, newTodo])`), that state becomes a dependency and the
callback goes stale every time it changes — defeating memoization. Use the
**updater function** form of the setter (`setTodos(prev => [...prev,
newTodo])`) instead: it always receives the latest state from React
directly, so the state itself no longer needs to be a dependency.

```tsx
// 🔴 `todos` must be a dependency — callback is recreated every add
const handleAdd = useCallback(
  (text) => {
    setTodos([...todos, { id: nextId++, text }]);
  },
  [todos],
);

// ✅ No `todos` dependency needed — updater fn always sees latest state
const handleAdd = useCallback((text) => {
  setTodos((prev) => [...prev, { id: nextId++, text }]);
}, []);
```

**The gotcha to actually watch for:** if you memoize a callback with `[]`
and read a piece of state _directly_ inside it (not through an updater
function), you get a **stale closure** — the callback forever sees the
state value from the render where it was first created. The updater-fn
trick only works for the setter's own state; any _other_ reactive value
the callback reads (props, other state) still needs to be a real
dependency. See [`UpdaterFunction.tsx`](./UpdaterFunction.tsx).

### Optimizing a custom Hook

If you're authoring a custom Hook that **returns functions**, wrap them in
`useCallback` before returning. You don't control how the consumer uses
them — they might pass one straight into a `memo`-wrapped child — so an
unstable reference from inside your Hook silently defeats memoization
everywhere it's consumed, with no way for the caller to fix it themselves.
This is standard practice for any hook you'd publish or share across a
team. See [`CustomHookOptimization.tsx`](./CustomHookOptimization.tsx).

---

## Deliberately not repeated here

These scenarios exist in the official docs for `useCallback` but are the
_exact same lesson_ already covered under `useMemo`, just with a function
instead of an object — see the linked section instead of a duplicate demo:

- **"Preventing an Effect from firing too often"** with a function
  dependency → same mechanic as memoizing an object dependency, see
  [`useMemo.md`](../useMemo/useMemo.md#3-preventing-an-effect-from-firing-too-often).
  The fix is identical: wrap the function in `useCallback`, or better,
  move its declaration inside the Effect entirely.
- **"Missing dependency array returns a new function every render"** →
  same as `useMemo`'s missing-deps troubleshooting entry, and same
  TypeScript-catches-it-at-compile-time note.
- **"Can't call it in a loop"** → same Hooks rule, same two fixes (extract
  a component, or drop memoization and wrap the item in `memo`).
