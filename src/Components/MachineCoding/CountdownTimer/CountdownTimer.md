# Countdown timer (with input for a target date/time)

> **The prompt:** "Let the user pick a date and time, and show a live
> countdown to it."
>
> It sounds like the stopwatch backwards. It isn't quite: you're counting to a
> moment on the calendar, not measuring a length of time. That one difference
> changes which clock you use and how you read the input.

Runnable demo: [`CountdownTimer.tsx`](./CountdownTimer.tsx) · hook:
[`useCountdown.ts`](./useCountdown.ts)

Read the [Stopwatch](../Stopwatch/Stopwatch.md) first. The core idea — store a
timestamp and work the time out from it, never count ticks — is explained
there and used here unchanged.

---

## 1. Clarify before you code

| Question | Why it changes your code |
| --- | --- |
| A countdown to a date ("sale ends Friday 6pm"), or a duration ("5 minutes")? | A date needs a wall clock and a date input. A duration is the stopwatch counting down. |
| Whose time zone — the user's, or a fixed one? | "6pm" in whose city? The native input uses the user's. Fixed zones need extra handling. |
| What happens at zero? | Show a message, fire a callback, play a sound? Only announce it once. |
| Does it have to match the server? | If the sale ends by the *server's* clock, the user's clock can be minutes out. See the follow-ups. |
| Should it survive a reload? | Easy if you store the target. Section 3. |

---

## 2. `Date.now()`, not `performance.now()`

The stopwatch uses `performance.now()` because it only goes forward — perfect
for measuring a length of time. So why not here?

Because `performance.now()` only tells you how long the page has been open. It
has no idea what time it is. The target is "6:30pm on the 27th", and the only
thing that can tell you how far away 6:30pm is, is the wall clock.

The analogy: a stopwatch doesn't need to know the time of day to time a race.
But if you're waiting for a train at 6:30, a stopwatch is useless — you need a
clock on the wall.

So:

| Measuring… | Use | Because |
| --- | --- | --- |
| How long something took | `performance.now()` | Only moves forward. Unaffected by clock changes. |
| How long until a date / time | `Date.now()` | The target *is* a wall-clock time. |

And the wall clock jumping is actually *correct* here. If the user's clock is
fixed by a time sync, the real time until 6:30pm changed too.

---

## 3. Store the target, not the time left

```ts
const [target, setTarget] = useState<number | null>(null); // epoch ms
const remaining = target - Date.now();                      // worked out
```

Storing "seconds left" and counting it down would bring back every problem of
the tick-counting stopwatch. Storing the target instead means:

- A late or throttled tick can't make it wrong — `remaining` is recalculated
  from the clock each time.
- Reloading the page is trivial: save the target in `localStorage` and the
  countdown resumes exactly where it should.
- Daylight saving can't confuse it. The target is an exact moment (epoch
  milliseconds), so the difference is always real time, even across a clock
  change.

---

## 4. Reading the input — the time zone trap

`<input type="datetime-local">` is the native picker: no library, keyboard
accessible, and a proper picker on mobile. Its value is a string with no time
zone:

```
"2026-09-27T18:30"
```

`new Date()` reads that as **local time**, which is what the user meant.
Good. But leave the time off and the rules change:

```ts
new Date("2026-09-27T00:00") // local midnight   → 00:00 IST
new Date("2026-09-27")       // UTC midnight     → 05:30 IST
```

Both outputs checked in Node with the time zone set to India. A date with no
time is read as UTC; a date with a time is read as local. This is a real
JavaScript rule, not a bug in one browser, and it catches people out with
`<input type="date">` — every user west of London sees the countdown end on the
day *before*.

Two more things to get right:

- **Validate on submit.** An empty input gives `NaN`; a past time should be
  rejected with a message. The demo does both, and links the error to the
  input with `aria-describedby`.
- **Don't build the input's `min` with `toISOString()`.** That gives UTC, so the
  earliest time allowed would be off by your time zone offset. If you set
  `min`, format the local date and time yourself.

---

## 5. Ticking on the second

The display changes once a second. The obvious loop is:

```ts
setInterval(tick, 1000);
```

The problem is *when* those ticks land. If you start at 3.7 seconds left, the
ticks land at 2.7, 1.7, 0.7 — each one 0.7s into its second. Timers run a
little late, so sometimes a tick slips past the next second boundary, and the
display skips a number (5 → 3) or shows one twice.

The fix is to sleep until exactly the moment the displayed number changes:

```ts
const left = target - Date.now();
setTimeout(tick, left % 1000 || 1000);
```

With 3.7s left, the next wake is in 0.7s — right as it becomes 3.0s. Every
second after that is a whole second. Simulated in Node:

```
aligned ticks: 00:00:04 -> 00:00:03 -> 00:00:02 -> 00:00:01 -> 00:00:00
```

Each number appears exactly once, and it's a chained `setTimeout` rather than
`setInterval`, so every tick corrects for however late the previous one was.

### Round up, not down

```ts
const seconds = Math.ceil(ms / 1000);
```

With 0.4 seconds left, show **1**, not 0. Rounding down means the display says
`00:00:00` for the whole final second while nothing has happened yet. Rounding
up reaches zero at the exact moment time is up — like a microwave.

### Background tabs

Hidden tabs throttle timers hard — in Chrome, eventually to about once a
minute. The countdown is never *wrong* (it's recalculated from the clock), but
the display could be stale for up to a minute when the user comes back. So the
hook listens for `visibilitychange` and ticks immediately when the tab is
visible again.

---

## 6. Accessibility

- `role="timer"` on the display. It is not announced on every change — a
  screen reader reading out every second would be unbearable.
- The finish ("Time's up!") goes in an `aria-live="assertive"` region, so it's
  announced once, the moment it happens.
- Errors use `role="alert"`, and the input gets `aria-invalid` and
  `aria-describedby` pointing at the message.
- Show the target in words too ("Ends 27 Sep 2026, 6:30:00 pm") with
  `toLocaleString`, so users can check they picked what they meant.

---

## 7. Follow-ups to expect

| They ask | Short answer |
| --- | --- |
| "The sale ends by the server's clock." | Get the server's time with the page (or from a `Date` response header), store `offset = serverNow - Date.now()`, and use `Date.now() + offset` everywhere. The user's clock can be minutes out. |
| "Several countdowns on one page." | One shared ticker that all of them subscribe to — `useSyncExternalStore` fits — instead of one timer each. |
| "Fire a callback at zero." | In the tick, when `left <= 0`, call it once. Keep the callback in a ref (or use `useEffectEvent`) so the timer doesn't restart each render. |
| "Show it in the user's language." | `Intl.RelativeTimeFormat` for "in 3 days", or `Intl.DurationFormat` where supported. |
| "Why not `setInterval(tick, 1000)`?" | It drifts relative to the second boundary and can skip or repeat a number. Chained `setTimeout` aimed at the next boundary doesn't. |
| "How do you test it?" | Fake timers and a mocked `Date.now()`. Set the target 5.3s ahead and check each second shows exactly once, and that the done message appears once. |

---

## 8. Scoring notes

- **Mid:** stores seconds left and decrements it with `setInterval`. Works
  until the tab is hidden, drifts, may skip seconds, and shows 0 a second
  early.
- **Senior:** stores the target, explains why this one uses `Date.now()` when
  the stopwatch uses `performance.now()`, knows the date-only-is-UTC rule,
  aligns ticks to the second, rounds up, catches up on `visibilitychange`, and
  announces only the finish.
