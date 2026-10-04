# Diagnosing unnecessary re-renders with the React DevTools Profiler

> **The question:** "This page feels slow. How do you find out why?" The
> wrong answer is "add `useMemo`". The right answer starts with *measuring*:
> what rendered, how long it took, and why.

Runnable demo: [`index.tsx`](./index.tsx) · the page and the log table:
[`ProfiledPage.tsx`](./ProfiledPage.tsx) · `onRender` store:
[`commitLog.ts`](./commitLog.ts)

The DevTools Profiler is a browser extension, so it can't be embedded here.
The demo uses React's **`<Profiler>` component** instead — the same numbers,
readable from code — to show what to look for.

---

## 1. The method

1. **Reproduce** the slow interaction (typing, a click, a timer).
2. **Record** it in the Profiler.
3. **Find the expensive commits** — the tall bars.
4. **Find what rendered in them** and **why**.
5. **Fix the cause** (usually state in the wrong place), then **record
   again** to confirm.

Analogy: a doctor runs tests before prescribing. `useMemo` everywhere is
medicine without a diagnosis — sometimes it helps, often it just has side
effects.

---

## 2. Using the DevTools Profiler

Install React Developer Tools; it adds **Components** and **Profiler** tabs.

| Tool | Where | Shows |
| --- | --- | --- |
| **Highlight updates** | Components tab → ⚙ → "Highlight updates when components render" | Flashes a box around every component as it renders. The fastest way to *see* unnecessary renders — type in an input and watch half the page flash. |
| **Record** | Profiler tab → ⏺ | Captures every commit while you interact. |
| **Commit bar chart** | Top right of the Profiler | One bar per commit; height and colour = how long it took. Click one to inspect it. |
| **Flame chart** | Default view | The tree for that commit. Grey = didn't render (skipped). Coloured = rendered; wider/yellower = slower. |
| **Ranked chart** | Second view | Components of that commit sorted by time — the slowest first. |
| **"Why did this render?"** | Profiler → ⚙ → "Record why each component rendered while profiling" | Per component: "Props changed: (onPick)", "Hook 2 changed", "The parent component rendered". |

The "why" setting is the one most people don't know. "Props changed:
`onSelect`" on a `memo` component means an unstable callback — see
[Memoization](../Memoization/Memoization.md). "The parent component rendered"
on something slow means the state is too high up.

**Profile a production build** for real numbers: development React does
extra checks (and StrictMode renders twice), so everything looks slower.
Production needs the profiling build (`react-dom/profiling`) for the
Profiler to work at all.

---

## 3. `<Profiler>` in code

```tsx
<Profiler id="Page" onRender={(id, phase, actualDuration, baseDuration) => …}>
  <Page />
</Profiler>
```

| Value | Means |
| --- | --- |
| `phase` | `"mount"` (first render) or `"update"` (re-render) |
| **`actualDuration`** | ms spent rendering what actually re-rendered in this commit. Goes down when memo / better state placement skip work. |
| **`baseDuration`** | ms a full re-render of the subtree *would* take with no skipping. A worst-case estimate. |

The gap between them is the work you're already skipping. In the demo,
fixed: `actualDuration` well under 1ms, `baseDuration` ~30ms — the dashboard
is skipped.

**Don't `setState` inside `onRender`.** It runs during React's commit; a
state update there causes another commit, which calls `onRender` again —
forever. The demo writes to a small store outside React and tells the table
a moment later.

Use `<Profiler>` for automated performance checks and for sending real-user
timings to analytics — it's cheap, but it's off in production unless you use
the profiling build.

---

## 4. The demo's bug, and what the Profiler shows

```tsx
const Page = () => {
  const now = useNow();        // ticks every second
  return <><p>🕒 {time}</p><SlowDashboard /></>;   // 30ms, doesn't use the time
};
```

- **Unfixed:** one commit per second, `actualDuration` ~30ms. In DevTools,
  the flame chart shows `SlowDashboard` coloured in every commit, and "why":
  *the parent component rendered*.
- **Fixed** — the clock owns its own state (`<Clock />`): still one commit
  per second, now under 1ms. `SlowDashboard` is grey.

No `memo`, no hooks: moving state down is the fix. Same idea as version D in
[Memoization](../Memoization/Memoization.md#2-the-four-versions-in-the-demo).

---

## 5. What to look for

| Pattern | Likely cause | Fix |
| --- | --- | --- |
| Everything flashes on each keystroke | Input state at the top of the page | Move it down, or `useDeferredValue` for the slow part |
| A `memo` child renders, "props changed: onX" | Inline callback | `useCallback`, or remove the memo |
| All consumers of a context render together | One big context value, or a new value object each render | Split contexts, `useMemo` the value ([ContextPerformance](../ContextPerformance/ContextPerformance.md)) |
| A commit every second | A timer in a high component | Move the timer's state into a small component |
| A huge list in one commit | Rendering thousands of rows | [Virtualise](../VirtualizationDeepDive/VirtualizationDeepDive.md) |
| Cheap renders, but the page still janks | Not React: layout, big images, third-party scripts | Browser Performance panel |

That last row matters: **the React Profiler only sees React's render time.**
Long tasks from layout, painting, or scripts show up in the browser's own
Performance panel. Check there if React's numbers look fine.

---

## 6. Follow-ups to expect

| They ask | Short answer |
| --- | --- |
| "Other tools?" | The browser Performance panel (flame chart of everything, long tasks); Lighthouse / Web Vitals for page-level metrics (INP for interactions); React Scan and why-did-you-render libraries for always-on render highlighting in development. |
| "Measure in production?" | Web Vitals (INP especially) from real users; `<Profiler>` with the profiling build on a sample of traffic; long-task observers. |
| "Is a re-render always bad?" | No. Rendering is cheap for most components, and re-rendering with the same output changes nothing on screen. Only *slow* re-renders that happen *often* matter. |
| "Render vs commit?" | Render = calling components to work out the new tree. Commit = applying the changes to the DOM. A render can produce no DOM changes; it still costs the render time. |

---

## 7. Scoring notes

- **Mid:** "I'd add `useMemo` / `React.memo`" before looking at anything.
- **Senior:** measures first; knows highlight updates, the flame and ranked
  charts, and the "why did this render" setting; reads `actualDuration` vs
  `baseDuration`; fixes the cause (state placement, unstable props, context
  shape) and re-measures; knows to profile production builds and when the
  problem isn't React at all.
