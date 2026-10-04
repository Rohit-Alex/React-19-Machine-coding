# `memo`, `useMemo`, `useCallback` — when they actually help

> **The question:** "When would you use `useMemo` or `useCallback`?" — or,
> more often now, a code review: "This component has `useCallback` on every
> function. Is that good?"
>
> The honest answer is "rarely, and only together with something else". A
> `useCallback` on its own does nothing useful. This page shows the four
> versions of the same screen and what each one costs.

Runnable demo: [`index.tsx`](./index.tsx) · the four versions:
[`MemoScenarios.tsx`](./MemoScenarios.tsx) · render badge:
[`RenderCount.tsx`](../RenderCount.tsx)

API details (signatures, caveats, the docs' five scenarios) are in Phase 1:
[useMemo.md](../../Hooks/useMemo/useMemo.md) ·
[useCallback.md](../../Hooks/useCallback/useCallback.md). This page is about
judgement.

---

## 1. How React decides to re-render

When a component's state changes, React re-renders **it and everything it
renders**, all the way down. It does not check whether a child's props
changed — unless the child is wrapped in **`memo`**.

`memo(Child)` adds one check: "are all props the same as last time?"
(`Object.is` on each one). If yes, skip. That's the only thing that makes a
child skip; `useMemo` and `useCallback` exist to **make that check pass**.

Analogy: a guard at a door with a guest list (`memo`). The guard only lets
you skip the queue if you look *exactly* the same as last time. An inline
`() => {}` is a different person every time — even if they do the same job.
`useCallback` is giving them the same badge each visit.

---

## 2. The four versions in the demo

The list takes ~40ms per render on purpose. Click the "unrelated counter":

| Version | Counter click re-renders the list? | Why |
| --- | --- | --- |
| **A. No memo** | Yes, every time | Parent re-rendered, so the child does. |
| **B. `memo`, inline props** | **Yes, every time** | `onPick={(id) => …}` and `style={{…}}` are new each render, so the props check always fails. `memo` costs a comparison and saves nothing. |
| **C. `memo` + `useCallback` + `useMemo`** | No | Every prop is the same object as last time. |
| **D. No memo, state moved down** | No | The counter's state lives in its own `<Counter />`. Its updates never re-render the list's parent. |

Typing in the filter re-renders the list in all four — its `query` prop
really changed. That's correct: memoisation skips *unnecessary* work only.

**B is the most common thing in real code** — `memo` on a component, with
inline functions passed to it. It looks optimised and isn't.

**D is usually the best fix.** No memo, no hooks, nothing to keep in sync —
just state placed where it's used. Try this first.

---

## 3. When each one helps

**`memo(Component)`** — when the component is slow to render, re-renders
often with the same props, and you can make its props stable. All three, or
it's noise.

**`useCallback(fn, deps)`** — only when the function is:
- passed to a **`memo`** child (version C), or
- a dependency of an effect or another hook (so the effect doesn't re-run
  each render), or
- returned from a custom hook that others may use in those ways.

Passed to a plain `<button onClick>`? Useless: a DOM element doesn't skip
anything.

**`useMemo(() => value, deps)`** — when:
- the calculation is measurably slow (filtering 10,000 rows, not 10), or
- the result is an object/array passed to a `memo` child or used as an effect
  dependency (version C's `style`).

Use `console.time` or the Profiler ([Profiler notes](../Profiler/Profiler.md))
before adding it. Under ~1ms, the memo bookkeeping can cost more than it
saves.

---

## 4. Cheaper fixes, before reaching for memo

1. **Move state down** (version D) — keep fast-changing state in the
   smallest component that needs it.
2. **Lift content up as `children`** — `<Layout><SlowPage/></Layout>`: when
   `Layout`'s state changes, `children` is the same element from the parent,
   so React skips it. See [ContextPerformance](../ContextPerformance/ContextPerformance.md#4-composition-children-dont-re-render).
3. **Constants outside the component** — `const STYLE = {…}` at module level
   is stable for free.
4. **Don't create a component inside another** — it's a new type every
   render, so React throws its subtree away (and loses its state). That's
   not a memo problem; nothing fixes it but moving it out.
5. **Make the slow thing faster** — fewer rows ([virtualise](../VirtualizationDeepDive/VirtualizationDeepDive.md)),
   `useDeferredValue` for typing, or less work per row.

---

## 5. Common mistakes

- **`useCallback` everywhere, no `memo` anywhere.** Pure overhead.
- **Missing dependencies** to "keep it stable" — the callback reads stale
  values. Use the updater form (`setX(prev => …)`) so it doesn't need them.
- **`memo` with a `children` prop.** `children` JSX is a new object every
  render, so the check always fails.
- **Spreading props** (`<Memo {...props} />`) — any new object inside breaks it.
- **Memoising something cheap** "just in case" — it makes code harder to read
  and change, and the deps arrays become a source of bugs.

---

## 6. React 19 and the Compiler

With the React Compiler turned on, most of this happens automatically: it
caches values, callbacks and JSX per component, so version B behaves like C
without any hooks. It's opt-in (a build plugin) — this project doesn't use
it. What it does and doesn't fix is in
[ReactCompiler.md](../ReactCompiler/ReactCompiler.md). Knowing the manual
version is still expected: it explains what the compiler does, and most
codebases aren't on it yet.

---

## 7. Follow-ups to expect

| They ask | Short answer |
| --- | --- |
| "Why not memo everything?" | Each memo is a comparison on every render, plus memory, plus deps to maintain. It only pays off when renders are slow *and* skippable. The Compiler is the "memo everything" answer, done safely. |
| "Custom comparison in `memo`?" | `memo(C, (prev, next) => …)` — rarely worth it, and easy to get wrong (skipping a render you needed). Prefer stable props. |
| "`useMemo` as a guarantee?" | It isn't. React throws the cache away when you edit the file in development, and the docs reserve the right to drop it in more cases later. Never rely on it for correctness — only speed. Use `useState`/`useRef` for things that must persist. |
| "A context value object?" | `useMemo` the value, or every consumer re-renders on every provider render. See [ContextPerformance](../ContextPerformance/ContextPerformance.md). |

---

## 8. Scoring notes

- **Mid:** knows what each hook does; tends to add them everywhere or nowhere.
- **Senior:** explains that only `memo` skips renders and the hooks only
  serve it (or effects); spots `memo` defeated by inline props; reaches for
  moving state down and `children` first; measures before memoising; knows
  where the Compiler changes the picture.
