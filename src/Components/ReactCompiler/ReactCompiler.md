# React Compiler — what it auto-memoizes and what it doesn't change

> **The question:** "With the React Compiler, do we still need `useMemo`,
> `useCallback` and `memo`?" — and the follow-up that separates people: "So
> what *doesn't* it fix?"

There's no runtime demo for this one: the compiler is a build step and this
project doesn't use it. Instead, every code sample below is **real compiler
output** — `babel-plugin-react-compiler@1.0.0`, run on small components in a
scratch folder (not added to this repo).

---

## 1. What it is

A build-time plugin (Babel) that rewrites your components and hooks so that
values, callbacks and JSX are **cached** and only recomputed when what they
depend on changes. In effect, `useMemo`/`useCallback`/`memo` placed for you,
in finer pieces than you'd write by hand.

- It works on **components and hooks** only (by naming: `PascalCase`
  components, `useX` hooks). A plain `formatPrice()` function is left
  untouched — checked.
- It assumes your code follows the **Rules of React** (pure render, no
  mutating props or state, hooks at the top level). Where it can *see* a rule
  being broken, it skips that component. Where it can't see it — it trusts
  you (section 4).
- Opt a component out with a `"use no memo"` directive.

---

## 2. What the output looks like

Input:

```jsx
export function TodoList({ todos, filter, onToggle }) {
  const visible = todos.filter((t) => t.text.includes(filter));
  const handleClick = (id) => onToggle(id);
  return <List items={visible} onItemClick={handleClick} />;
}
```

Output (trimmed):

```js
export function TodoList(t0) {
  const $ = _c(10);                       // a cache with 10 slots for this component
  const { todos, filter, onToggle } = t0;

  let t1;
  if ($[0] !== filter || $[1] !== todos) { // recompute `visible` only if inputs changed
    t1 = todos.filter(…);
    $[0] = filter; $[1] = todos; $[2] = t1;
  } else t1 = $[2];

  let t2;
  if ($[5] !== onToggle) {                 // a stable handleClick — useCallback, for free
    t2 = (id) => onToggle(id);
    $[5] = onToggle; $[6] = t2;
  } else t2 = $[6];

  let t3;
  if ($[7] !== t2 || $[8] !== t1) {        // the <List> element itself is cached
    t3 = <List items={t1} onItemClick={t2} />;
    …
  } else t3 = $[9];
  return t3;
}
```

Three things to notice:
1. **Each value gets its own check** — finer than one big `useMemo`.
2. **Callbacks are cached** — what `useCallback` did.
3. **The JSX element is cached.** When nothing changed, `TodoList` returns the
   *same element object* as last time, and React skips re-rendering `<List>` —
   **without `memo` on `List`**. That's why "memo everything" stops being
   necessary: the parent stops handing out new elements.

Analogy: a kitchen that keeps each prepared ingredient labelled with the
order it was for. Same order again? Plate what's ready. Only what changed in
the order gets cooked.

---

## 3. What it does for you

| Before (manual) | With the compiler |
| --- | --- |
| `useMemo` for derived values | Automatic, per value |
| `useCallback` for handlers passed down | Automatic |
| `memo(Child)` so parents' re-renders skip it | Mostly unnecessary: the parent returns cached JSX, so React skips the child |
| Inline `style={{…}}` breaking `memo` ([version B](../Memoization/Memoization.md#2-the-four-versions-in-the-demo)) | Cached, so it doesn't break anything |
| A provider's inline value object | Cached when its inputs don't change |

Existing `useMemo`/`useCallback` keep working; the compiler leaves them or
works around them. New code mostly doesn't need them.

---

## 4. What it doesn't change

**It doesn't fix rule-breaking code it can't detect.** Two real results:

```jsx
// Mutates a prop during render. The compiler did NOT spot this —
// it compiled it, and cached <List items={items}> on items' identity.
export function Broken({ items }) {
  items.push({ id: "extra" });
  return <List items={items} />;
}
// Output: items.push runs every render, but the <List> element is reused
// while `items` is the same array — so List never sees the new rows.
```

```jsx
// Reads the clock during render.
export function Clock() {
  const now = Date.now();
  return <p>{now}</p>;
}
// Output: the whole thing is cached on first render with no inputs.
// `now` is frozen at the first value forever, however often Clock re-renders.
```

Without the compiler, both "work" by accident. With it, they break quietly.
**The compiler turns hidden rule violations into visible bugs** — so run its
lint rules (now part of `eslint-plugin-react-hooks`) before turning it on.

**What it does skip** — checked: a component that reads `ref.current` during
render ("Cannot access refs during render") and one that calls a hook inside
an `if` ("Hooks must always be called in a consistent order"). Those are left
uncompiled, exactly as written.

**Things outside its reach:**

| Problem | Why the compiler can't help |
| --- | --- |
| A **context value changes** | Every consumer still re-renders — that's how context works. Split contexts ([ContextPerformance](../ContextPerformance/ContextPerformance.md)). |
| **State too high up** | It skips children whose inputs didn't change, but the owner and everything that *does* use the changing value still re-render. State placement still matters. |
| **Rendering 10,000 rows** | Caching doesn't reduce DOM size. [Virtualise](../VirtualizationDeepDive/VirtualizationDeepDive.md). |
| **A slow calculation with new inputs each time** | Cache size is one: it remembers the *last* inputs only. A different filter each keystroke recomputes each keystroke — `useDeferredValue` or a faster algorithm. |
| **Big bundles, slow network, waterfalls** | Not render problems. [Code splitting](../CodeSplitting/CodeSplitting.md), data loading. |
| **Effects that run too often** | Effect dependencies still need to be right; it doesn't rewrite effects' logic. |
| **Code outside components/hooks** | Utility functions, stores, class components — untouched. |

---

## 5. Adopting it

- **React 19** uses the built-in runtime (`react/compiler-runtime`); React
  17/18 need the `react-compiler-runtime` package.
- Add the Babel plugin through your build tool's React setup (Next.js, Vite,
  Expo have options; check the current docs for yours).
- **Turn on the lint rules first** and fix what they find.
- Roll out gradually — the compiler can be limited to some directories, and
  `"use no memo"` opts out a component that misbehaves while you fix it.
- Confirm in DevTools: compiled components show a "Memo ✨" badge.
- **Measure before and after** with the Profiler
  ([Profiler](../Profiler/Profiler.md)) — interactions that re-rendered large
  trees improve most.

---

## 6. Follow-ups to expect

| They ask | Short answer |
| --- | --- |
| "Delete all our `useMemo`s?" | No need to rush. They still work; remove them when you touch the code. Keep ones that guarantee a stable identity for an effect dependency until you've checked. |
| "Is `memo` dead?" | Mostly unnecessary in compiled code, since parents return cached elements. Still useful for components rendered by uncompiled code (libraries, class components). |
| "Does it make everything faster?" | It removes wasted re-renders. If your slowness is DOM size, network, or a heavy calculation with changing inputs, no. |
| "How is it different from Svelte/Solid compilers?" | Those change how updates work (fine-grained, no re-render of the component). React's compiler keeps the same model — components re-render — and just makes re-renders skip unchanged work. |
| "Why might it break my app?" | Code that mutates during render or reads changing values (clock, random, refs) in render. It was relying on re-running every time; cached, it shows stale output. |

---

## 7. Scoring notes

- **Mid:** "It memoizes everything, so we don't need hooks any more."
- **Senior:** explains it caches values, callbacks and JSX per component with
  dependency checks; that cached JSX is why `memo` becomes unnecessary; that it
  relies on the Rules of React and can *expose* hidden impurity (the frozen
  clock); what it can't fix (context, state placement, DOM size, cache size
  one, network); and how to adopt it safely (lint first, gradual, measure).
