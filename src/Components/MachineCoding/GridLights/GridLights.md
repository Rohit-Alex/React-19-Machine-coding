# Grid lights

> **The prompt:** "Build a grid of lights. Clicking a cell turns it green.
> When every cell is on, switch them off one by one, in the reverse order they
> were turned on, 300ms apart."
>
> It looks like a styling question. It's really a question about **what to
> store** (the click order) and **how to run a timed sequence** without
> leaking timers or fighting stale state.

Runnable demo: [`GridLights.tsx`](./GridLights.tsx)

---

## 1. Clarify before you code

| Question | Why it changes your code |
| --- | --- |
| Fixed shape, or configurable? | A `CONFIG` grid of 1s and 0s makes the shape data, not code. |
| Can you click a light that's already on to switch it off? | Usually no. If yes, remove it from the order list too. |
| Can you click while they're switching off? | Usually no. Ignore clicks until all are off. |
| First switch-off: straight away, or 300ms after the last click? | After 300ms, so the last light is seen turning green. |
| Should it work with the keyboard? | Yes — use real buttons. See section 5. |

---

## 2. The key idea: store the order, not a set of "on" cells

```ts
const [order, setOrder] = useState<number[]>([]); // e.g. [0, 3, 7, …]
```

- A cell is on if `order.includes(index)`.
- Switching off in reverse is just removing the **last** item, again and again.

The analogy: a stack of plates. You put plates on top as you click; you take
them off the top to undo. A plain set of "on" cells (or a `boolean[]` per
cell) forgets the order, and then reverse order is impossible.

---

## 3. Running the switch-off: one timer at a time, from an effect

```ts
useEffect(() => {
  if (!isDeactivating) return;
  const timeoutId = setTimeout(() => {
    const next = order.slice(0, -1);
    setOrder(next);
    if (next.length === 0) setIsDeactivating(false);
  }, 300);
  return () => clearTimeout(timeoutId);
}, [isDeactivating, order]);
```

Each pop changes `order`, which re-runs the effect and schedules the next
pop. So:

- there is only ever **one** pending timer;
- unmounting (or switching tabs in this app) clears it — no `setState` on a
  gone component;
- the callback reads `order` from this render, which is current because
  `order` is a dependency.

The alternative people reach for is a `setInterval` started in the click
handler. It works, but the interval lives outside React: nothing clears it on
unmount, and it has to stop itself from inside a state updater (see section 4).

---

## 4. Review of the draft

The draft had the right core: an ordered array, popped from the end. These
are the problems, roughly in the order an interviewer would find them.

1. **Clicking the gap pushes cell 0.** The click handler is on the container
   (event delegation). Click the space *between* cells and `e.target` is the
   container, which has no index attribute: `getAttribute` returns `null`, and
   `+null` is `0`. Cell 0 turns green without being clicked. Fix: put
   `onClick` on each cell. With eight cells, delegation saves nothing.
2. **Clicking the same cell twice counts twice.** Nothing stops duplicates,
   so clicking one cell five times fills the count and starts the switch-off
   with most cells still white. Fix: ignore `order.includes(index)`.
3. **Clicks during the switch-off are accepted.** You can add cells back while
   they're being removed, and fill the grid again — which starts a **second**
   interval running alongside the first. Fix: ignore clicks while
   `isDeactivating`.
4. **The finish check uses the old state.** `length - 1 === clickedBoxes.length`
   works out the *new* length by hand from the *old* state. Build `next` first,
   then check `next.length === LIGHT_COUNT`. It reads like the rule, and can't
   be off by one.
5. **`clearInterval` inside the state updater.** Updaters must be pure — React
   may call them twice in development (StrictMode does). Here a second
   `clearInterval` is harmless, but a side effect inside an updater is the
   thing interviewers look for.
6. **The interval is never cleared on unmount.** Leave the page mid-sequence and
   it keeps calling `setState` on a component that's gone.
7. **1000ms, not 300ms.** Pull the number into a named constant.
8. **`aria-element-index` isn't a real attribute.** `aria-*` names are a fixed
   list for assistive technology; made-up ones are invalid. For your own data,
   use `data-index` and read `e.currentTarget.dataset.index`.
9. **Divs aren't clickable for keyboard users.** See section 5.

What carried over: the order-as-stack idea, and describing the shape as data
(the draft's `alphabetIndexMapping`; here a `CONFIG` grid you can read at a
glance).

---

## 5. Accessibility

- **Each light is a `<button>`.** Tab reaches it, Enter and Space press it, for
  free. A clickable `<div>` needs `role`, `tabIndex`, and key handlers to
  match.
- **`aria-pressed`** tells a screen reader whether the light is on — the colour
  alone tells it nothing.
- **`aria-label="Light 3"`**: an empty button has no name otherwise.
- **The gap is a plain `<div>`**, not a hidden button, so it's skipped by Tab.
- **One status line** (`aria-live="polite"`): "3 of 8 on", then
  "Switching off…". Don't make every cell a live region.
- Clicks on a light that's on, or during the switch-off, are ignored rather
  than `disabled`. Disabling the button you just pressed drops keyboard focus
  to the page body.

---

## 6. Follow-ups to expect

| They ask | Short answer |
| --- | --- |
| "Make the grid any size / shape." | Already data: change `CONFIG`. Columns come from `CONFIG[0].length`. |
| "Let me click a light again to turn it off." | Remove it from `order` with `filter`. The reverse sequence still works on what's left. |
| "Reset button / cancel mid-sequence." | `setOrder([])` and `setIsDeactivating(false)`. The effect cleanup kills the pending timer. |
| "Why not `setInterval`?" | It can work, but it lives outside React, needs manual cleanup, and has to stop itself from inside an updater. The effect version has one timer, tied to state, cleaned up for free. |
| "`order.includes` is O(n) per cell." | With n cells that's O(n²) per render — nothing at 9 cells. For big grids, keep a `Set` alongside the array, or store each cell's position in the order. |
| "Animate the switch-off." | A CSS `transition: background 200ms` on the button. No JS. |

---

## 7. Scoring notes

- **Mid:** a working grid with a `setInterval` switch-off. Usually misses
  duplicate clicks, clicks during the switch-off, and cleanup.
- **Senior:** stores the click order as the state, guards duplicate and
  mid-sequence clicks, runs the sequence as one timer at a time from an effect
  with cleanup, keeps updaters pure, uses buttons with `aria-pressed`, and
  treats the grid shape as data.
