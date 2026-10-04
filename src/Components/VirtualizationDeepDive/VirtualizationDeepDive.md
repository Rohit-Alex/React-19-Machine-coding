# List virtualisation deep dive: rows of different heights

> **The question:** "Your virtual list works with fixed 40px rows. Now the
> rows are chat messages — some one line, some ten. What changes?"
>
> Almost everything. With equal rows, "which row is at 2,000px?" is one
> division. With unequal rows you don't even *know* the heights until the
> rows are on screen — and measuring them moves things under the user.

Runnable demo: [`index.tsx`](./index.tsx) · list:
[`VariableVirtualList.tsx`](./VariableVirtualList.tsx) · position maths:
[`layout.ts`](./layout.ts)

The basics — why virtualise, the spacer + translate structure, buffers,
accessibility, `react-window` — are in the Phase 2 build:
[VirtualList.md](../../MachineCoding/VirtualList/VirtualList.md). This page
is what you add on top.

---

## 1. Fixed vs variable, side by side

| | Fixed height | Variable height |
| --- | --- | --- |
| Row at `y` | `Math.floor(y / rowHeight)` | binary search in a list of row tops |
| Top of row `i` | `i * rowHeight` | `offsets[i]` (sum of heights before it) |
| Total height | `count * rowHeight` | `offsets[count]` |
| Heights known | before rendering | only after a row renders — so you **estimate**, then **measure** |
| Scrolling stays still | free | needs **scroll correction** when rows above change |

---

## 2. Offsets and binary search

```ts
offsets = [0, h0, h0+h1, h0+h1+h2, …]        // offsets[i] = top of row i
findRowAt(y) = last i with offsets[i] <= y   // binary search: O(log n)
```

Unmeasured rows use an **estimate** (64px here). As rows are measured, their
real heights replace the estimate and the offsets are rebuilt.

Checked in Node: heights `[10, 50, 20, 100]` give offsets `0,10,60,80,180`;
`y=9 → row 0`, `y=10 → row 1`, `y=179 → row 3`, beyond the end → last row;
and over 10,000 positions in a 5,000-row list, the binary search matched a
plain linear scan every time.

Rebuilding offsets is O(n) per measurement batch — fine for 10,000 rows. For
millions, keep a tree of sums (a Fenwick tree) so one height change is
O(log n).

Analogy: finding a page in a book where every chapter is a different length.
You can't divide by "pages per chapter"; you use the contents page (the
offsets) and look it up.

---

## 3. Measuring: one `ResizeObserver`

```tsx
const observer = new ResizeObserver((entries) => { … heights[index] = blockSize … });

<div ref={observeRow} data-index={index}>…</div>   // React 19 ref callback with cleanup
```

- **One observer for all rows**, not one per row. Rows tell it which index
  they are with `data-index`.
- It fires when a row first appears **and whenever its height changes** —
  text re-wrapping at a new width (try the Narrow option), an image loading,
  a "show more" expanding. Measuring once with `getBoundingClientRect` on
  mount misses all of those.
- Heights live in a **ref** (thousands of numbers, updated from outside React);
  a `version` number in state says "they changed, re-render".
- React 19's ref callback can **return a cleanup**, so each row unobserves
  itself when it scrolls out and unmounts.

---

## 4. Keeping the reader in place

You're reading message 5,000. Rows above it — the overscan rows — get
measured: estimated 64px, really 120px. Everything below moves down 56px,
including the message you're reading. It jumps.

```ts
if (index < firstVisible) shiftAbove += measured - previous;
…
container.scrollTop += shiftAbove;
```

When a row **above** the first visible one changes height, scroll by the same
amount. The content moves down and the view follows it, so what you see stays
put.

Browsers do this themselves for normal content (*scroll anchoring*), but not
for content positioned with transforms — so it's turned off
(`overflow-anchor: none`) and done by hand.

Analogy: someone inserts pages earlier in the book you're reading. You keep
your finger on your line, not on the page number.

### Jumping to a row

`scrollToIndex(5000)` scrolls to `offsets[4999]`, which is based on
*estimates* for most rows above. It lands close; measuring the rows around it
then corrects the position. Libraries go further and re-check the target
after measuring until it settles.

---

## 5. Chat-specific: start at the bottom

Chat opens at the newest message and loads older ones above:
- start scrolled to the end;
- when older messages are added *above*, add their height to `scrollTop`
  (same correction as section 4) so the view doesn't jump;
- stick to the bottom when new messages arrive only if the user is already
  at the bottom.

CSS `flex-direction: column-reverse` on the scroller gives "starts at bottom"
for free, but makes the maths above run backwards — most libraries handle
chat as a special mode.

---

## 6. The no-JavaScript alternative: `content-visibility`

```css
.row { content-visibility: auto; contain-intrinsic-size: auto 64px; }
```

Every row stays in the DOM, but the browser **skips layout and painting** for
rows off screen. `contain-intrinsic-size` is the placeholder height; `auto`
makes the browser remember the real one after a row has been seen.

| | Virtualise (JS) | `content-visibility` |
| --- | --- | --- |
| DOM nodes | ~20 | all 10,000 |
| React render of all rows | no | **yes** — slow to mount for huge lists |
| Find in page (Ctrl+F) | ❌ (rows don't exist) | ✅ |
| Screen readers see every row | needs `aria-setsize` / `posinset` | ✅ |
| Code | measurement, offsets, correction | two CSS lines |

Use `content-visibility` for long *pages* (articles, settings, a few hundred
rows); virtualise for thousands of rows or endless feeds.

---

## 7. Follow-ups to expect

| They ask | Short answer |
| --- | --- |
| "Use a library?" | Yes in production: TanStack Virtual (`measureElement` + dynamic sizes) or react-virtuoso (variable heights out of the box, groups, prepending older items and following new ones for chat). Build it in the interview to show you know what they do. |
| "Grid / two dimensions?" | Two offset lists (rows and columns); render the rectangle of cells that's visible. |
| "Sticky group headers?" | Keep the current group's header rendered outside the window, positioned sticky; skip it inside. |
| "Smooth scrolling feels janky?" | Render fewer DOM nodes per row, keep rows cheap (memo the row component), increase overscan so fast scrolls don't show blank space, and keep the scroll handler to setting one number. |
| "Images change heights after load." | That's what the observer catches. Better still: give images `width`/`height` attributes or `aspect-ratio`, so they take the right space before loading and nothing moves. |
| "Accessibility?" | Same as fixed: `role="list"`, `aria-setsize`, `aria-posinset`, a focusable scroller; and keep the focused row rendered even when scrolled out. |

---

## 8. Scoring notes

- **Mid:** a fixed-height virtual list; for variable heights, "measure each
  row" without a plan for unknown heights or jumps.
- **Senior:** estimate-then-measure with an offsets list and binary search,
  one `ResizeObserver` with per-row cleanup, scroll correction when rows
  above change, a scroll-to-index that settles, the chat-at-bottom case,
  and knows when `content-visibility` is the simpler answer.
