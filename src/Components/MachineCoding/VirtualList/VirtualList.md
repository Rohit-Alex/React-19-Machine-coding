# Windowed / virtualised list

> **The prompt:** "Render a list of 10,000 rows without the page grinding to a
> halt."
>
> The idea fits in one sentence: only mount the rows you can see. The marks are
> in the maths being exactly right, because a virtual list that is off by one
> pixel per row is visibly broken.

Runnable demo: [`VirtualListDemo.tsx`](./VirtualListDemo.tsx) · component:
[`VirtualList.tsx`](./VirtualList.tsx)

---

## 1. Clarify before you code

| Question                                                   | Why it changes your code                                                                                           |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Are all rows the same height?                              | Fixed height = pure arithmetic. Variable height = measuring, caching, and estimating. Different question entirely. |
| Is the container a fixed height, or does it fill the page? | Fixed = a prop. Fluid = measure it with `ResizeObserver`.                                                          |
| Do rows hold state (inputs, expanded panels)?              | Unmounted rows lose their state. It must live above the list.                                                      |
| Does the user need Ctrl+F / find-in-page?                  | It can't find rows that aren't in the DOM. Real product tradeoff.                                                  |
| Horizontal too, or just vertical?                          | Grids virtualise both axes.                                                                                        |

---

## 2. How it works

Three layers:

```
scroll container   height: containerHeight, overflow: auto   ← the window
└─ spacer          height: items.length * itemHeight       ← fakes the scrollbar
   └─ slice        translateY(startIndex * itemHeight)     ← the only real rows
      └─ rows startIndex..endIndex
```

The spacer is an empty div as tall as the whole list would be. The browser
sees a 360,000px-tall child and draws a real scrollbar for it. On each scroll
we work out which rows would be under the window and render only those,
shifted down to where they would have been.

The analogy: a film strip moving past a projector lens. The audience sees one
frame at a time. You don't need to print the whole reel onto the screen — you
only need to know which frame is behind the lens right now.

The index maths:

```ts
const firstVisibleRowIndex = Math.floor(scrollTop / itemHeight);
const visibleCount = Math.ceil(containerHeight / itemHeight) + 1;

const startIndex = Math.max(0, firstVisibleRowIndex - bufferCount);
const endIndex = Math.min(
  items.length,
  firstVisibleRowIndex + visibleCount + bufferCount,
);
```

---

## 3. Review of the first draft

The first draft had the right skeleton — spacer plus one `translateY` wrapper
is exactly what production libraries do. Two choices in it were better than
they look:

- **Moving one wrapper instead of positioning every row.** One `transform` per
  render instead of one `top` per row. Transforms also don't trigger layout.
- **`key={startIndex + index}`.** That's the row's position in the _full_
  list, so a row keeps its key as it scrolls. Using the local `index` here is
  a very common bug — every row would get a new key on every scroll step and
  React would remount the whole slice.

What broke, in order of how visible it is:

### Bug 1 — every row is 1px taller than the maths thinks

```tsx
style={{ height: `${itemHeight}px`, borderBottom: "1px solid #ddd" }}
```

The default `box-sizing` is `content-box`, so `height` is the height of the
_content_, and the border sits outside it. Each row renders at
`itemHeight + 1`. The maths assumes `itemHeight`.

This project sets `border-box` on `#root` only, and `box-sizing` is not
inherited — so the rows are content-box.

The error grows down the slice. The 10th rendered row sits 10px lower than it
should. And every time you scroll past a row boundary, `startIndex` goes up by
one and the whole slice snaps back by that accumulated amount. You see it as a
jitter while scrolling slowly.

**Fix:** `boxSizing: "border-box"` on the row. General rule for this question:
**whatever height you use in the maths must be the exact height on screen.**
Borders, margins, and padding all break that silently.

### Bug 2 — the zebra stripes swap on every row you scroll

```tsx
{visibleItems.map((item, index) => ...
  backgroundColor: index % 2 === 0 ? "#f0f0f0" : "#ffffff"
```

`index` here is the position _in the slice_, not in the list. Scroll down one
row and `startIndex` goes from 5 to 6. Row 6 used to be slice position 1
(white); now it's position 0 (grey). Every visible row flips colour on every
row scrolled.

Same root cause as the key question above — and the draft got the key right
but the stripe wrong. **Fix:** stripe by `startIndex + index`.

### Bug 3 — a gap at the bottom when the buffer is 0

```ts
const visibleItemCount = Math.ceil(containerHeight / itemHeight);
```

When the list is scrolled partway into a row, the window shows a slice of a
row at the top _and_ a slice of a row at the bottom. That's one more row than
`containerHeight / itemHeight`. With a 400px window and 40px rows, scrolled 20px
down, you can see parts of 11 rows, not 10.

The default buffer of 2 hides this, which is why it's easy to miss. Set the
buffer to 0 and there's a blank strip at the bottom. **Fix:** `+ 1`.

### Bug 4 — a re-render on every scroll event

```tsx
onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
```

`scrollTop` changes on every event, so React re-renders on every event — even
though the rendered rows only change when you cross a row boundary. With 36px
rows, that's many wasted renders per row.

**Fix:** store the thing the render actually depends on:

```tsx
onScroll={(e) => setFirstVisibleRowIndex(Math.floor(e.currentTarget.scrollTop / itemHeight))}
```

When the new value equals the old one, React bails out of the re-render.
No throttle, no `requestAnimationFrame`, no extra code — just storing the right
value. This is the ideal answer to "should I throttle this?": make the state
coarse enough that throttling isn't needed.

### Smaller things

- The inner div has a background but no width, so inside a flex row it only
  shrinks to fit the text. The stripe covers the text, not the row.
- `React`, `useRef`, `useEffect`, and `useCallback` are imported and unused.
- `{item}` is rendered directly, so the component only works for strings.
  Taking a `renderItem` and a `getKey` makes it reusable — and `getKey` lets you
  key on an id, which matters as soon as the list can be sorted or filtered.
- No accessibility. See below.

---

## 4. Accessibility

Only a slice of the list exists in the DOM, so a screen reader thinks the list
has 14 items. Two attributes fix the count:

```tsx
<div role="listitem" aria-setsize={items.length} aria-posinset={index + 1}>
```

Now it announces "row 5,001 of 10,000".

Also:

- `tabIndex={0}` on the scroll container so keyboard users can focus it and
  scroll with arrow keys / Page Down.
- **Focus loss is the hard problem.** If a row holds a focused button and you
  scroll it out of the window, it unmounts and focus drops to `<body>`. Real
  libraries either keep the focused row mounted or move focus deliberately.
  In an interview, name it — that alone reads as senior.

---

## 5. Compared with `react-window`

The roadmap asks for the comparison. `react-window` v2's API:

```tsx
import { List, type RowComponentProps } from "react-window";

function RowView({ index, style, rows }: RowComponentProps<{ rows: Row[] }>) {
  return <div style={style}>{rows[index].label}</div>;
}

<List
  rowComponent={RowView}
  rowCount={rows.length}
  rowHeight={36}
  rowProps={{ rows }}
  overscanCount={2}
/>;
```

|                        | This build               | `react-window`                                                                                                                     |
| ---------------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| Positioning            | One `translateY` wrapper | An absolutely-positioned `style` per row — which is why you _must_ spread `style` onto your row. Forgetting it is the classic bug. |
| Buffer                 | `bufferCount`            | `overscanCount`                                                                                                                    |
| Container height       | A prop                   | Measured — the list fills its parent and reports size changes via `onResize`                                                       |
| Visible range callback | `onRangeChange`          | `onRowsRendered`                                                                                                                   |
| Keys                   | `getKey`                 | Index by default, `rowKey` to override                                                                                             |
| Variable heights       | No                       | Yes — a function, or a dynamic cache that measures rows                                                                            |
| Scroll to row N        | No                       | Yes, via `listRef`                                                                                                                 |

What it's worth saying in an interview: the core idea is identical, and the
first 80% is what we just wrote. The last 20% — variable heights, measuring the
container, scroll-to-index, grids — is where a library earns its place. Knowing
where that line is, is the answer to "would you use a library?".

---

## 6. Follow-ups to expect

| They ask                                    | Short answer                                                                                                                                                                                                                                            |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Rows have different heights?"              | Estimate a height for unmeasured rows, measure each row once it mounts (`ResizeObserver`), store heights in a cache, and binary-search the running totals to find `startIndex`. The scrollbar jumps a little as estimates are replaced — that's normal. |
| "Why does fast scrolling show blank space?" | The browser scrolls on its own thread before React has rendered the next rows. The buffer hides it. Bigger buffer = fewer gaps, more DOM.                                                                                                               |
| "Combine with infinite scroll?"             | Use the visible range: when `endIndex` gets near `items.length`, load the next page. `onRangeChange` is exactly the hook for that.                                                                                                                      |
| "Rows with inputs lose what I typed."       | Rows unmount when they leave the window. State has to live in the parent, keyed by id.                                                                                                                                                                  |
| "Can CSS do this?"                          | Partly. `content-visibility: auto` lets the browser skip rendering off-screen content. It still creates every DOM node, though, so it helps paint cost, not memory or React render cost.                                                                |
| "How do you test it?"                       | jsdom has no layout, so `scrollTop` and heights are all 0. Set `scrollTop` manually, fire a scroll event, and assert which rows are in the DOM. Anything visual needs a real browser.                                                                   |

---

## 7. Scoring notes

- **Mid:** gets the spacer + slice idea working for a fixed height. Misses the
  box-sizing drift, re-renders on every scroll event, no accessibility, and
  can't say what changes for variable heights.
- **Senior:** gets the maths exactly right (including the extra partial row),
  keys and stripes by absolute index, stores the row index not `scrollTop`,
  adds `aria-setsize`/`aria-posinset`, names the focus-loss problem, and can
  explain where a library like `react-window` starts to earn its keep.
