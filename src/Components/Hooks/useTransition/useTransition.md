# `useTransition`

> Source: [react.dev/reference/react/useTransition](https://react.dev/reference/react/useTransition) — verified against React 19 docs.

`useTransition` lets you mark a state update as a low-priority
**Transition** instead of an urgent update. React can interrupt/delay
Transition work in favor of urgent work (typing, clicks), and exposes
`isPending` so you can show a pending indicator instead of freezing the UI
until the update finishes.

```tsx
const [isPending, startTransition] = useTransition();
```

Two live demos: [`TabSwitchTransition.tsx`](./useTransition/TabSwitchTransition.tsx)
(the canonical pending-tab-switch example — two checkboxes: toggle the
transition on/off, and toggle **sliced** to switch the same 300ms of work
between 300 fibers and 1 fiber, which is where the interesting lesson is) and
[`ResponsiveFilter.tsx`](./useTransition/ResponsiveFilter.tsx) (the
most commonly asked variant: keep a search input responsive while a large
list filters in the background). Everything else below is conceptual.

---

## Signature

```tsx
const [isPending, startTransition] = useTransition();
```

Takes **no parameters**.

### Returns

An array of exactly two values:

1. **`isPending`** — `true` from the moment `startTransition` is called
   until every state update inside it has committed.
2. **`startTransition(action)`** — call with a function; any `set` calls
   made **synchronously inside** that function are marked as part of the
   Transition. Has a stable identity — safe to omit from `useEffect` deps
   (same as `useReducer`'s `dispatch`, see [`useReducer.md`](./useReducer.md#parameters)).

### `startTransition(action)`

| Parameter | Description                                                                                                                                                                                                          |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `action`  | A function React calls **immediately and synchronously** — it is not deferred like `setTimeout`. Functions passed here are called "Actions." Any `set` call executed synchronously inside it is marked low-priority. |

No return value.

---

## Rules

- **Hook — top level only**, inside a component or custom Hook. Outside a
  component (e.g. in a data library), use the standalone `startTransition`
  import instead — it has the same scheduling behavior but no `isPending`.
- **Needs direct access to the `set` function.** If you only have a
  derived/prop value (not the setter itself), reach for `useDeferredValue`
  instead — different hook, same underlying goal, no dedicated demo here
  since that hook gets its own writeup.
- **Cannot be used for controlled text inputs.** The input's own state must
  stay synchronous or typing feels laggy/dropped — see
  [`ResponsiveFilter.tsx`](./useTransition/ResponsiveFilter.tsx) for the
  fix (two state variables, only one wrapped in the transition).

---

## Caveats

- **The Action runs immediately, not later.** `startTransition(() => {...})`
  executes its callback synchronously in the current call stack — it just
  marks the resulting `set` calls as interruptible/low-priority. It is not
  a `setTimeout`.
- **`set` calls inside a `setTimeout`, or after an un-wrapped `await`, are
  NOT marked as part of the Transition** — only synchronous calls made
  directly inside the Action are tracked. This is a known JS-limitation
  gotcha:

  ```tsx
  // ❌ not a Transition — setTimeout breaks the synchronous scope
  startTransition(() => {
    setTimeout(() => setPage("/about"), 1000);
  });

  // ✅ correct — wrap after the delay, not before it
  setTimeout(() => {
    startTransition(() => setPage("/about"));
  }, 1000);

  // ❌ the update after await is not marked
  startTransition(async () => {
    const result = await fetchThing();
    setPage(result); // NOT part of the transition
  });

  // ✅ re-wrap after every await
  startTransition(async () => {
    const result = await fetchThing();
    startTransition(() => setPage(result)); // now marked
  });
  ```

- **Transitions are interruptible.** If something urgent (e.g. another
  keystroke) happens while a Transition is still rendering, React can drop
  the in-progress work and restart with the newer state — this is _why_
  it's safe to use for expensive derived UI.

- **⚠️ Transition state is STALE while pending — never drive interactive
  affordances off it.** This is the highest-value gotcha here, and it was
  measured in the browser, not theorised. `tab` keeps its **old** value for
  the entire time the Transition is rendering, so this looks right and is
  badly broken:

  ```tsx
  // ❌ `tab` is still "about" for the whole ~600ms posts render,
  //    so the about button stays disabled and the user CANNOT click back.
  <button onClick={() => selectTab("about")} disabled={tab === "about"}>about</button>
  <button onClick={() => selectTab("posts")} disabled={tab === "posts"}>posts</button>
  ```

  Sequence: you're on `about` → click `posts` → Transition starts, but
  `tab` stays `"about"` until it commits → the about button stays
  **disabled** for the whole render → your click to go back is silently
  swallowed → posts commits and wins. It reads as "I clicked the fast tab,
  it ignored me, and the slow tab kept loading."

  Fix: keep a **second, urgent** state for anything the user interacts with
  (`disabled`, active highlight, `aria-selected`), and leave only the
  expensive render on the Transition state:

  ```tsx
  const [tab, setTab] = useState("about");             // Transition — lags
  const [targetTab, setTargetTab] = useState("about"); // urgent — drives UI

  const selectTab = (next) => {
    setTargetTab(next);                        // immediate
    startTransition(() => setTab(next));       // deferred
  };
  // disabled={targetTab === "about"}
  ```

  These are **separate** state variables, so each stays single-priority.
  Measured after the fix: the interrupting click registers, the in-flight
  Transition is abandoned in **~1ms**, and the slow tab never commits. See
  [`TabSwitchTransition.tsx`](./useTransition/TabSwitchTransition.tsx).

- **A cheap update does _not_ need to be urgent to feel instant.** A
  natural instinct is "switching to the cheap tab should be normal
  priority, why defer it?" Measured: routing it through `startTransition`
  preempts the in-flight Transition and settles in ~1ms. Keeping every
  update to one state variable at the same priority also avoids mixing
  lanes on it — when an update is skipped because it belongs to a lane the
  current render isn't processing, React preserves it *and every update
  queued after it* for a later pass, which can replay a value you thought
  you'd moved past.

- **Time-slicing yields _between_ components, never inside one.** A
  Transition can only be interrupted at fiber boundaries. `300` components
  costing 1ms each stays responsive; **one** component costing 300ms blocks
  the main thread solid regardless of priority — measured, the interrupting
  click was dispatched in ~1ms vs ~500ms. If a single component's render is
  the bottleneck, `useTransition` will not save you. Full explanation with
  fiber trees and numbers:
  [Deep dive](#deep-dive-why-starttransition-sometimes-does-nothing-fiber-level).
- **An interrupted Transition is discarded, never partially committed.**
  React throws away the entire work-in-progress tree and restarts — whether
  it had built 3 fibers or 250. See the deep dive below.
- **Multiple simultaneous Transitions are currently batched together**
  (may change in future React versions).
- **Errors thrown inside a Transition are caught by the nearest
  `ErrorBoundary`** above it — same as errors thrown during a normal
  render. (Error Boundaries get their own writeup later in the roadmap —
  not demoed here.)

---

## Deep dive: why `startTransition` sometimes does nothing (Fiber level)

This is the highest-leverage thing to be able to explain out loud. Both
versions below live in
[`TabSwitchTransition.tsx`](./useTransition/TabSwitchTransition.tsx) behind
the **sliced** checkbox. They do **the same 300ms of work**, both wrapped in
`startTransition`. One stays responsive, one freezes the page.

### The two fiber trees

**Version A — 300 fibers × 1ms**

```tsx
function SlowPost({ index }) {
  burn(1);                                  // 1ms per fiber
  return <li>Post #{index + 1}</li>;
}
function PostsTab() {
  return <ul>{Array.from({length: 300}, (_, i) => <SlowPost key={i} index={i} />)}</ul>;
}
```

```
PostsTab ─ SlowPost#1 ─ SlowPost#2 ─ … ─ SlowPost#300
           └ 1ms ──────┘ 1ms         …    1ms
```

**Version B — 1 fiber × 300ms**

```tsx
function PostsTab() {
  burn(300);                                // 300ms inside ONE fiber
  return <ul>{Array.from({length: 300}, (_, i) => <li key={i}>Post #{i + 1}</li>)}</ul>;
}
```

```
PostsTab   ← one fiber, 300ms of synchronous work inside it
```

### Where React actually checks whether to yield

React renders by calling `performUnitOfWork()` once per fiber, in a loop:

```js
while (workInProgress !== null && !shouldYield()) {
  performUnitOfWork(workInProgress);
}
```

`shouldYield()` is consulted **between** `performUnitOfWork` calls — never
inside one. There is no preemption, no interrupt, no way for React to claw
back control from a component's render function once it has started. That
single fact explains everything:

- **Version A** has 300 checkpoints. React burns ~5ms of frame budget,
  `shouldYield()` returns `true`, it stops mid-list, hands the thread back to
  the browser, and resumes on the next scheduler tick. The 300ms becomes
  dozens of small slices.
- **Version B** has **one** checkpoint, at the end. `performUnitOfWork(PostsTab)`
  does not return for 300ms, so `shouldYield()` isn't called for 300ms. The
  main thread is blocked solid — functionally identical to not using
  `startTransition` at all, even though the code says `startTransition`.

> **Interruptibility is a property of how many fibers the work is split
> across, not of whether you wrapped the update in `startTransition`.**
> `startTransition` only affects scheduling decisions React makes *at fiber
> boundaries*. It has no power inside a single fiber's render function.

### What happens when you interrupt

Setup: you're on `about`, you click `posts (slow)`, then you click `about`
again. The `about` click fires an **urgent** `setTargetTab` (a click handler
runs at discrete/sync priority) plus a newer transition `setTab("about")`.

**Case 1 — you don't interrupt.** React pauses and resumes dozens of times,
but it only **commits the completed tree at the end**. You see nothing until
all 300 `<li>`s appear at once. Pausing frees the main thread; it is *not* a
progressive reveal. There is no such thing as a half-painted Transition.

**Case 2 — you click `about` early (t ≈ 3ms, during fiber #3).** React
finishes fiber #3 — it always completes the unit of work it's inside — then
at the next `shouldYield()` checkpoint notices higher-priority work is
pending. It **throws away the entire work-in-progress tree**. Fibers 1–3 are
discarded, not parked for later. React restarts from the root at the urgent
priority, and `about` commits immediately. The newer `setTab("about")` also
supersedes the older `setTab("posts")`, so posts never renders again — a
later switch back starts fresh from fiber #1. Wasted: ~3ms.

**Case 3 — you click `about` late (t ≈ 250ms, ~250 of 300 fibers built).**
*Exactly the same mechanism.* Finish the current fiber → check at the next
boundary → discard the **whole** WIP tree → render `about` immediately.
React never partially commits, so 250ms of completed work is thrown away just
as readily as 3ms of it.

The symmetry is the point: **early and late interruption differ only in how
much invisible work is wasted.** The UX is identical, because none of that
work was ever committed.

**Version B — none of this can happen.** There is no fiber boundary anywhere
inside the 300ms. `shouldYield()` isn't called until the render function
returns. A click at t=3ms and a click at t=250ms are both simply *not
processed* until the full 300ms finishes — the browser can't even dispatch
the event. And the punchline: React then discards the completed tree anyway.
You pay 100% of the cost, block the thread for all of it, and commit nothing.
Worst of both worlds.

### Measured

Numbers from the live demo (dev build, StrictMode on, so every render is
double-invoked and the 300ms of work measures as ~600ms):

|                                          | A — 300 fibers × 1ms | B — 1 fiber × 300ms |
| ---------------------------------------- | -------------------- | ------------------- |
| Longest main-thread block                | 23–82ms (many slices) | **620ms (one block)** |
| Interrupting click dispatched after      | **0.3–6ms**          | **371–608ms**       |
| Work units burned before the interrupt   | 0–166 of 600         | 600 of 600 (all)    |
| Posts ever committed after interrupting  | no                   | no                  |

Read the second row as the user-facing metric: in A the button responds
essentially instantly no matter when you click; in B your click sits in the
queue for up to 0.6s. The third row is the wasted work — and note B wastes
*all* of it.

Caveats on these numbers: it's a dev build with StrictMode, and the
measurement harness contends for the same task queue, so absolute slice sizes
are noisy and inflated. The *order of magnitude* between the two columns is
what's reproducible, and it's ~100×.

### The other trade-off

Slicing isn't free. Same total work, measured end-to-end: **A committed at
~1.6s, B at ~0.7s.** Yielding ~60 times costs real throughput. You are
deliberately trading total completion time for a main thread that stays
available. That's usually the right trade for user-facing work — but it is a
trade, and saying so out loud is a good interview answer.

### If a single component is the bottleneck

`useTransition` will not save you. Your options are to split the render into
more components (more fibers = more checkpoints), `memo` the expensive
subtree so it doesn't re-render at all, move the work off the render path
entirely (`useMemo`, a worker, precomputation), or virtualize the list.

---

## Usage scenarios worth knowing

### 1. Non-blocking updates with a pending indicator

Wrap an expensive state update (e.g. switching to a tab whose content is
slow to render) in `startTransition` and use `isPending` to show a spinner
instead of freezing the whole page until the render finishes. See
[`TabSwitchTransition.tsx`](./useTransition/TabSwitchTransition.tsx).

### 2. Keeping an input responsive while driving expensive derived UI

The pattern interviewers actually ask for: a search box over a large list.
Keep the input's own displayed value in **synchronous** state (so keystrokes
never lag), and drive the expensive filtered-list render off a **second**
state variable set inside `startTransition`. See
[`ResponsiveFilter.tsx`](./useTransition/ResponsiveFilter.tsx). (This is
one of two ways to solve this problem — `useDeferredValue` solves the same
problem when you don't control the setter directly, e.g. the value arrives
as a prop.)

### 3. Suspense-aware navigation (conceptual only)

Wrapping a router's `setPage` call in `startTransition` means Transitions
wait for **already-revealed** content and any newly-suspended
`<Suspense>` boundaries below it don't flash a fallback — the triggering
component (e.g. a nav link) shows its own `isPending` state instead. Ties
directly into `Suspense`, which is covered later in the roadmap (Phase 5)
— conceptual only here, no dedicated demo.

---

## `useTransition` vs. standalone `startTransition`

|                       | `useTransition` (Hook)          | standalone `startTransition` (from `"react"`)                                                            |
| --------------------- | ------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Callable from         | Only components/custom Hooks    | Anywhere, including non-React code                                                                       |
| Gives you `isPending` | Yes                             | No                                                                                                       |
| Use when              | You need a pending UI indicator | You're starting a Transition from outside a component (e.g. a data library) and don't need pending state |

---

## Troubleshooting (from the docs)

| Symptom                                                        | Cause                                                                      | Fix                                                                                                                                                  |
| -------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Typing in an input feels laggy/drops characters                | The input's own value is being driven by Transition state                  | Keep the input's displayed value in plain synchronous state; drive only the expensive derived UI through the transition (or use `useDeferredValue`). |
| Typing still freezes even though the input value is synchronous | The expensive child isn't `memo`-wrapped, so the *synchronous* re-render (from the input's own state) reruns it anyway — blocking, non-interruptible | Wrap the expensive child in `memo` so the sync pass bails out and only the Transition pass re-renders it. See [`ResponsiveFilter.tsx`](./useTransition/ResponsiveFilter.tsx). |
| Clicking a cheap tab appears to do nothing / the slow tab keeps rendering | A button's `disabled` (or highlight) is driven by Transition state, which is stale while pending — so the button is disabled exactly when you need it and the click is swallowed | Drive affordances off a separate urgent state variable; keep only the expensive render on the Transition state. |
| Wrapped in `startTransition` but the page still freezes solid | The expensive work lives inside **one** component's render, so there is no fiber boundary for React to yield at | Split it into more components, `memo` it, or move the work off the render path. See the [fiber deep dive](#deep-dive-why-starttransition-sometimes-does-nothing-fiber-level). |
| Update isn't being treated as a Transition                     | `set` was called inside `setTimeout`, or after an un-wrapped `await`       | Move the `set` call so it's directly, synchronously inside the `startTransition` callback — re-wrap after every `await`.                             |
| `useTransition` called outside a component                     | It's a Hook — same top-level-only rule as every other hook                 | Use the standalone `startTransition` import instead (loses `isPending`).                                                                             |
| State updates appear out of order for concurrent async Actions | React can't guarantee ordering across async boundaries inside a Transition | For robust ordering, prefer `useActionState` or `<form>` actions (covered later in the roadmap) over hand-rolled async Transitions.                  |
