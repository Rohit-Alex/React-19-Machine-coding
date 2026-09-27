# Infinite scroll list

> **The prompt:** "Load more items automatically when the user scrolls to the
> bottom."
>
> Reaching for `IntersectionObserver` gets you past the first minute. The rest
> of the interview is about pagination shape, not firing the same request
> twice, and whether anyone who is not using a mouse can reach the end of your
> list.

Runnable demo: [`InfiniteFeed.tsx`](./InfiniteFeed.tsx) · hook:
[`useInfiniteList.ts`](./useInfiniteList.ts) · mock backend:
[`feedApi.ts`](./feedApi.ts)

Reused: [`useIntersectionObserver`](../../Hooks/useIntersectionObserver/useIntersectionObserver.ts).

---

## 1. Clarify before you code

| Question | Why it changes your code |
| --- | --- |
| Is the API cursor-based or offset-based? | Decides whether duplicates are possible at all. See below — this is the big one. |
| Can items be inserted or deleted while the user is scrolling? | A live feed breaks offset pagination outright. |
| Do we ever need to jump to "page 7", or link to a position? | If yes, infinite scroll is the wrong pattern; you want pagination. |
| Does the user need to reach a footer? | Infinite scroll makes footers unreachable. Real product constraint, not a nitpick. |
| How many items in total — hundreds or hundreds of thousands? | Past a few thousand DOM nodes you need virtualisation too. |

---

## 2. Cursor pagination, not `?page=2`

This is the answer that marks you as having shipped one of these.

With offset pagination (`LIMIT 12 OFFSET 24`) the server counts from the start
every time. If anything is inserted or deleted above your position between two
requests, the window shifts underneath you:

- Someone posts a new item while you're reading → everything slides down one
  → the first item of page 3 is the one you already saw at the end of page 2.
  **A duplicate.**
- Something gets deleted → everything slides up one → one item is never
  returned by any page. **A silent gap.**

Cursor (keyset) pagination asks a different question: "give me the 12 items
*after this one*". The anchor is a row, not a position, so inserts and deletes
elsewhere can't move it.

```
offset: "skip 24, take 12"      - depends on everything before it
cursor: "after item_23, take 12" - depends on nothing but item_23
```

The analogy: offset pagination is a bookmark that says "page 200". Cursor
pagination is one physically wedged between two pages. Re-typeset the book and
only one of them still points at the sentence you were reading.

A real cursor encodes the sort key of the last row — usually
`base64(created_at + id)` — so it's opaque and clients can't do arithmetic on
it. [`feedApi.ts`](./feedApi.ts) uses a toy `c_<index>` cursor because the data
is a fixed array, but the contract is the same: **the server tells you where
to resume, you never compute it.**

If the interviewer hands you an offset API, say what it costs and dedupe by id
on the client as mitigation. Don't pretend the problem isn't there.

---

## 3. Not fetching the same page twice

The observer will happily fire several times before React has re-rendered —
during fast scrolling, on re-observation, and twice on mount under StrictMode
in development. Guard with state and you lose:

```ts
// Broken: both calls read the same stale `isLoading === false`.
if (isLoading) return;
setIsLoading(true);
```

`setIsLoading(true)` does not change `isLoading` in the current closure, and
React batches the re-render. Two calls that arrive in the same tick both pass
the check.

The fix is a ref, because a ref mutates synchronously:

```ts
const loadingRef = useRef(false);

if (loadingRef.current) return;
loadingRef.current = true;   // visible to the very next call
setIsLoading(true);          // for rendering only
```

The state is for the UI; the ref is for the decision. Keeping both and knowing
which is which is the point. The cursor lives in a ref for the same reason:
`loadMore` reads it at call time, so it never needs to be recreated.

The same guard makes StrictMode's double-invoked effect harmless: the second
call sees `loadingRef.current === true` and returns. That is the right way to
handle StrictMode generally. Don't disable it; make the effect safe to run
twice.

**Reset while a request is in flight.** The old response still arrives, 100ms
later, and would append page 1 of the old list onto the new one. A request id
fixes it: `reset()` bumps a counter, and a response whose id no longer matches
is dropped. Think of it as a ticket number at a deli counter. Once the counter
moves on, an old ticket gets nothing.

---

## 4. `rootMargin` — load before the user arrives

```ts
useIntersectionObserver({ root: rootEl, rootMargin: "100px" })
```

With no margin the fetch starts when the sentinel is already on screen, so
every page ends in a visible spinner. `rootMargin` inflates the observer's
box, so the sentinel "intersects" while it's still below the fold and the next
page is usually there before the user reaches it.

Too large and you fetch pages nobody looks at. A margin of roughly one
viewport is a sane default.

Note the demo passes `root` as **state, not a ref** — `setRootEl` as a callback
ref. `ref.current` is null during the render that sets up the observer, so
reading it there would silently observe against the viewport instead of the
scroll container.

---

## 5. Accessibility: keep a real button

Infinite scroll is genuinely hostile to some users, and interviewers who care
about a11y will probe this:

- There is no keyboard equivalent of "scroll to the bottom to reveal more".
- A footer below an infinite list can never be reached — the list keeps
  growing to meet you.
- Screen reader users get content appearing with no announcement.

The fix is small: **render a real `<button>Load more</button>` and let the
observer click it for you.** Mouse users never notice it; keyboard users tab to
it; the pattern degrades cleanly if the observer never fires. The demo does
exactly this, plus:

- `aria-busy` on the list while a page is loading.
- An `aria-live="polite"` count, so new items are announced.
- `role="alert"` on the failure message, with the retry as a real button.
- The sentinel is `aria-hidden` — it's a layout device, not content.

The toggle in the demo turns auto-loading off so you can see the button-only
version still works on its own.

---

## 6. Errors must not kill the list

A failed page should leave the items already loaded on screen and offer a
retry. The common bug is an error state that replaces the whole list, so one
flaky request throws away 80 rows the user had already scrolled past.

Note the auto-load effect stops firing once `error` is set. Without that, the
observer is still intersecting, so it would retry in a tight loop — hammering
a server that is already unhappy.

---

## 7. Follow-ups to expect

| They ask | Short answer |
| --- | --- |
| "What happens at 10,000 items?" | The DOM becomes the bottleneck. Combine with virtualisation so only the visible window is mounted — that's the next question. |
| "User clicks an item, then hits back. What do they see?" | Top of page 1, unless you handle it. Either keep the loaded pages in a cache keyed by route, or store the last cursor and scroll offset and restore on mount. Real, very common bug. |
| "How do you test it?" | Mock `IntersectionObserver` (jsdom has no layout, so it never fires on its own) and assert that N triggers produce N pages, not 2N. |
| "Infinite scroll or pagination?" | Feeds and discovery: infinite. Anything where the user needs to find a specific item, compare, or link to a position: pagination. Anything with a footer: pagination. |
| "Can you do this without JS?" | Not the auto part, but the `Load more` button is a plain link/form away from working without it — which is a good argument for having it. |
| "Scroll upward / chat history?" | Same idea, sentinel at the top, but you must restore `scrollHeight - scrollTop` after prepending or the view jumps. |

---

## 8. Scoring notes

- **Mid:** wires up `IntersectionObserver`, appends pages, renders a spinner.
  Uses `?page=N`, double-fetches under fast scroll, no keyboard path, an error
  wipes the list.
- **Senior:** asks about cursor vs offset and explains why, guards the
  in-flight request with a ref rather than state, drops stale responses after
  a reset, uses `rootMargin` to prefetch, and leaves a real
  button behind.
