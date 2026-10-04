# `Suspense` for data fetching, not just lazy loading

> **The question:** "How does Suspense work with data? What's the difference
> from `useEffect` + `isLoading`?" — and the senior follow-up: "Your page
> loads in 2 seconds but each request takes 1. Why?" (A waterfall.)

Runnable demo: [`index.tsx`](./index.tsx) · the promise cache:
[`cache.ts`](./cache.ts) · error boundary (reused):
[`ErrorBoundary.tsx`](../ErrorBoundaries/ErrorBoundary.tsx)

The `use` API itself (signature, rules, server→client promises) is in
Phase 1: [use.md](../../Hooks/use/use.md).

---

## 1. The idea

```tsx
function Profile({ userPromise }) {
  const user = use(userPromise);   // not ready? → suspend
  return <h2>{user.name}</h2>;     // written as if the data is always there
}

<Suspense fallback={<Spinner />}>
  <Profile userPromise={getUser(id)} />
</Suspense>
```

- The component **reads** the data. No `isLoading`, no `if (!user) return`.
- If the promise isn't resolved, the component **suspends**; React shows the
  nearest `<Suspense>` fallback, and tries again when the promise settles.
- If the promise **rejects**, the error goes to the nearest **error
  boundary** — so loading and error states move *out* of the component, into
  boundaries around it.

Analogy: a restaurant where each dish arrives when it's ready, and the waiter
(Suspense) decides what you see meanwhile — "your starters are coming" — so
the chef (the component) only cooks, and never has to talk to you about
waiting.

---

## 2. The rule that trips everyone: the promise must be cached

```tsx
const user = use(fetchUser(id));     // ❌ a new promise every render → suspends forever
const user = use(getUser(id));       // ✅ same promise for the same id (cache)
```

When the promise resolves, React re-renders the component. If the render
makes a *new* promise, it's pending again — and React suspends again, forever.
So promises must come from a **cache keyed by the request** (the demo's
`cached(key, load)`), from a parent that created them once, or from a library.

That cache is the hard part in real apps: invalidation, refetching, memory.
It's why Suspense data fetching is normally done **through** a library or
framework — TanStack Query (`useSuspenseQuery`), Relay, Next.js / React
Router loaders, Server Components — not with a hand-made `Map`.

Retrying after an error means **clearing the cached rejected promise**, or
the retry reads the same rejection immediately. The demo's Retry does that.

---

## 3. Waterfalls: when you start fetching matters

```tsx
// Waterfall: Posts only exists after Profile has its user.
<Profile userPromise={getUser(id)}>
  <Posts postsPromise={getPosts(id)} />    // getPosts runs when this renders
</Profile>

// Parallel: start both before anything suspends.
const userPromise = getUser(id);
const postsPromise = getPosts(id);
<Profile userPromise={userPromise} />
<Posts postsPromise={postsPromise} />
```

User takes 0.8s, posts 1.2s. The demo shows the times:
- **Waterfall** — the posts request can't start until the user has loaded:
  ~0.8 + 1.2 = **~2s**.
- **Parallel** — both start together: **~1.2s**.

"Fetch in the component that needs it" (the `useEffect` habit) creates
waterfalls whenever components are nested. The fix is to **start fetches as
early as possible** — in the parent, a route loader, or the click handler that
navigates — and pass promises down. Analogy: ordering starters and mains at
the same time, instead of ordering mains after the starters arrive.

---

## 4. Boundaries decide the reveal order

- **Separate boundaries** (default in the demo): the profile appears at 0.8s,
  posts at 1.2s. Faster first content.
- **One boundary for both** (checkbox): nothing until 1.2s, then everything
  together. Calmer — no layout shifting in pieces.

Neither is "right": group things that should appear together, separate
things that are independent. Nested boundaries give a skeleton that fills in
from the outside in.

---

## 5. Changing what's shown: transitions

Switching from user 1 to user 2 suspends again. Without a transition, the
whole area drops back to its fallback — the old content vanishes, then a
spinner, then the new content.

```ts
startTransition(() => setUserId(2));
```

In a transition, React **keeps the old UI on screen** (the demo dims it via
`isPending`) until the new one is ready. Untick "Switch users in a transition"
to see the difference. Routers wrap navigation in transitions for this reason.
Fallbacks then only show on first load.

---

## 6. Suspense vs `useEffect` + loading state

| | `useEffect` + `isLoading` | Suspense + `use` |
| --- | --- | --- |
| Loading UI | inside each component | in boundaries around components |
| Error UI | inside each component | in error boundaries |
| Race conditions | you handle them ([RaceConditions](../../DataFetching/RaceConditions/RaceConditions.md)) | each key has its own promise; no stale `setState` |
| Starts fetching | after first render (an effect) | when the promise is created — can be before render |
| Several loaders | each component flickers on its own | boundaries coordinate them |
| Needs | nothing | a promise cache |

---

## 7. Follow-ups to expect

| They ask | Short answer |
| --- | --- |
| "Server rendering?" | Streaming SSR sends the shell with fallbacks, then streams each boundary's HTML as its data resolves. Server Components can pass a promise to a client component that `use`s it. |
| "Mutations?" | Not Suspense — use Actions (`useActionState`, `useOptimistic`, form actions). Then invalidate the cache and re-read. |
| "Preload on hover?" | Call `getUser(id)` on hover; by the click, the promise may already be resolved. Same idea as preloading code ([CodeSplitting](../../Performance/CodeSplitting/CodeSplitting.md#3-preload-before-the-click)). |
| "Can I `use` inside a condition?" | Yes — unlike hooks, `use` can be called conditionally. The promise still must be cached. |
| "Avoid a fallback flash for fast requests?" | Transitions for updates; for first load, design the fallback as a skeleton that matches the final layout so a quick swap isn't jarring. |

---

## 8. Scoring notes

- **Mid:** knows Suspense shows a fallback for `lazy`; for data, still uses
  effects and loading flags.
- **Senior:** explains suspend/retry and errors going to boundaries; knows
  `use` needs a cached promise (and retry must clear a rejected one); spots
  and fixes waterfalls by starting fetches early; places boundaries to control
  the reveal; uses transitions so updates don't flash fallbacks; and knows
  libraries/frameworks provide the cache in practice.
