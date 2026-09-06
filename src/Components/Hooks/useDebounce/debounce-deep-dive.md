# Debounce: From Basic to Leading + Trailing (and a Hook)

Debouncing delays the execution of a function until a certain period of
inactivity. It's used for search inputs, resize events, scroll handlers, and
button clicks.

This is a from-scratch build-up: plain JavaScript first, then wrapped in a
React hook. Related code in this folder:

- `debounce.ts` — the standalone, framework-free function
- `useDebounceCallback.ts` — the React hook built on top of it
- `DebouncedSaveButton.tsx` — a demo using leading-only debounce

Steps:

1. Basic trailing debounce
2. The `this` context bug
3. Fixing the context issue
4. Extending the implementation for leading + trailing execution
5. Understanding the `trailing && !shouldCallLeading` condition
6. Wrapping it in a React hook
7. The stale-closure bug in the hook
8. Fixing it: `useRef` + `useMemo` + cleanup

---

## 1. Basic debounce (trailing only)

This is the most common implementation.

```js
function debounce(cb, delay) {
  let timeout;

  return function (...args) {
    if (timeout) clearTimeout(timeout);

    timeout = setTimeout(() => {
      cb(...args);
    }, delay);
  };
}
```

### How it works

Imagine a search input:

```js
search("r");
search("re");
search("rea");
search("react");
```

Every new call clears the previous timer.

```text
Time ─────────────────────────────────────────▶

Calls      r      re      rea      react
           ●──────●───────●────────●

Timer      ✖      ✖        ✖      [500ms]

Result                               search("react")
```

Only the **last invocation** is executed after the user stops typing. This
is called **trailing debounce** because the callback runs at the **end** of
the burst of events.

---

## 2. Hidden bug: `this` context gets lost

The implementation works for standalone functions, but it fails for object
methods.

```js
const user = {
  name: "Rohit",
  greet() {
    console.log(`Hello ${this.name}`);
  },
};

const debouncedGreet = debounce(user.greet, 500);
debouncedGreet();
```

**Expected:** `Hello Rohit`
**Actual:** `Hello undefined`

### Why does this happen?

`debounce(user.greet, 500)` doesn't _call_ `greet` — it only passes a
reference to it. Conceptually:

```js
const cb = user.greet;
```

Inside `debounce`, after 500ms, this executes:

```js
cb();
```

| Invocation     | Value of `this` |
| -------------- | --------------- |
| `user.greet()` | `user`          |
| `cb()`         | `undefined`     |

The rule: **`this` is determined by how a function is invoked, not where it
was defined.**

```text
user.greet()
    │
    └── this = user ✅

debounce(user.greet)
          │
          ▼
       cb()
          │
          └── this = undefined ❌
```

---

## 3. Fixing the context issue

The _wrapper_ function is the one actually being invoked, so it receives
the correct `this`. Capture it and forward it.

```js
function debounce(cb, delay) {
  let timeout;

  return function (...args) {
    const context = this;

    if (timeout) clearTimeout(timeout);

    timeout = setTimeout(() => {
      cb.apply(context, args);
    }, delay);
  };
}
```

`cb.apply(context, args)` means: execute `cb` with `this = context` and
pass all arguments. Now `user.debounced = debounce(user.greet, 500)`
correctly logs `Hello Rohit`.

At this point the debounce correctly preserves both arguments and `this`.

---

## 4. New requirement: leading debounce

So far, every call waits for the delay. But sometimes the _first_ call
should run immediately — e.g. preventing a double-clicked **Save** button.

```text
Time ─────────────────────────────▶

Clicks    ●    ●    ●    ●

Output    ✅
```

The first click should execute immediately; every remaining click during
the delay window should be ignored. The full matrix of behavior:

| Leading | Trailing | Behavior                                                  |
| ------- | -------- | --------------------------------------------------------- |
| ❌      | ✅       | Execute after inactivity                                  |
| ✅      | ❌       | Execute immediately once                                  |
| ✅      | ✅       | Execute immediately, then once more with the latest value |

---

## 5. Thought process behind the solution

An active timer already tells us something: if there's **no** timer
running, this must be the first call in the window.

```js
const shouldCallLeading = leading && !timeout;
```

- **First call:** `timeout` is `null` → `shouldCallLeading = true` → run
  immediately.
- **Subsequent calls:** `timeout` exists → `shouldCallLeading = false` →
  don't run immediately.

The timer still gets reset on every call, so only the latest invocation
survives for the trailing edge. Final implementation (`debounce.ts` in this
folder, typed for TypeScript):

```ts
export function debounce<Args extends unknown[]>(
  cb: (...args: Args) => void,
  delay: number,
  { leading = false, trailing = true }: DebounceOptions = {},
) {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  function debounced(this: unknown, ...args: Args) {
    const context = this;
    const shouldCallLeading = leading && !timeout;

    if (timeout) clearTimeout(timeout);

    if (shouldCallLeading) {
      cb.apply(context, args);
    }

    timeout = setTimeout(() => {
      if (trailing && !shouldCallLeading) {
        cb.apply(context, args);
      }
      timeout = null;
    }, delay);
  }

  return debounced;
}
```

---

## 6. Why `trailing && !shouldCallLeading`?

This is the most important line. A common question: _why not just
`if (trailing)`?_

Because that would make a **single invocation execute twice**.

```js
// Incorrect
timeout = setTimeout(() => {
  if (trailing) {
    cb.apply(context, args);
  }
  timeout = null;
}, delay);
```

```js
const log = debounce(console.log, 500, { leading: true, trailing: true });
log("A");
```

```text
0ms   ── Leading executes ──  A
500ms ── Trailing executes ── A
```

Output: `A`, `A` — wrong. A single call should only produce one execution.

With `trailing && !shouldCallLeading`, the first call remembers
`shouldCallLeading = true`, so after 500ms the check becomes
`trailing && !true` → `false`. No second execution.

**Multiple calls:**

```js
log("A");
log("B");
log("C");
```

```text
0ms   ── A executes immediately
      ── B resets timer
      ── C resets timer
500ms ── C executes
```

Output: `A`, `C` — exactly as expected.

| Configuration                    | Output for `A B C` |
| -------------------------------- | ------------------ |
| `leading: false, trailing: true` | `C`                |
| `leading: true, trailing: false` | `A`                |
| `leading: true, trailing: true`  | `A`, `C`           |

---

## 7. Wrapping it in a React hook — and the bug that comes with it

`debounce.ts` is framework-free — it works anywhere. Using it inside a
component looks tempting to do directly:

```tsx
// Don't do this
const save = debounce(() => submit(formValue), 1000, { leading: true });
```

This breaks in two ways specific to React:

- **Stale closure:** `debounce()` runs once per render, so `save` closes
  over whatever `formValue` was _at that render_. Click it later, after a
  few re-renders, and it still submits the old value.
- **No cleanup:** if the component unmounts while a trailing call is still
  pending, the `setTimeout` fires anyway and calls `cb` on an unmounted
  component — a classic source of "state update on an unmounted
  component" bugs (or worse, calling a mutation the user navigated away
  from).

## 8. The fix: `useRef` for the latest callback, `useMemo` for a stable debounced function, cleanup for unmount

Two problems, two tools:

- A `ref` always holds the _latest_ callback without needing to recreate
  the debounced function — so the closure inside `debounce()` never goes
  stale.
- The debounced function itself must stay the **same instance** across
  renders (via `useMemo`), otherwise every render would create a fresh
  timer and defeat debouncing entirely.
- `.cancel()` — added to `debounce.ts` as a small extra property on the
  returned function — clears any pending timeout, called from a
  `useEffect` cleanup so an unmount can't trigger a late, stale call.

```ts
export function useDebounceCallback<Args extends unknown[]>(
  cb: (...args: Args) => void,
  delay: number,
  { leading = false, trailing = true }: DebounceOptions = {},
) {
  const cbRef = useRef(cb);
  cbRef.current = cb; // always the latest callback, no stale closure

  const debounced = useMemo(
    () =>
      debounce<Args>((...args) => cbRef.current(...args), delay, {
        leading,
        trailing,
      }),
    [delay, leading, trailing], // same instance unless these change
  );

  useEffect(() => debounced.cancel, [debounced]); // cancel on unmount

  return debounced;
}
```

Because `cbRef.current` is read _inside_ the debounced call, not captured
at `useMemo` time, the hook can keep the same debounced function across
renders (stable timer) while still always calling the newest version of
`cb`.

See `DebouncedSaveButton.tsx` for this in action:
`useDebounceCallback(save, 1000, { leading: true, trailing: false })` runs
`save` on the first click and ignores clicks for the next second.

---

## Key takeaways

- Basic debounce cancels the previous timer and schedules a new one.
- Passing an object method loses `this` because the delayed callback
  invokes it as a bare `cb()`; `cb.apply(context, args)` restores it.
- `shouldCallLeading` identifies whether the current call is the first one
  in the debounce window.
- `trailing && !shouldCallLeading` stops the first call from firing twice
  while still letting the latest call run after the delay.
- Reusing the raw function inside a component introduces two new bugs:
  stale closures over props/state, and pending timers surviving unmount.
  `useRef` (latest callback) + `useMemo` (stable debounced instance) +
  `useEffect` cleanup (`.cancel()`) fix both.
