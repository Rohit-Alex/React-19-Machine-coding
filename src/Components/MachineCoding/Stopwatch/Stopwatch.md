# Stopwatch / timer (start, pause, reset, lap)

> **The prompt:** "Build a stopwatch with start, pause, reset, and laps."
>
> Nearly everyone writes `setInterval(() => setTime(t => t + 10), 10)`. It
> looks right for a few seconds and is wrong in a way you can demonstrate.
> Getting past that is most of the question.

Runnable demo: [`Stopwatch.tsx`](./Stopwatch.tsx) · hook:
[`useStopwatch.ts`](./useStopwatch.ts)

Companion question: [Countdown timer](../CountdownTimer/CountdownTimer.md) —
same ideas, but it counts to a moment on the calendar, which changes which
clock you use.

---

## 1. Clarify before you code

| Question | Why it changes your code |
| --- | --- |
| What precision — seconds, or hundredths? | Decides the format, and how often you need to repaint. |
| Should it survive a page reload? | Then you store a start time in `localStorage`, and it has to be a wall-clock time. See section 7. |
| Keep running in a background tab? | It must *count* in the background even if it doesn't *draw*. That rules out counting ticks. |
| Laps: show each lap's own length, the running total, or both? | Store the totals; work out each lap's length from them. |
| Keyboard shortcuts (Space to start / stop)? | Small extra, but decide early whether the whole page listens or just the component. |

---

## 2. The bug in the obvious version

```tsx
// Don't ship this.
useEffect(() => {
  if (!running) return;
  const id = setInterval(() => setTime((t) => t + 10), 10);
  return () => clearInterval(id);
}, [running]);
```

This *counts ticks* and assumes each tick is exactly 10ms apart. They aren't:

- **Timers only promise "not earlier than".** If the main thread is busy
  rendering, a tick that should run at 10ms runs at 25ms, and you still only
  add 10.
- **Background tabs slow timers right down.** Browsers let a hidden tab's
  timers run at most about once a second — later, in Chrome, about once a
  minute. Your "10ms" tick now fires once a second and still adds 10ms. The
  stopwatch loses almost the whole time you were away.

The demo shows this. Start it, switch tabs for ten seconds, come back: the
naive line has barely moved.

The analogy: counting your own steps to measure how long a walk took. If you
stop to tie a shoelace, you took no steps, so your count says no time passed.
A watch doesn't care what you were doing — you just read it at the end.

---

## 3. The fix: store timestamps, work out the time

Remember **when** you started, and subtract:

```ts
elapsed = accumulated + (now - startedAt)
```

- `startedAt` — when the current run began.
- `accumulated` — time banked from earlier runs, before the last pause.

On **pause**, bank the current run: `accumulated += now - startedAt`, then clear
`startedAt`. On **resume**, set a new `startedAt`. The pause itself never counts,
because no run was in progress.

Now the timer (`requestAnimationFrame` here) only decides *when to redraw*. It
has no say in *what time it is*. A late tick just means one frame is drawn a
bit later — with the right number on it. A throttled background tab draws
nothing, and the first frame back is already correct.

### `performance.now()`, not `Date.now()`

`Date.now()` reads the computer's wall clock, and the wall clock can jump: the
system syncs with a time server, the user changes the time, the clocks go
forward for daylight saving. If it jumps back an hour mid-run, a `Date.now()`
stopwatch goes negative.

`performance.now()` counts from page load and only ever goes forward. For
measuring **how long something took**, it's the right clock. The countdown
question needs the other one, and the reason is worth saying out loud in the
interview — see [its writeup](../CountdownTimer/CountdownTimer.md#2-datenow-not-performancenow).

---

## 4. State shape: a reducer, with the time passed in

[`useStopwatch.ts`](./useStopwatch.ts) uses `useReducer` with three statuses:
`idle`, `running`, `paused`. Every action that needs the time carries it:

```ts
start: () => dispatch({ type: "start", now: performance.now() })
```

Why not call `performance.now()` inside the reducer? Reducers must be pure —
same input, same output. React may call them twice in development (StrictMode
does exactly this) to catch impure ones. Reading the clock inside means two
calls get two different times. Read it in the event handler and pass it in.

The reducer also ignores actions that make no sense: `pause` when not running,
`lap` when not running, `start` when already running. A double-click on Start
can't restart the run.

### Rendering while running

```ts
useEffect(() => {
  if (status !== "running") return;
  let frameId = 0;
  const loop = () => {
    setNow(performance.now());
    frameId = requestAnimationFrame(loop);
  };
  frameId = requestAnimationFrame(loop);
  return () => cancelAnimationFrame(frameId);
}, [status]);
```

`requestAnimationFrame` redraws once per screen frame and stops on its own in a
background tab. `setInterval(…, 50)` works too — the time comes from
timestamps either way, so the only difference is how smooth it looks. Say that
in the interview: it shows you know the loop is just a repaint trigger.

---

## 5. Laps

Store the **total** at each lap press, not the lap's own length:

```ts
laps: [12_340, 25_010, 36_900]           // totals
split = laps[i] - (laps[i - 1] ?? 0)     // 12.34s, 12.67s, 11.89s
```

The totals never need to change once recorded, and each lap's length is one
subtraction away. Storing lengths instead means working out totals with a
running sum every render.

The list is newest-first (`<ol reversed>` keeps the numbering right), and keyed
by lap number, not by time.

---

## 6. Details that get noticed

- **`font-variant-numeric: tabular-nums`.** In most fonts "1" is narrower than
  "8", so a ticking display shuffles left and right. Tabular numbers make every
  digit the same width. One CSS line, and it's visible immediately.
- **Don't announce every tick.** `aria-live` on the display would make a screen
  reader try to read out a new time 60 times a second. `role="timer"` marks the
  display without announcing it; the lap list is announced instead.
- **Button labels follow the state:** Start → Pause → Resume. Lap is disabled
  unless running; Reset is disabled when there's nothing to reset.
- **Formatting: round down first.** `performance.now()` is not a whole number —
  it measures fractions of a millisecond, so a time looks like
  `179661.8999999761581`. `ms % 1000` keeps that fraction and the display
  shows `661.8999999761581`. Do `Math.floor(ms)` once at the top, then split
  into hours, minutes, seconds, and milliseconds. Round the total once, never
  the parts: `Math.round(ms % 1000)` can give `1000` while the seconds, worked
  out separately, haven't gone up yet — so 59.9996s shows as `00:00:59:1000`.

---

## 7. Follow-ups to expect

| They ask | Short answer |
| --- | --- |
| "Survive a page reload." | `performance.now()` restarts at zero on reload, so it can't be stored. Save `Date.now()` at start, plus `accumulated`, to `localStorage`, and accept the small risk of a wall-clock jump. |
| "Highlight the fastest and slowest lap." | Compute the splits, find the min and max with at least two laps, and style those rows. Don't store it — it's derived. |
| "Add a countdown mode." | Same timestamps, different maths: `remaining = duration - elapsed`. Stop when it hits zero. |
| "Why not `setInterval` for rendering?" | It's fine. What matters is that the time comes from timestamps. `requestAnimationFrame` is smoother and pauses itself in background tabs. |
| "Is 60 renders a second a problem?" | Only if the component is big. Keep the ticking display in a small component so only that re-renders. |
| "How do you test it?" | Fake timers plus a mocked `performance.now()`. Advance the clock by 5 seconds without firing any ticks, and check the display says 5 seconds. That's exactly the test the naive version fails. |

---

## 8. Scoring notes

- **Mid:** `setInterval` adding a fixed amount per tick, start / pause / reset
  working. Drifts, and loses time in a background tab.
- **Senior:** works the time out from timestamps, explains why tick-counting
  drifts, picks `performance.now()` on purpose, keeps the reducer pure by
  passing the time in, stores lap totals, and uses tabular numbers.
