# Error boundaries (class-based today)

> **The question:** "What happens when a component throws? How do you stop
> one broken widget taking down the whole page?" Then the follow-up that
> catches people: "Which errors does an error boundary *not* catch?"

Runnable demo: [`index.tsx`](./index.tsx) · boundary + `useShowBoundary`:
[`ErrorBoundary.tsx`](./ErrorBoundary.tsx)

---

## 1. Why they exist

If a component throws while rendering and nothing catches it, React
**unmounts the whole app** — a blank page. That's deliberate: showing a
half-broken UI (wrong prices, a form saving to the wrong account) is worse
than showing nothing.

An error boundary catches render errors **from its children** and shows a
fallback instead, leaving the rest of the page running. In the demo, "Load
bad data" crashes the price widget; the header and footer stay.

Analogy: circuit breakers in a house. A fault in the kitchen trips the
kitchen's breaker; the lights in the rest of the house stay on.

---

## 2. The class (still a class in React 19.2)

```tsx
class ErrorBoundary extends Component<Props, { error: Error | null }> {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }   // render phase: switch to fallback
  componentDidCatch(error, info) { report(error, info.componentStack); }  // commit phase: side effects
  render() { return this.state.error ? this.props.fallback(…) : this.props.children; }
}
```

- **`getDerivedStateFromError`** — pure, returns new state. Shows the fallback.
- **`componentDidCatch`** — for logging. `info.componentStack` says which
  components the error came through — send it to your error tracker.
- There's **no hook equivalent**: function components can't be boundaries.
  React 19.2 still has no built-in function-component boundary; the
  `react-error-boundary` package (`<ErrorBoundary FallbackComponent
  resetKeys onError>`, `useErrorBoundary`) wraps this same class and is what
  most apps use. The roadmap's "upcoming primitives" — nothing official has
  shipped; say so rather than guess.

---

## 3. Recovering

A boundary that shows a fallback forever isn't much better than a crash.

- **"Try again"** — `reset()` clears the error and renders the children
  again. If the cause is still there, they fail again — that's fine.
- **`resetKeys`** — when the data that caused the crash changes (a new
  product, a new route), clear the error automatically. In the demo, "Load
  good data" after the crash recovers the widget with no click on Try again.
- **Reset by `key`** — `<ErrorBoundary key={productId}>` remounts the whole
  boundary (and children) on change. Simpler; also throws away children's
  state.

---

## 4. What a boundary does NOT catch

| Error thrown in… | Caught? | What to do |
| --- | --- | --- |
| Rendering (component body), lifecycle methods, effects | ✅ | — |
| **Event handlers** (`onClick`) | ❌ | `try/catch` there; show an error state, or hand it to the boundary |
| **Async code** (`setTimeout`, promise `.then`, `await` in a handler) | ❌ | Same |
| Errors in the boundary's **own** render | ❌ | Caught by the next boundary up |
| Server rendering | ❌ (the server can't show your fallback) | Streaming SSR falls back to client rendering for that Suspense boundary |
| **Inside `startTransition` / form Actions** (React 19) | ✅ | Errors thrown there reach the nearest boundary |

Why event handlers aren't caught: they don't run during rendering. React
isn't in the middle of building UI, so there's no "this part of the tree
failed" to replace. The page is still fine — just that action failed. The
demo's "Throw in onClick" shows it: the error goes to the console, and
nothing on the page changes.

### Sending an async error to the boundary on purpose

```ts
function useShowBoundary() {
  const [, setState] = useState();
  return (error) => setState(() => { throw error; });   // updater runs during the next render
}
```

The updater function runs while React renders, so throwing there is a render
error, and the boundary catches it. This is what `react-error-boundary`'s
`showBoundary` does. The demo's "Async error → boundary" uses it. Use it when
a failure means the widget really can't continue (its data failed to load);
for "Save failed, try again", a local error message is better.

---

## 5. Where to put boundaries

- **One at the root** — a friendly "Something went wrong, reload" page
  instead of a blank screen. Always.
- **Around each independent widget / route** — sidebar, feed, comments,
  charts. One failing doesn't take the others down.
- **Around lazy-loaded code** — chunks fail to load after deploys
  ([CodeSplitting](../../Performance/CodeSplitting/CodeSplitting.md#5-when-a-chunk-fails-to-load)).
- **Around `Suspense` for data** — a rejected promise is thrown like an error
  ([SuspenseData](../SuspenseData/SuspenseData.md)).
- **Not around every small component** — the fallback has to make sense in
  that spot.

React 19 also adds root-level hooks: `createRoot(el, { onCaughtError,
onUncaughtError, onRecoverableError })` — one place to report every error to
your monitoring service.

---

## 6. Follow-ups to expect

| They ask | Short answer |
| --- | --- |
| "Why still a class?" | Catching needs a lifecycle that runs when a *child* throws; hooks have no such entry point yet. Wrap the class once and use it everywhere. |
| "Report errors?" | `componentDidCatch` or `onError` → Sentry / your logger, with `componentStack`. Plus the React 19 root options for uncaught ones. |
| "Errors in development show an overlay anyway?" | In development React logs caught errors to the console too, so you see them; in production only your fallback shows. |
| "Retry a failed data load?" | Reset the boundary *and* clear the cached failed promise, or the retry re-throws the same rejection immediately. |
| "As a HOC?" | `withErrorBoundary(Component, Fallback)` — a reasonable HOC use ([HigherOrderComponents](../HigherOrderComponents/HigherOrderComponents.md)). |

---

## 7. Scoring notes

- **Mid:** one boundary at the root; thinks it catches everything.
- **Senior:** knows both lifecycles and why it's still a class; places
  boundaries per independent area; recovers with reset and `resetKeys`; lists
  what isn't caught (handlers, async, its own render, SSR) and how to route
  async errors in on purpose; reports with component stacks; knows React 19
  Actions errors reach boundaries and the root error options.
