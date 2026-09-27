# `use`

> Source: [react.dev/reference/react/use](https://react.dev/reference/react/use) — verified against React 19 docs.

`use` reads the value of a **resource** — a Promise or a Context — inside
render. It's the only Hook that can be called conditionally and inside
loops, though the function calling it must still be a Component or a Hook.

```tsx
const value = use(resource);
```

Two live demos: [`ReadPromiseWithSuspense.tsx`](./ReadPromiseWithSuspense.tsx)
(reading a Promise, with `Suspense` for the pending state and a hand-written
error boundary for the rejected state — this repo has no
`react-error-boundary` dependency, so it's a small local class component
instead of the docs' exact example) and
[`ConditionalContextRead.tsx`](./ConditionalContextRead.tsx) (calling
`use(ThemeContext)` inside an `if`, mirroring the docs' `Button`/`Panel`
example). Everything else below is conceptual.

---

## Signature

```tsx
const value = use(resource);
```

### Parameters

| Parameter  | Description                                                              |
| ---------- | ------------------------------------------------------------------------ |
| `resource` | The source of the data you want to read — a Promise or a Context object. |

### Returns

- For a Promise: the value it resolved to. If called again with the same
  Promise while it's still pending, `use` suspends again.
- For a Context: the current context value, exactly like `useContext`.

If passed a pending Promise, `use` **suspends** the calling component —
React walks up to the nearest `Suspense` boundary and shows its fallback
until the Promise settles. If the Promise rejects, the nearest error
boundary's fallback is shown instead.

---

## Rules / caveats

- **Must be called inside a Component or a Hook** — that part of the Hook
  rules is not relaxed.
- **Unlike every other Hook, `use` can be called conditionally and inside
  loops and early returns.** See
  [`ConditionalContextRead.tsx`](./ConditionalContextRead.tsx), where
  `Button` only calls `use(ThemeContext)` inside `if (show) { ... }`.
- **In Server Components, prefer `await` over `use`.** `await` picks up
  rendering exactly where it left off once the Promise resolves; `use`
  instead triggers a re-render of the component once the Promise settles.
  Reach for `use` when the Promise might already be available from
  somewhere other than the current async component (e.g. passed down as a
  prop) — `await` only works at the point a Promise is created or received
  as a parameter in an async function.
- **Don't create a Promise directly in a Client Component's render and pass
  it straight to `use`.** A new Promise gets created on every render, so
  `use` never sees the same one twice and the component re-suspends
  forever. Instead, create the Promise once — in a Server Component and
  pass it down as a prop, or (as in
  [`ReadPromiseWithSuspense.tsx`](./ReadPromiseWithSuspense.tsx), since
  this app has no Server Component boundary) inside an event handler, and
  store the resulting Promise in state so it stays stable across renders.
- **The resolved value must be serializable across the server/client
  boundary** when the Promise is created in a Server Component and read in
  a Client Component — functions, for instance, can't be part of it.
- **Pairs with `Suspense` and error boundaries.** Wrap whatever calls
  `use(promise)` in a `<Suspense fallback={...}>` for the pending state, and
  in an error boundary for the rejected state — `use` doesn't have its own
  pending/error return values the way a manual `useEffect` + state
  approach would.

---

## Usage scenarios worth knowing

### 1. Reading a Promise with Suspense + an error boundary

The core case: a component that needs the resolved value of an
asynchronous resource, without hand-rolling `isLoading`/`error`/`data`
state via `useEffect`. See
[`ReadPromiseWithSuspense.tsx`](./ReadPromiseWithSuspense.tsx) — the
Promise is created once per click (kept stable in state, not recreated
every render), `Message` calls `use(messagePromise)`, `Suspense` shows a
fallback while it's pending, and a local `ErrorBoundary` class component
catches the rejection path.

### 2. Streaming a Promise from a Server Component to a Client Component

Not directly demonstrated here (this is a client-only Vite SPA with no RSC
boundary), but the docs' headline pattern for `use`: a Server Component
creates a Promise (without `await`-ing it, which would block that Server
Component's own render) and passes it as a prop to a Client Component. The
Client Component wraps `use(promise)` in `<Suspense>`, so the server can
keep streaming the rest of the page while that Promise resolves on the
client.

### 3. Reading Context conditionally

Ordinary Hooks must be called unconditionally at a component's top level;
`use` doesn't have that restriction for Context. See
[`ConditionalContextRead.tsx`](./ConditionalContextRead.tsx) — `Button`
only calls `use(ThemeContext)` when its `show` prop is true, while `Panel`
still calls it unconditionally (the default recommendation whenever the
call doesn't actually need to be conditional).

---

## `use` vs. other ways to read async data / context

|                                        | `useEffect` + manual state        | `use` + `Suspense`/error boundary             |
| -------------------------------------- | --------------------------------- | --------------------------------------------- |
| Loading state                          | Tracked by hand (`isLoading`)     | Declarative — nearest `Suspense` fallback     |
| Error state                            | Tracked by hand (`error`)         | Declarative — nearest error boundary          |
| Can be called conditionally            | No — top-level only               | Yes, for both Promises and Context            |
| Re-fetching a changed Promise identity | Manual effect dependency handling | Automatic — a new Promise just suspends again |

|                                      | `useContext`        | `use(SomeContext)`     |
| ------------------------------------ | ------------------- | ---------------------- |
| Reads the current Context value      | Yes                 | Yes — identical result |
| Can be called conditionally/in loops | No — top-level only | Yes                    |
