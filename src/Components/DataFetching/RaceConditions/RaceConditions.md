# Race conditions in data fetching & request cancellation (`AbortController`)

> **The question:** "You fetch data in a `useEffect` when an id changes. What
> can go wrong?" — or the live-coding version: "This profile page sometimes
> shows the wrong user. Find the bug."
>
> Requests don't come back in the order you sent them. The last request you
> made is not always the last to answer. Everything here follows from that
> one fact.

Runnable demo: [`index.tsx`](./index.tsx) · the race:
[`RaceDemo.tsx`](./RaceDemo.tsx) · timeout + cancel:
[`TimeoutDemo.tsx`](./TimeoutDemo.tsx) · abortable fake API:
[`fakeApi.ts`](./fakeApi.ts)

Related builds: [DebouncedSearch](../../MachineCoding/DebouncedSearch/DebouncedSearch.md)
(the same race while typing) · [useFetch](../../Hooks/useFetch/useFetch.ts)
(the hook version).

---

## 1. The bug

```tsx
useEffect(() => {
  fetchUser(userId).then(setUser);    // ❌ no protection
}, [userId]);
```

Click user 1 (slow: 1.8s), then user 5 (fast: 0.2s):

```
t=0     request A: user 1   ─────────────────────────┐
t=0.1   request B: user 5   ───┐                      │
t=0.3                          └─► setUser(user 5) ✅ │
t=1.8                                                 └─► setUser(user 1) ❌
```

User 5 is selected, user 1 is on screen, and nothing shows an error.
Checked by simulation: naive ends on user 1; both fixes end on user 5.

Analogy: you text two friends "where shall we eat?", then change your mind and
ask a second question. The slow friend's answer to the *first* question
arrives last, and you go to the wrong restaurant — because you acted on
whichever message came in last, not on the answer to your latest question.

**Why it's easy to miss:** on a fast local network every request takes about
the same time, so the order is almost always right. It shows up on phones, on
slow APIs, and with endpoints whose speed depends on the input (a broad
search is slower than a narrow one).

**Debouncing doesn't fix it.** It makes it rarer — fewer requests — but two
requests 400ms apart can still finish in the wrong order.

---

## 2. Fix 1: the ignore flag

```tsx
useEffect(() => {
  let ignore = false;
  fetchUser(userId).then((user) => {
    if (!ignore) setUser(user);
  });
  return () => { ignore = true; };
}, [userId]);
```

Each run of the effect has its own `ignore`. When `userId` changes, React runs
the old effect's cleanup first, so the old request's flag is set before its
answer can land. This is the pattern the React docs show.

It **fixes the screen but not the waste**: the old request still runs to the
end, using the network, the server, and the user's data plan.

---

## 3. Fix 2: `AbortController`

```tsx
useEffect(() => {
  const controller = new AbortController();
  fetch(`/api/users/${userId}`, { signal: controller.signal })
    .then((r) => r.json())
    .then(setUser)
    .catch((error) => {
      if (controller.signal.aborted) return;   // we cancelled it: not an error
      setError(error);
    });
  return () => controller.abort();
}, [userId]);
```

- **`controller.abort()`** makes the `fetch` promise reject straight away, and
  the browser closes the request (or stops reading its response). The stale
  answer can never reach `setUser`.
- **A controller is single-use.** Once aborted, it stays aborted. Make a new
  one per request — here, per effect run.
- **One controller can cancel many things:** several fetches, an event
  listener (`addEventListener(type, fn, { signal })` removes it on abort),
  and your own async code.

### Telling "cancelled" from "failed"

```ts
if (controller.signal.aborted) return;                 // ✅ robust
if (error.name === "AbortError") return;                // ⚠ only the default case
```

`fetch` rejects with **`signal.reason`**. That's an `AbortError` only when
you call `abort()` with no argument. `abort("user left")` rejects with the
string `"user left"`; `AbortSignal.timeout()` rejects with a `TimeoutError`.
Checked in Node: default → `AbortError`, custom → `"custom"`, timeout →
`TimeoutError`. So check **`signal.aborted`**, and use `signal.reason` when
you need to know *why*.

### Abort is not undo

Aborting tells the browser to stop *waiting*. If the server already got the
request, it may finish the work anyway. Harmless for a GET; for a POST
("place order"), cancelling on the client doesn't cancel the order. That's
why writes need idempotency keys, not just abort (see
[TicketBooking](../../MachineCoding/TicketBooking/TicketBooking.md#2-the-seat-map-is-a-hint-not-the-truth)).

---

## 4. Which fix when?

| | Ignore flag | `AbortController` |
| --- | --- | --- |
| Stops the wrong data showing | ✅ | ✅ |
| Stops the network request | ❌ | ✅ |
| Works with any promise (SDKs, `IndexedDB`, a library without signals) | ✅ | Only if the API takes a signal |
| Code | 2 lines | 3 lines + error check |

Use `AbortController` when the API accepts a signal (fetch, axios, most
modern SDKs). Use the flag for anything that doesn't. Saying "the flag hides
the answer, abort stops the work" in one sentence is the senior answer.

A third pattern, used in [InfiniteScroll](../../MachineCoding/InfiniteScroll/InfiniteScroll.md):
a **request id** in a ref, bumped on each request; an answer is used only if
its id is still the latest. Useful outside effects — in event handlers, where
there's no cleanup function to set a flag.

---

## 5. Making your own code abortable

```ts
function wait(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    signal?.throwIfAborted();                       // already cancelled: don't start
    const onAbort = () => { clearTimeout(id); reject(signal!.reason); };
    const id = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort); // don't leak the listener
      resolve();
    }, ms);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}
```

Three rules, the same ones `fetch` follows:
1. **Check first** — `throwIfAborted()` if the signal is already aborted.
2. **Reject with `signal.reason`**, so callers can tell timeout from cancel.
3. **Remove the listener when you finish normally.** A signal that lives as
   long as a component would otherwise collect one listener per call.

The demo's fake API is built on this `wait`, which is why its requests can be
aborted like real ones.

---

## 6. Timeouts and combining signals

```ts
const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(3000)]);
```

- **`AbortSignal.timeout(ms)`** aborts after `ms` with a `TimeoutError`.
  `fetch` has no timeout option of its own; this is it.
- **`AbortSignal.any([...])`** aborts when the first of its signals does. One
  signal now covers "user pressed Cancel" *and* "server took too long".
- **Show them differently:** cancel → no error ("you asked for it"); timeout
  → "took too long, try again". The timeout demo does exactly this.

Both are supported in all current browsers (`any` since 2024). On older
targets, a `setTimeout` that calls `controller.abort()` does the same job.

---

## 7. React-specific notes

- **StrictMode runs effects twice in development** (mount → cleanup →
  mount). With `AbortController`, the first request is aborted immediately —
  you'll see an aborted request in the network tab and the demo's log. That's
  the cleanup working, not a bug. Without cleanup, StrictMode shows you the
  race for free.
- **Don't `setState` after an abort**, including `setLoading(false)`: the next
  request is already running, and it owns the loading state.
- **Event handlers have no cleanup.** For "Load" buttons, keep the controller
  in a ref and abort the previous one before starting a new one; abort it on
  unmount (the timeout demo does both).
- **Libraries do this for you.** TanStack Query passes a `signal` to your
  query function and aborts when the query key changes or nobody needs the
  data; it also only stores the answer for the current key. React 19's `use()`
  with a cached promise per id avoids the race too, because each id renders
  its own promise.

---

## 8. Follow-ups to expect

| They ask | Short answer |
| --- | --- |
| "Races in *saves* (two quick edits)." | Both PUTs can arrive at the server in either order. Send a version number and let the server reject older ones, or queue saves so only one is in flight, or send only the latest after the current one finishes. |
| "Cancel on route change." | Same cleanup: the page component unmounts, its effects' cleanups abort. In loaders (React Router), the framework passes a `request.signal`. |
| "Does abort save server work?" | Only if the server watches for the client disconnecting (Node: `req.on("close")`, then cancel the DB query). Otherwise it just stops the response being sent. |
| "axios?" | Accepts `signal` the same way; `axios.isCancel(err)` for the check. The old `CancelToken` is deprecated. |
| "Retry with backoff — and cancel it." | Pass the same signal to every attempt *and* to the `wait` between attempts, so one abort stops the whole loop. |
| "Why not just disable the buttons while loading?" | It hides the problem by making the UI worse. Users should be able to change their mind; the code should handle it. |

---

## 9. Scoring notes

- **Mid:** fetch in an effect with loading and error state; may mention
  "cleanup" without knowing what goes in it.
- **Senior:** explains the out-of-order race unprompted, fixes it with abort
  (or the flag where abort isn't possible) and knows the difference, checks
  `signal.aborted` rather than the error name, separates cancel from timeout
  with `AbortSignal.any`/`timeout`, makes custom async code abortable, knows
  abort doesn't undo a write, and recognises the StrictMode double request.
