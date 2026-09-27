# Throttled scroll / resize handler

> **The prompt:** "Scrolling fires this handler hundreds of times a second and
> the page janks. Fix it."
>
> The expected answer is "throttle it". The senior answer is "throttle it
> against the right clock — and check whether I should be listening to scroll
> at all."

Runnable demos: [`ScrollProgress.tsx`](./ScrollProgress.tsx) ·
[`ElementResize.tsx`](./ElementResize.tsx) · hooks:
[`useRafThrottle.ts`](./useRafThrottle.ts) ·
[`useResizeObserver.ts`](../../Hooks/useResizeObserver/useResizeObserver.ts)

---

## 1. Clarify before you code

| Question | Why it changes your code |
| --- | --- |
| What does the handler actually *do* at the end? | Paints something → `requestAnimationFrame`. Sends a request → time-based throttle. This single question picks your entire approach. |
| Do you need updates *during* the scroll, or only when it settles? | During → throttle. Only at the end → debounce. Sticky headers need during; "log what the user read" needs the end. |
| Is it the window scrolling, or a container? | Changes what you attach to and how you measure. |
| For resize — the viewport, or one element? | `window.resize` vs `ResizeObserver`. They are not interchangeable. |
| Are we detecting "is this element on screen"? | Then it's `IntersectionObserver`, and there is no scroll handler at all. |

---

## 2. The clock is the whole question

Throttling means "at most once per interval". The interesting decision is what
interval, and the answer depends on where the work lands.

**If the handler ends in a paint — use `requestAnimationFrame`.**

A `setTimeout`-based throttle runs on a clock that knows nothing about the
screen. Set it to 100ms on a 60Hz display and you update roughly every sixth
frame — visibly steppy. Set it to 16ms to "match" the frame rate and it still
drifts, because your timer and the browser's paint schedule were never
aligned; some frames get two updates and some get none. Worse, it does not
adapt: on a 120Hz screen you are now updating half as often as the display can
show, and on a loaded main thread you queue work for frames that never render.

`requestAnimationFrame` sidesteps all of it by asking the browser "call me when
you are about to paint". You get exactly one update per frame, on every
refresh rate, automatically.

The analogy: a time-based throttle is a photographer firing the shutter every
100ms and hoping to catch the runner mid-stride. rAF is one wired to the
runner's footfalls. Same number of photos, but only one of them is ever in
sync with the thing being photographed.

**If the handler ends in a network request or something expensive — use a
time-based throttle.** rAF would fire ~60 times a second, which is a terrible
request rate. Here the frame schedule is irrelevant; what matters is the cost
per call. [`useThrottleCallback`](../../Hooks/useThrottle/useThrottleCallback.ts)
is the right tool.

[`useRafThrottle.ts`](./useRafThrottle.ts) is the rAF version. It keeps the
*newest* arguments rather than the ones that scheduled the frame — the frame
should render where the user is now, not where they were when the burst
started. Toggle between the modes in the demo and watch the "events collapsed
into each run" ratio.

---

## 3. `passive: true` — the free win most candidates miss

```ts
el.addEventListener("scroll", onScroll, { passive: true });
```

By default the browser cannot start scrolling until your handler has run,
because the handler is allowed to call `preventDefault()` and cancel the
scroll. It has to wait and see. If your handler takes 10ms, that is 10ms of
finger-on-glass with nothing moving.

`passive: true` is a promise that you will never cancel it, which lets the
browser scroll immediately and run your handler whenever it gets round to it.
For touch and wheel events on mobile this is one of the largest single wins
available, and it costs one word.

Two things worth knowing:

- Modern browsers already default to passive for `touchstart`/`touchmove` on
  the window, but **not** for `scroll` on an arbitrary element. Be explicit.
- Once passive, calling `preventDefault()` is a no-op and logs a console
  warning. If you genuinely need to cancel, you cannot be passive — but then
  say so out loud, because that is a real tradeoff, not an oversight.

React's synthetic `onScroll` does not let you set this. That alone is a
reasonable justification for attaching the listener yourself in an effect,
which is what the demo does.

---

## 4. Layout thrashing

The classic scroll-handler killer, and worth being precise about, because the
usual explanation is wrong.

Reading `scrollTop` inside a scroll handler is *not* expensive on its own —
layout is already clean at that point. The problem is interleaving:

```ts
// Bad: read, write, read, write...
items.forEach((el) => {
  const top = el.getBoundingClientRect().top; // read - forces layout
  el.style.opacity = top < 500 ? "1" : "0";   // write - invalidates it
});
```

Every write invalidates layout, so the next read has to recompute it. A loop
like this forces one full layout per item. Batch instead: read everything,
then write everything.

```ts
const tops = items.map((el) => el.getBoundingClientRect().top);
items.forEach((el, i) => {
  el.style.opacity = tops[i] < 500 ? "1" : "0";
});
```

In React you rarely write this directly, but it is exactly what happens if you
`useLayoutEffect` your way through a list measuring and restyling nodes.

---

## 5. The best scroll handler is no scroll handler

This is the answer that separates bands. Before writing any of the above, check
whether the platform already solved it:

| What you want | Reach for | Not |
| --- | --- | --- |
| "Is this element visible?" | `IntersectionObserver` | scroll + `getBoundingClientRect` |
| Lazy-load images / infinite scroll trigger | `IntersectionObserver` | scroll position maths |
| A header that sticks to the top | CSS `position: sticky` | scroll handler toggling a class |
| An element's own size changed | `ResizeObserver` | `window.resize` |
| Scroll-linked animation | CSS scroll-driven animations | rAF + manual interpolation |

These run off the main thread or in dedicated browser phases, so they keep
working while your JavaScript is busy — which is exactly when a hand-rolled
scroll handler falls apart. This repo already has
[`useIntersectionObserver`](../../Hooks/useIntersectionObserver/useIntersectionObserver.ts)
and [`useLazyLoadOnScreenView`](../../Hooks/useLazyLoadOnScreenView/useLazyLoadOnScreenView.ts)
for the visibility cases.

Saying "I'd use `IntersectionObserver` here instead" when asked to throttle a
scroll handler is not dodging the question. It is the question.

---

## 6. Resize: the window is not the element

`window.resize` fires when the *viewport* changes. It says nothing about an
element that changed size because a sidebar collapsed, a font finished
loading, content grew, or a flex sibling gave up space. Those are the majority
of real resize cases.

`ResizeObserver` watches the element itself. Two properties make it better than
anything you would hand-roll:

- Callbacks are **already batched and delivered once per frame, before paint**.
  Throttling it is usually redundant code, and debouncing it actively hurts —
  the element visibly lags the cursor while you drag.
- It fires once on observe, so you get an initial measurement without a
  separate "measure on mount" branch.

[`useResizeObserver.ts`](../../Hooks/useResizeObserver/useResizeObserver.ts) is the hook; drag the box in
[`ElementResize.tsx`](./ElementResize.tsx) and watch the element size change
while the window size sits still.

One gotcha worth knowing: writing to the observed element's size from inside
the callback can loop, and the browser will bail out with a
`ResizeObserver loop completed with undelivered notifications` error. If you
see that, you have a feedback loop, not a flaky browser.

---

## 7. Follow-ups to expect

| They ask | Short answer |
| --- | --- |
| "Throttle or debounce for scroll?" | Throttle. You need updates *during* the gesture. Debounce shows nothing until the user stops, which for a progress bar means it never moves while scrolling. |
| "And for resize?" | Often both: throttle the cheap visual part so it tracks the drag, debounce the expensive part (refetching, recalculating a virtualised list) to the end. |
| "Why not just use CSS?" | Frequently you should. Sticky headers, scroll snapping, and scroll-driven animation are all CSS now. |
| "What about `scrollend`?" | A real event in modern browsers, and a cleaner "user stopped scrolling" signal than debouncing. Check support for your target matrix. |
| "How do you avoid stale state in the handler?" | The listener is registered once, so it closes over the first render's values. Either keep the callback in a ref (what `useRafThrottle` does internally) or use `useEffectEvent`. |
| "Does React 19 change any of this?" | Not for the event side. `useDeferredValue` can help if the *render* triggered by the scroll is the slow part, but it does not reduce how often the handler runs. |
| "How would you measure the improvement?" | Performance panel, look at long tasks and dropped frames during a scroll. Not a millisecond number in isolation — the thing you care about is whether frames are being missed. |

---

## 8. Scoring notes

- **Mid:** wraps the handler in a 100ms throttle, cleans up the listener,
  moves on. Works, but steppy, and misses `passive`.
- **Senior:** picks the clock based on what the handler does, uses `passive`,
  knows `ResizeObserver` is not `window.resize`, and asks whether an observer
  or plain CSS removes the handler entirely.
