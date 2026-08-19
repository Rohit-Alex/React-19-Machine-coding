# `useEffect`

> Source: [react.dev/reference/react/useEffect](https://react.dev/reference/react/useEffect) — verified against React 19 docs (project is on React 19.2, where `useEffectEvent` is stable).

`useEffect` lets you **synchronize a component with an external system** —
anything not controlled by React: a server connection, a browser API,
a third-party widget, a timer/subscription. **If you're not synchronizing
with something external, you probably don't need an Effect** — derive the
value during render, or compute it in an event handler instead.

```tsx
useEffect(setup, dependencies?);
```

Working examples for the genuinely new/tricky scenarios live in
[`useEffect/`](./useEffect). The functional-updater trick for reading state
inside an Effect without adding it as a dependency is **not** re-demoed —
same mechanic as [`useCallback/UpdaterFunction.tsx`](./useCallback/UpdaterFunction.tsx).
`Object.is` dependency comparison is explained in [`useMemo.md`](./useMemo.md#rules)
and applies identically here.

---

## Signature

```tsx
useEffect(setup, dependencies?);
```

### Parameters

| Parameter | Description |
|---|---|
| `setup` | The Effect's logic. May optionally return a **cleanup function**. React runs `setup` after the component commits. After every subsequent commit where a dependency changed, React runs cleanup (with the *old* values) first, then `setup` again (with the *new* values). Cleanup runs one final time when the component unmounts. |
| `dependencies` *(optional)* | Every reactive value (props, state, and anything else declared inside the component body) referenced inside `setup`. Fixed-length array written inline, compared with `Object.is`. If omitted, the Effect re-runs after **every** render. |

### Returns

`undefined`.

---

## Rules

- **Top-level only** — same as every Hook.
- **The dependency array isn't something you choose** — every reactive value read inside `setup` must be listed. You can't selectively omit one to "fix" a re-run; instead restructure the code so it's no longer a dependency (move it outside the component, move it inside the Effect, or use `useEffectEvent`). Suppressing the linter lies to React about what the Effect depends on and is a common source of bugs.
- **Cleanup must be symmetrical to setup** — undo exactly what setup did (`disconnect()` for `connect()`, `removeEventListener` for `addEventListener`). Cleanup code with no corresponding setup logic is a smell — it usually means the Effect is doing something React already handles for you (e.g. resetting state — prefer a `key` instead, see [`useState.md`](./useState.md#5-resetting-state-with-key)).

---

## Dependency array — the three modes

| Form | Behavior |
|---|---|
| `[a, b]` | Runs after mount, and after any commit where `a` or `b` changed. |
| `[]` | Runs **once**, after mount only (plus the Strict Mode dev double-cycle). |
| *(omitted)* | Runs after **every single render** — almost never what you want. |

---

## Caveats

- **In Strict Mode (dev only)**, React runs one extra setup → cleanup → setup cycle before the "real" mount, as a stress test. If this causes visible bugs, your cleanup is missing logic — a correct Effect should be indistinguishable between "ran once" (prod) and "ran, cleaned up, ran again" (dev). See [`Lifecycle.tsx`](./useEffect/Lifecycle.tsx).
- **Effects only run on the client** — never during server rendering.
- **Timing vs paint:** if the Effect wasn't triggered by an interaction, React lets the browser paint first, then runs the Effect (so it doesn't block visible updates). If it *was* triggered by an interaction, React may run it before paint. If an Effect does something visual and you see a flicker, that's the signal to reach for `useLayoutEffect` instead — rare in practice.
- **Object/function dependencies declared in the component body are a new reference every render**, so an Effect depending on one re-fires every commit regardless of whether the values inside actually changed. Fix by declaring the object/function *inside* the Effect itself so it depends on primitives instead. See [`UnstableDependency.tsx`](./useEffect/UnstableDependency.tsx) — this is the live version of the scenario [`useMemo.md`](./useMemo.md#3-preventing-an-effect-from-firing-too-often) described conceptually.

---

## Usage scenarios worth knowing

### 1. Connecting to an external system (the core mechanic)
Setup runs on mount; on every commit where a dependency changed, cleanup(old) then setup(new); cleanup runs once more on unmount. This "independent setup/cleanup cycle" mental model — not "on mount" / "on update" / "on unmount" — is the correct way to reason about any Effect. See [`Lifecycle.tsx`](./useEffect/Lifecycle.tsx).

### 2. Fetching data (and avoiding race conditions)
Effects don't have built-in request cancellation, so a slower earlier request can resolve *after* a faster later one and overwrite it with stale data. Guard with an `ignore` flag (or `AbortController`) set in cleanup. See [`RaceCondition.tsx`](./useEffect/RaceCondition.tsx).

> The docs are explicit that fetching directly in Effects has real downsides for production apps — no server-rendering support, request waterfalls, no caching/preloading. Prefer a framework's data layer or a client cache (TanStack Query, SWR) when available; fetching in a raw Effect is the fallback, not the default recommendation.

### 3. Removing unnecessary object/function dependencies
See the caveat above and [`UnstableDependency.tsx`](./useEffect/UnstableDependency.tsx).

### 4. Reading the latest props/state without reacting to them (`useEffectEvent`)
Sometimes an Effect should re-run when *one* value changes, but still needs to read the *latest* version of some other value without treating it as a dependency. `useEffectEvent` wraps that logic in a **non-reactive** function with a stable identity — it's always omitted from the dependency array, and always sees fresh values when called. Stable as of **React 19.2**. See [`EffectEvent.tsx`](./useEffect/EffectEvent.tsx).

### 5. Updating state based on previous state inside an Effect
Same fix as everywhere else in this repo — pass an updater function (`setCount(c => c + 1)`) instead of reading the state variable directly, so the state doesn't need to be a dependency. Already demoed — see [`useCallback/UpdaterFunction.tsx`](./useCallback/UpdaterFunction.tsx).

---

## Troubleshooting (from the docs)

| Symptom | Cause | Fix |
|---|---|---|
| Effect runs twice on mount | Strict Mode dev-only stress test | Expected in dev if cleanup is symmetrical to setup; if it causes visible bugs, your cleanup is incomplete. |
| Effect runs after **every** render | Missing dependency array, or a dependency's reference changes every render | Add the array; if still looping, log each dependency and compare with `Object.is` to find the unstable one, then apply scenario 3's fix (or as a last resort, `useMemo`/`useCallback` the value). |
| Effect stuck in an **infinite loop** | The Effect updates state, and that state change is itself one of the Effect's dependencies | First ask if the Effect needs to exist at all. If it's genuinely syncing an external system, check whether a `ref` is more appropriate than state (if the value isn't used in rendering). Otherwise debug per the row above. |
| Cleanup runs even though the component **didn't** unmount | Cleanup also runs before every re-run caused by a changed dependency — not just on unmount | Expected. If cleanup logic has no corresponding setup logic, that's the actual bug — remove it or find the React-native way to do what it's trying to do (e.g. a `key` reset instead of manual cleanup). |
| Visual flicker before the Effect runs | Effect fires after paint by default | Switch to `useLayoutEffect` — but this should be rare; most Effects don't need to block paint. |
