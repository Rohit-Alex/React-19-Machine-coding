# `useMemo`

> Source: [react.dev/reference/react/useMemo](https://react.dev/reference/react/useMemo) — verified against React 19 docs.

`useMemo` is a React Hook that lets you **cache the result of a calculation
between re-renders**. It does not make the _first_ render faster — it only
helps you skip re-running an expensive calculation on re-renders where its
inputs haven't changed.

```tsx
const cachedValue = useMemo(calculateValue, dependencies);
```

Working examples for the scenarios worth a live demo live in [`useMemo/`](./useMemo) — scenarios 3 and 4 below are explained conceptually only, no dedicated demo.

---

## Signature

```tsx
const cachedValue = useMemo(calculateValue, dependencies);
```

### Parameters

| Parameter        | Description                                                                                                                                                                                                                                                                        |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `calculateValue` | A **pure** function that takes **no arguments** and returns the value to cache. React calls it on the initial render. On later renders, React returns the cached value if `dependencies` haven't changed; otherwise it calls `calculateValue` again and caches the new result.     |
| `dependencies`   | An array of every reactive value (props, state, and any variable/function declared inside the component body) referenced inside `calculateValue`. Must be a fixed-length array written inline, e.g. `[a, b]`. React compares each entry with its previous value using `Object.is`. |

### Returns

- **Initial render:** the result of calling `calculateValue()`.
- **Subsequent renders:** the cached value from last render if dependencies are unchanged, otherwise the fresh result of calling `calculateValue()` again.

---

## When it's actually useful

Per the docs, reach for `useMemo` when **one of these** is true:

1. The calculation is noticeably slow _and_ its dependencies rarely change.
2. The cached value is passed as a **prop to a `memo`-wrapped component**, so you need referential stability to let it actually skip re-rendering.
3. The cached value is used as a **dependency of another Hook** (another `useMemo`, or a `useEffect`), where a new reference every render would defeat that Hook's own memoization or cause it to re-fire.

If none of these apply, adding `useMemo` mostly costs readability for no measurable benefit — there's no significant harm in over-memoizing, but it's still noise.

### How to tell if a calculation is actually "expensive"

Unless you're creating or looping over thousands of objects, it's probably
**not** expensive enough to matter. Measure first:

```tsx
console.time("filter array");
const visibleTodos = filterTodos(todos, tab);
console.timeEnd("filter array");
```

If the total logged time adds up to something significant (roughly ≥1ms),
memoizing might be worth it. Measure in a **production build** — Strict
Mode's intentional double-invoking in development skews the numbers.

### Reduce the _need_ for memoization first

Before reaching for `useMemo`, the docs recommend:

- Let wrapper components accept JSX as `children` instead of re-creating it.
- Prefer local state over lifting state higher than necessary.
- Keep rendering logic pure (no side effects during render).
- Avoid unnecessary Effects that just sync/derive state.
- Remove unnecessary dependencies from Effects.

Use the **React DevTools Profiler** to actually find components worth optimizing rather than guessing.

---

## The 5 usage scenarios (from the docs)

### 1. Skipping expensive recalculations

Wrap the calculation itself so it only re-runs when its own dependencies change, not on every re-render caused by unrelated state. See [`ExpensiveCalculation.tsx`](./ExpensiveCalculation.tsx).

### 2. Skipping re-rendering of a child component

`useMemo` alone doesn't skip renders — it only gives you a **referentially stable value**. Combine it with `memo` on the child so an unchanged prop reference actually short-circuits that child's re-render. See [`SkipRerender.tsx`](./SkipRerender.tsx).

> **Deep dive:** you can memoize a JSX node directly (`useMemo(() => <List items={x} />, [x])`) instead of wrapping the component in `memo`, because JSX nodes are just plain objects (`{ type, props }`) and React skips re-rendering when it receives the _same_ object reference as last time. This works but is awkward to use conditionally, so wrapping the component in `memo` is the usual choice.

### 3. Preventing an Effect from firing too often

An object/array/function literal declared in the component body is a **new reference every render**. If it's an Effect dependency, the Effect re-fires every render regardless of whether the _values_ inside it changed. Memoizing that object stabilizes it — same fix as scenario 4, just with `useEffect` as the consumer instead of another `useMemo`. Conceptual only, no dedicated demo.

> The docs note an **even better fix**: move the object literal _inside_ the Effect itself, so there's no object dependency (and no `useMemo`) needed at all — only the primitive values it's built from need to be dependencies.

### 4. Memoizing a dependency of another Hook

Same root problem as #3, but the dependency feeds a `useMemo`/`useCallback` instead of a `useEffect`. Two fixes: memoize the dependency object itself, or (preferred) move its declaration inside the calculation function so the calculation depends on primitives directly. Conceptual only, no dedicated demo.

### 5. Memoizing a function

You _can_ use `useMemo` to cache a function (the calculation function returns another function), but it's clunky. `useCallback(fn, deps)` is exactly equivalent to `useMemo(() => fn, deps)` and exists specifically to avoid the extra nesting — prefer it for functions. See [`MemoizeFunction.tsx`](./MemoizeFunction.tsx).

---

## Rules

- **Top-level only.** `useMemo` is a Hook — call it only at the top level of a component or a custom Hook, never inside loops, conditions, or nested functions. If you need a memoized value per list item, extract a component per item and call `useMemo` inside _that_ component.
- **`calculateValue` must be pure.** No side effects, no mutating props/state during the calculation.
- **The dependency array is not optional** if you want caching. `useMemo(fn)` with no second argument recalculates on every render (equivalent to just calling `fn()` inline, but worse for readability).
- Dependencies are compared with `Object.is`, the same algorithm used for state/prop comparisons elsewhere in React — not deep equality.

---

## Caveats

- **In Strict Mode (dev only), React calls `calculateValue` twice** per render to help surface accidental impurities, then discards one result. This never happens in production. If your calculation is pure, you won't notice a behavioral difference — only that `console.log`s inside it appear twice.
- **React may throw away the cache even when dependencies haven't changed.** This is a documented, intentional part of the contract — e.g. React discards the cache in development when you edit the component's file, and in both dev and prod when the component suspends during initial mount. Future React features (e.g. discarding cache for virtualized items scrolled out of view) may extend this. **Conclusion: treat `useMemo` purely as a performance hint, never as a semantic guarantee.** If your app breaks when a memoized value is recomputed, that's a correctness bug to fix independently (usually: use `useState`/`useRef` instead, or move the logic somewhere it's guaranteed to run).
- `useMemo` **does not memoize across component unmounts** — a fresh mount always recalculates on its first render.

---

## React 19 note: the Compiler

The **React Compiler** auto-memoizes values and functions at build time,
which reduces (but doesn't eliminate the _concept_ of) manual `useMemo`
calls. It's not enabled by default in a Vite template — it's an opt-in build
step. Until/unless it's adopted project-wide, understanding manual
`useMemo` is still essential, both for existing codebases and because
interviewers are explicitly testing whether you understand _why_ the
compiler's optimization exists, not just how to invoke the Hook.

---

## Troubleshooting (from the docs)

| Symptom                                                                  | Cause                                                                                                                        | Fix                                                                                                                                                                                          |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Calculation runs **twice** on every re-render                            | Strict Mode dev-only double-invoke to catch impurities                                                                       | Expected in dev; confirm it only fires once per render in a production build. If it doesn't, look for prop/state mutation inside the calculation.                                            |
| `useMemo` is supposed to return an object, but returns `undefined`       | `() => { key: value }` — the `{}` is parsed as a function body block, not an object literal                                  | Wrap in parens `() => ({ key: value })`, or better, use an explicit `return` statement inside a block body.                                                                                  |
| Calculation re-runs on **every** render even though deps "look the same" | Missing dependency array entirely, or a dependency's _reference_ changes every render (e.g. an inline object/array/function) | Add the dependency array. If a dependency keeps changing identity, log it and compare with `Object.is` across renders to find which entry is unstable, then memoize or eliminate that entry. |
| Need `useMemo` per item inside a `.map()` loop                           | Hooks can't be called inside loops/conditions                                                                                | Extract a component per item and call `useMemo` at _its_ top level — or skip `useMemo` entirely and wrap that per-item component in `memo` instead.                                          |

> **TypeScript note:** `@types/react` makes the `deps` parameter
> **required** (`useMemo<T>(factory: () => T, deps: DependencyList): T`),
> unlike the plain-JS signature where it's optional. This is intentional —
> it turns the "missing dependency array" mistake into a compile-time
> error instead of a silent perf bug, so in a TS codebase you generally
> can't hit this one by accident.
