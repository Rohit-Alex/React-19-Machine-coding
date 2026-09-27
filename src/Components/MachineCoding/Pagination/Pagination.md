# Pagination (client-side and server-side)

> **The prompt:** "Show this list 10 items at a time, with page numbers."
>
> The page-number row is a small algorithm question on its own. The rest of
> the marks come from state that goes out of sync: the page you're on no
> longer exists, or an old response lands on top of a new one.

Runnable demos: [`ClientPagination.tsx`](./ClientPagination.tsx) ·
[`ServerPagination.tsx`](./ServerPagination.tsx) · page buttons:
[`Pagination.tsx`](./Pagination.tsx) · range algorithm:
[`getPageRange.ts`](./getPageRange.ts)

---

## 1. Clarify before you code

| Question | Why it changes your code |
| --- | --- |
| How many rows in total — hundreds or millions? | A few hundred: fetch once, paginate in the browser. More: the server has to do it. |
| Can the data change while the user is paging? | With page numbers, new rows shift everything along. See section 6. |
| Should the page be in the URL? | Almost always yes in a real product — refresh, back button, and share links all depend on it. |
| Is there sorting or filtering? | Changing either one must reset you to page 1. |
| Page numbers, or just Previous / Next? | "Page 7 of 40" needs a total count, which can be expensive for the server. Previous / Next doesn't. |

---

## 2. Client-side or server-side?

| | Client-side | Server-side |
| --- | --- | --- |
| What you fetch | Everything, once | One page per request |
| Changing page | Instant — it's `array.slice` | A network round trip |
| Search / sort | In the browser, over all rows | Must be sent to the server as query params |
| Breaks down when | The full list is too big to download | Never, but every click costs a request |
| The total count | `items.length` | The server must send it |

The analogy: client-side is buying the whole book and flipping pages yourself.
Server-side is a library that hands you one chapter at a time. Flipping is
instant with the book, but you can't carry an encyclopedia home.

The page-number component doesn't care which one you use. It only needs
`currentPage`, `totalPages`, and `onPageChange`. That split — dumb page
buttons, data logic outside — is what lets both demos share
[`Pagination.tsx`](./Pagination.tsx).

---

## 3. The page-number row

With 20 pages you can't show 20 buttons. The usual layout is:

```
1 2 3 4 5 … 20        near the start
1 … 9 10 11 … 20      in the middle
1 … 16 17 18 19 20    near the end
```

Always the first page, always the last, the current page with one neighbour
each side, and `…` where pages are hidden.

The detail that shows care: **the number of slots never changes** (7 here).
Near the start, the missing left `…` is spent on extra page numbers instead.
If the row changed width as you clicked, the Next button would move out from
under your mouse, and double-clicking "next" would land on something else.

```ts
const totalSlots = 2 * siblingCount + 5; // first, last, current, 2 gaps

const leftSibling = Math.max(currentPage - siblingCount, 1);
const rightSibling = Math.min(currentPage + siblingCount, totalPages);

// A gap must hide at least two pages.
const showLeftGap = leftSibling > 3;
const showRightGap = rightSibling < totalPages - 2;
```

Full version in [`getPageRange.ts`](./getPageRange.ts). Output for 19 pages:

```
page 1:   1 2 3 4 5 … 19
page 4:   1 2 3 4 5 … 19
page 5:   1 … 4 5 6 … 19
page 10:  1 … 9 10 11 … 19
page 15:  1 … 14 15 16 … 19
page 16:  1 … 15 16 17 18 19
```

### Why "at least two pages"

A `…` takes up a slot, the same as a page button. If it only stands in for one
page, it saves no space — it just hides a page for no reason.

Page 4 is where this shows. Its left neighbour is page 3, so the only page
between "1" and "3" is page 2. A gap there would read `1 … 3 4 5`, which hides
page 2 behind a `…` that is exactly as wide as a "2" button. So page 4 uses the
near-the-start layout instead: `1 2 3 4 5 … 19`.

That's why the checks are `> 3` and `< totalPages - 2`. Writing `> 2` and
`< totalPages - 1` is an easy off-by-one to make, and it produces exactly this
bug. It only shows on two specific pages near each end, so it's easy to miss
if you only click page 1 and a page in the middle.

The slot count still stays fixed: using the near-the-start layout on page 4
costs the same 7 slots as the middle layout would have.

Two small React details in [`Pagination.tsx`](./Pagination.tsx):

- There can be two `…` items, so they can't share a key. They use their
  position: `gap-1`, `gap-5`.
- The component returns `null` when there's only one page. A row with just
  "1" in it is noise.

---

## 4. Client-side: the "empty page 8" bug

You're on page 8. You type in the search box. Only 12 rows match, so there
are 2 pages now — and you're still on page 8, looking at nothing.

The fix is to go back to page 1 **in the change handler**:

```tsx
onChange={(event) => {
  setQuery(event.target.value);
  setPage(1);
}}
```

Not in an effect like `useEffect(() => setPage(1), [query])`. The effect runs
*after* React has already rendered and painted with the old page number, so
the user sees an empty page for one frame, then it fixes itself. Doing it in
the handler means both updates land in the same render.

As a second safety net, the render clamps anyway:

```ts
const currentPage = Math.min(page, totalPages);
```

Any path that shrinks the list — a filter, a delete, new data — now lands on
the last real page instead of an empty one.

### Changing the page size

Going from 10 per page to 25 while on page 5: which page should you land on?
Page 1 throws away the user's place. Page 5 is now rows 101–125, which don't
exist. The kind answer is to keep the first row you were looking at on screen:

```ts
const firstRow = (currentPage - 1) * pageSize;   // 40 on page 5 of 10
const newPage = Math.floor(firstRow / newSize) + 1; // page 2 of 25 (rows 26–50)
```

Most candidates don't think about this. It's one line.

---

## 5. Server-side: two things that go wrong

### Old responses overwriting new ones

Click page 2, then page 3 before page 2 has loaded. Two requests are in
flight. If page 2's response comes back last, it overwrites page 3 — you're on
"page 3" looking at page 2's rows.

The effect's cleanup marks the old request as stale:

```tsx
useEffect(() => {
  let ignore = false;
  fetchProducts(page, pageSize).then((result) => {
    if (!ignore) setData(result);
  });
  return () => { ignore = true; };
}, [page, pageSize]);
```

When `page` changes, React runs the cleanup for the old effect before starting
the new one. The old request still finishes, but its result is thrown away.
This is the same race as the debounced search question — pagination is just
another place it shows up.

### The blank flash

The naive version clears the list when a request starts:

```tsx
setData(null); // don't
```

Every page click now shows an empty box for half a second, the page height
collapses, the pagination bar jumps up the screen, and then everything jumps
back down. It feels broken even though it isn't.

Instead, keep showing the old page — dimmed, with `aria-busy` — until the new
one arrives. The height never changes and the buttons stay where they were.
TanStack Query calls this `placeholderData: keepPreviousData`, and it's the
default a user expects.

---

## 6. Page numbers vs cursors

Page numbers mean `OFFSET` on the server: "skip 20, take 10". If a new row is
added at the top while you're on page 2, everything shifts along by one, and
page 3 starts with the row you just saw at the end of page 2.

For a live feed, use cursors instead — "give me 10 rows after this one". The
infinite scroll question covers why in detail. The tradeoff: a cursor can only
go forward and back. You can't jump straight to page 7, and you can't show
"page 7 of 40".

So: page numbers for tables that people navigate (admin panels, search
results, orders). Cursors for feeds.

---

## 7. Accessibility

- Wrap the buttons in `<nav aria-label="Pagination">` so screen reader users
  can jump straight to it.
- Mark the current page with `aria-current="page"`, not just bold text.
- Give page buttons a label: "Page 5", not just "5". Previous / Next arrows need
  one too, because "‹" means nothing when read aloud.
- Disable Previous on page 1 and Next on the last page.
- Hide the `…` from screen readers (`aria-hidden`). It's decoration.
- Announce "Showing 11–20 of 95" in an `aria-live` region so the page change
  is heard, not just seen.
- After changing page, consider moving focus (or scrolling) to the top of the
  list. Otherwise a keyboard user is left at the bottom of the new page.

---

## 8. Follow-ups to expect

| They ask | Short answer |
| --- | --- |
| "Put the page in the URL." | Read `?page=` from `URLSearchParams` as the initial state, and write it back with `history.pushState` on change so the back button works. With a router, use its search-params hook. |
| "Make the next page instant." | Prefetch page `n + 1` in the background once page `n` has loaded, and cache pages by `page + pageSize`. |
| "What if the server's total shrinks and you're past the end?" | Clamp to the last page, as in the client version. Don't show an empty page. |
| "The count query is slow on a huge table." | Drop the total and use Previous / Next only, or show "1,000+" as an estimate. |
| "Pagination or infinite scroll?" | Pagination when people need to find their place again, compare, or reach a footer. Infinite scroll for feeds. |
| "How do you test it?" | `getPageRange` is a pure function — test it with a table of inputs. For the component, click page 2, then 3, resolve the requests out of order, and check page 3's rows are shown. |

---

## 9. Scoring notes

- **Mid:** slices the array, shows every page number as a button, disables
  Previous / Next at the edges. Leaves you on an empty page after filtering,
  blanks the list on every server request, and has the out-of-order bug.
- **Senior:** writes the fixed-width `…` algorithm, resets the page in the
  handler (not an effect), keeps the old page on screen while loading, cancels
  stale responses, keeps the user's place when page size changes, and knows
  when to switch to cursors.
