# Image carousel / slider

> **The prompt:** "Build an image carousel: next / previous, dots, autoplay."
>
> Most people get the slides moving in ten minutes. The rest of the hour tests
> whether you know where the "current slide" lives, how autoplay behaves when
> a person is using the carousel, and whether a keyboard or screen-reader user
> can use it at all.

Runnable demo: [`Carousel.tsx`](./Carousel.tsx) · wiring: [`index.tsx`](./index.tsx)

---

## 1. Clarify before you code

| Question | Why it changes your code |
| --- | --- |
| Swipe on touch devices? | If yes, scroll-snap gives it to you for free. With `transform` you write pointer handling yourself. |
| Loop forever, or stop at the ends? | Looping from last to first either "rewinds" through every slide or needs cloned slides. See section 7. |
| Autoplay? How long per slide? | Autoplay needs a pause control by accessibility rules (WCAG 2.2.2) and must pause while someone is using it. |
| One slide at a time, or several visible ("3 per view")? | Changes the slide width and how you work out the current index. |
| How many images? Big ones? | Lazy loading, fixed width/height to stop the page jumping, maybe preloading the next one. |

---

## 2. Two ways to build it

**A. Scroll-snap (used here).** A row of slides inside a horizontally
scrolling box. CSS `scroll-snap-type: x mandatory` makes the box always come to
rest on a slide edge. Buttons call `el.scrollTo(...)`.

**B. Transform.** An `overflow: hidden` window and a track moved with
`transform: translateX(-${index * 100}%)` plus a CSS transition. The index is
React state and the DOM follows it.

| | Scroll-snap | Transform |
| --- | --- | --- |
| Swipe / trackpad / arrow keys | Free, native feel with momentum | You write pointer events and velocity yourself |
| Source of truth | The scroll position (DOM) | React state |
| Seamless infinite loop | Hard | Easier (clone first and last, jump without transition) |
| Custom animations (fade, 3D) | No | Yes |

Say this table out loud in the interview. Picking scroll-snap and knowing what
you gave up is the senior answer; picking either one without knowing the
trade-off isn't.

---

## 3. The common first draft, and what's wrong with it

This is roughly what most people write (and a very reasonable start):

```jsx
const handleScrollToNext = () => {
  const itemWidth = carouselRef.current?.offsetWidth;
  setCurrentIndex((prev) => {
    const newIndex = (prev + 1) % totalItems;
    carouselRef.current?.scrollTo({ left: newIndex * itemWidth, behavior: "smooth" });
    return newIndex;
  });
};

useEffect(() => {
  const interval = setInterval(handleScrollToNext, 5000);
  return () => clearInterval(interval);
}, []);
```

What breaks:

1. **Side effect inside a state updater.** An updater function must be pure:
   take the old value, return the new one, nothing else. React may call it
   twice (StrictMode does, in development) and is allowed to call it later
   than you expect. Scrolling from inside it is a side effect. Work out the
   next index, *then* scroll, in the event handler.
2. **Two sources of truth.** The index is set by the button code *and* by the
   `onScroll` handler. During a smooth scroll the scroll handler overwrites
   it with every slide the scroll passes through, so the two keep fighting.
   Pick one owner. Here the scroll position owns it and everything else only
   asks the browser to scroll.
3. **Autoplay ignores the user.** The interval keeps its own rhythm. Click
   dot 3 four seconds into the cycle and one second later it jumps to slide 4
   under you. It also never pauses on hover or focus, and has no pause button.
4. **Dots are `<span onClick>`.** You can't reach them with Tab, and a screen
   reader hears nothing. Use `<button>` with an `aria-label`.
5. **`via.placeholder.com` is gone.** The service shut down, so the images
   are broken. (Use `picsum.photos` or local files.)
6. **Images without `width` / `height`.** The page jumps when each image
   loads, because the browser didn't know how much room to leave.

---

## 4. The scroll position is the source of truth

```ts
const slideAt = (el: HTMLElement) => Math.round(el.scrollLeft / el.clientWidth);

<div onScroll={(e) => setCurrent(slideAt(e.currentTarget))}>
```

Every way of moving — swipe, trackpad, arrow keys, the Next button, a dot,
autoplay — ends up changing the scroll position. So that's the one place to
read "which slide is showing" from. Buttons don't touch `current` at all; they
only ask the browser to scroll:

```ts
const scrollToSlide = (el, index, count) => {
  const wrapped = (index + count) % count; // -1 → last, count → 0
  el.scrollTo({ left: wrapped * el.clientWidth, behavior: "smooth" });
};
```

The analogy: a lift with buttons on every floor and inside the car. The
display above the doors doesn't track which button was pressed — it reads
where the car actually is. That's why it's never wrong, even when someone on
floor 3 calls it while you're pressing 7.

Why `Math.round`: halfway through a swipe, `scrollLeft / width` is something
like `1.4`. Rounding says "mostly on slide 1", which is what the dot should
show while the finger is still down.

`(index + count) % count` handles both ends with one line: going back from 0
gives `-1 + 4 = 3`, the last slide; going forward from the last gives 0. The
`+ count` is there because in JavaScript `-1 % 4` is `-1`, not `3`.

---

## 5. Autoplay that respects the person using it

```ts
const playing = !stopped && !hovered && !keyboardFocus && count > 1;

useEffect(() => {
  if (!playing) return;
  const id = setTimeout(() => {
    const el = trackRef.current;
    if (el) scrollToSlide(el, slideAt(el) + 1, count);
  }, interval);
  return () => clearTimeout(id);
}, [current, playing, interval, count]);
```

- **`setTimeout` keyed on `current`, not `setInterval`.** Whenever the slide
  changes — for any reason — the effect re-runs and the countdown starts
  again. So after you pick a slide you get the full five seconds on it. The
  analogy: a screen that locks after 5 minutes of *no activity*, not every 5
  minutes on the clock.
- **"Next" is read from the DOM at fire time** (`slideAt(el) + 1`), not from
  a variable captured when the effect ran. No stale closure to worry about.
- **Pause while hovered or while keyboard focus is inside.** Someone reading
  a slide or tabbing to a button shouldn't have it moved from under them.
- **A visible Pause / Play button.** WCAG 2.2.2: anything that moves by itself
  for more than 5 seconds needs a way to stop it. Hover isn't enough — touch
  screens have no hover.
- **Starts stopped for `prefers-reduced-motion: reduce`**, and scrolls with
  `behavior: "instant"` for those users.

### The focus trap you'll fall into

Pausing on *any* focus sounds right, but a mouse click on Play also gives the
Play button focus. Focus stays there after the mouse leaves, so autoplay stays
paused — the user pressed Play and nothing happens. The fix is one check:

```ts
onFocus={(e) => setKeyboardFocus(e.target.matches(":focus-visible"))}
```

`:focus-visible` matches when the browser would draw a focus ring — keyboard
focus, not mouse clicks. `onBlur` only clears it when focus leaves the whole
carousel (`!e.currentTarget.contains(e.relatedTarget)`), so tabbing from one
dot to the next doesn't flicker it off and on.

---

## 6. Details that get noticed

- **`scroll-snap-stop: always`.** Without it a hard flick can skip three slides.
  With it, one flick moves at most one slide.
- **`tabIndex={0}` on the track.** Now a keyboard user can focus it and press
  ← →; the browser scrolls and snaps. No key handler needed.
- **Carousel semantics.** The wrapper is a `<section>` with
  `aria-roledescription="carousel"` and a label; each slide is
  `role="group"` with `aria-roledescription="slide"` and
  `aria-label="2 of 4"`. That's the WAI-ARIA carousel pattern. Dots get
  `aria-current` for the active one.
- **`aria-live` only when not playing.** When a person moves the slide, the
  new slide is announced. During autoplay it's `off`, otherwise a screen
  reader would be interrupted every five seconds.
- **Images:** fixed `width` / `height` (no layout jump), `loading="lazy"` for
  every slide except the first, `draggable={false}` so a mouse drag doesn't
  start dragging the image file.
- **Resize just works.** Scroll-snap re-snaps to the current slide when the
  box changes size, and the index is computed from the current width each
  time. Nothing stores a pixel width.
- **Hidden scrollbar** with `scrollbar-width: none`. The track still scrolls.

---

## 7. Follow-ups to expect

| They ask | Short answer |
| --- | --- |
| "Make it loop seamlessly, no rewind." | Transform approach: add a copy of the last slide at the start and of the first at the end. When the transition lands on a copy, turn transitions off and jump to the real slide (listen for `transitionend`). With scroll-snap it's awkward: jumping `scrollLeft` fights the snap. |
| "Show 3 slides at once." | Slide `flex: 0 0 calc(100% / 3)`, and divide `scrollLeft` by one slide's width, not the box width. |
| "Lazy loading isn't enough — preload the next image." | `new Image().src = slides[current + 1].src` in an effect on `current`. |
| "Update the dots only when the scroll stops." | The `scrollend` event. Support is newer, so keep `scroll` as the fallback. |
| "Right-to-left languages?" | In RTL, `scrollLeft` is 0 at the start and goes *negative*. Use `Math.abs` when reading and a negative `left` when scrolling. |
| "Why not `IntersectionObserver` for the index?" | Also valid: watch each slide at `threshold: 0.5`. More setup; the maths above is simpler when slides are full width. |
| "How do you test it?" | Fake timers: advance 5s and check `scrollTo` was called with slide 1. Hover, advance 5s, check it wasn't. Click dot 3, advance 4s, check nothing moved. |

---

## 8. Scoring notes

- **Mid:** index in state, next / prev / dots working, `setInterval` autoplay,
  wraps at the ends.
- **Senior:** one source of truth for the index, no side effects in updaters,
  autoplay that restarts on interaction and pauses on hover / keyboard focus
  with a real Pause button, respects reduced motion, dots are buttons with
  labels, image sizes set, and can explain scroll-snap vs transform and what
  each costs for infinite looping.
