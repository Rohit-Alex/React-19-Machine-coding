# Toast / notification system (queue, auto-dismiss, portal)

> **The prompt:** "Build a toast system. Any component can show a message;
> it disappears after a few seconds. Handle many at once."
>
> This is an **API design** question wearing a UI costume. The marks are for
> how components call it, how timers behave, what happens with ten toasts at
> once, and whether a screen reader hears any of it.

Runnable demo: [`index.tsx`](./index.tsx) · system: [`Toast.tsx`](./Toast.tsx)

---

## 1. Clarify before you code

| Question | Why it changes your code |
| --- | --- |
| How do callers show one — hook, or a global `toast()` import? | Hook needs a provider; a global function needs a store outside React (section 6). |
| Max on screen? What happens to the rest? | Queue (built here), or drop the oldest. |
| Do errors auto-dismiss? | Usually not — section 4. |
| Actions in the toast ("Undo")? | Then it must stay while focused, and the timer pauses. |
| Position, stacking direction? | Bottom-right, newest at the bottom, is a safe default. |
| Same message fired twice? | De-duplicate by a key, or show a "×2" count. |

---

## 2. Shape: provider + hook + portal

```tsx
<ToastProvider>   // owns the list, renders the stack into a portal
  <App />          // anywhere inside: const toast = useToast(); toast("Saved.")
</ToastProvider>
```

- **Context carries only the `showToast` function**, not the list. Callers
  never re-render when toasts come and go — only the provider does. If the
  list were in context, every button using `useToast()` would re-render on
  every toast.
- **`useCallback` keeps `showToast` stable** for the same reason.
- **`useToast()` throws outside the provider** — a clear error beats a silent
  `undefined is not a function`.
- **Portal to `body`** so no parent's `overflow` or stacking context clips it
  (same reason as the [Modal](../Modal/Modal.md#2-why-a-portal)).

---

## 3. The queue is just a slice

```ts
const visible = toasts.slice(0, maxVisible);
const queued  = toasts.length - visible.length;
```

One array, oldest first. Dismissing one removes it, and the next queued toast
slides into the visible slice automatically — no second "queue" array to keep
in sync.

Because only visible toasts are **mounted**, and each toast's timer lives in
its own component, **a queued toast's timer hasn't started yet**. Fire six at
once and each still gets its full time on screen. A design with timers started
in `showToast` would expire queued toasts before anyone saw them.

Analogy: a bakery counter with three serving windows. Tickets wait in line;
your service time starts when you reach a window, not when you took the
ticket.

---

## 4. Timers: per toast, pausable

```ts
const remainingRef = useRef(toast.duration);

useEffect(() => {
  if (isPaused || remainingRef.current === null) return;
  const startedAt = Date.now();
  const id = setTimeout(() => onDismiss(toast.id), remainingRef.current);
  return () => {
    clearTimeout(id);
    remainingRef.current -= Date.now() - startedAt;   // spend what was used
  };
}, [isPaused, onDismiss, toast.id]);
```

- **Pause on hover and on focus.** A toast that vanishes while you're reading
  it, or while its Undo button is focused, is a WCAG timing failure (2.2.1).
- **The cleanup subtracts the time used**, so resuming continues where it
  stopped instead of starting over. One effect handles start, pause and
  resume.
- **Errors are sticky** (`duration: null`). An error that disappears before
  it's read is worse than none.
- **Don't use `Infinity` for "never".** `setTimeout` stores the delay in a
  32-bit integer; `Infinity` overflows and the timer fires **immediately**
  (checked in Node: it warns and uses 1ms). Use `null` and skip the timer.

---

## 5. Accessibility

- **Live regions must exist before the message goes in.** Screen readers
  watch a live region for *changes*; a region added already-full is often not
  read. So both containers are always rendered, even when empty.
- **Two regions:** `aria-live="assertive"` for errors (interrupts),
  `"polite"` for the rest (waits for a pause). One polite region for
  everything means a payment error waits behind "Saved."
- **Dismiss button with `aria-label`** — "✕" alone is read as "multiplication
  sign".
- **Don't move focus to a toast.** It interrupts whatever the user was doing.
  If a toast has an important action, offer a keyboard shortcut or keep the
  action available elsewhere.
- Toasts rely on colour for type; the message text should say it too
  ("Payment failed…"), not just a red bar.

---

## 6. Follow-ups to expect

| They ask | Short answer |
| --- | --- |
| "Call `toast()` from outside React (an API client, a Redux middleware)." | Move the list into a tiny external store (`subscribe` + `getSnapshot`); export `toast()` that pushes into it; the provider reads it with `useSyncExternalStore`. This is how react-hot-toast and sonner work. |
| "Promise toasts: loading → success/failure." | `toast.promise(p, {loading, success, error})`: show a sticky loading toast, then *update* it by id when `p` settles. Needs an `update(id, patch)` alongside `dismiss`. |
| "Animate in/out." | In: CSS keyframes on mount. Out: mark as `leaving`, unmount on `animationend`. The queue then waits for the exit to finish. |
| "Pause all timers when the tab is hidden." | `visibilitychange` sets a shared paused flag in the provider; pass it down. Otherwise toasts expire unseen in a background tab. |
| "De-duplicate." | Accept an `id` option; if a toast with that id is visible, update it instead of adding. |
| "Swipe to dismiss on mobile." | Pointer events tracking `translateX`; dismiss past a threshold, snap back otherwise. |

---

## 7. Scoring notes

- **Mid:** a list in state with a `setTimeout` per toast started in the add
  function; no queue, no pause, often the list lives in context.
- **Senior:** provider + stable hook with only the function in context,
  portal, queue as a slice so queued timers don't run, per-toast pausable
  timer with remaining time, sticky errors, pre-mounted polite/assertive live
  regions, and knows the external-store design for `toast()` outside React.
