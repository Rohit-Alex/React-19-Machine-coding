# `useId`

> Source: [react.dev/reference/react/useId](https://react.dev/reference/react/useId) — verified against React 19 docs.

`useId` generates a unique ID string for a component instance, meant for
wiring up accessibility attributes (`htmlFor`/`id`, `aria-describedby`,
`aria-labelledby`, ...). The problem it solves: if you just hardcode an
`id="password"` and render that component twice on the same page, both
instances get the same DOM id — invalid HTML and broken `label`/`aria-*`
associations. `useId` gives every instance its own id, and — the part
that's easy to miss — it's the **same** id on the server and on the client,
so hydration doesn't mismatch.

`useId()` generates IDs for `accessibility`—not identities for `list items`. Using it to create React keys is effectively the same mistake as key={index}.

```tsx
const id = useId();
```

Two live demos: [`SharedPrefix.tsx`](./useId/SharedPrefix.tsx) (the
intended use — one `useId()` call reused as a prefix for a whole cluster of
related elements) and [`ListKeyMisuse.tsx`](./useId/ListKeyMisuse.tsx)
(the single most common interview trap — reaching for `useId` to key a
list). Everything else below is conceptual.

---

## Signature

```tsx
const id = useId();
```

### Parameters

None.

### Returns

A unique ID string associated with this particular `useId` call in this
particular component instance. Stable across re-renders of that instance.

---

## Rules / caveats

- **Top-level only** — same Hook rule as everywhere else; can't be called
  inside a loop, condition, or `.map()`, which is exactly why it can't be
  used to key a list (you'd need one call per item).
- **Don't use it as a list key.** Keys need to track the _data's_ identity
  across reorders/inserts/deletes; `useId` tracks the _component
  instance's_ position in the tree. See
  [`ListKeyMisuse.tsx`](./useId/ListKeyMisuse.tsx) for what goes wrong when
  you conflate the two.
- **Don't use it as a cache key for `use()`.** Same root issue — it's not
  derived from the data being cached.
- **Requires an identical component tree on server and client.** Server
  rendering assigns ids from the tree structure; if client hydration
  renders a different tree shape (conditional branches that differ,
  mismatched list lengths) the ids won't line up and hydration warns/fails.
- **Not usable in async Server Components** (`async function Component()`)
  — those don't have the per-render state `useId` relies on. It's fine in
  ordinary (non-async) Server Components and Client Components.
- **Multiple React roots on one page will generate colliding ids by
  default** — same prefix scheme, same tree shape often enough. Pass a
  distinct `identifierPrefix` to each `createRoot`/`hydrateRoot` call to
  keep them apart, and use the _same_ prefix on server and client for any
  root that's server-rendered (mismatched prefixes break hydration the
  same way a mismatched tree does).
- **Treat the string's exact shape as an implementation detail.** React 19
  generates ids like `_r_0_`/`_R_0_H1_` (underscore-delimited); React 18
  used a colon-delimited format (`:r0:`) instead. Don't parse or pattern-match
  the string — just pass it through to `id`/`aria-*`/`htmlFor`.

---

## Usage scenarios worth knowing

### 1. One id, many derived ids

Call `useId()` once per component and suffix the result (`` `${id}-firstName` ``)
instead of calling it once per field — cheaper, and it's the pattern the
docs themselves use. See [`SharedPrefix.tsx`](./useId/SharedPrefix.tsx).

### 2. Why it can't replace a data-derived key

The realistic version of this mistake isn't calling `useId()` inside
`.map()` — that's a Hook-rules error and won't even compile past the
linter. It's calling `useId()` _once_ above the list and appending the
index (`` `${listId}-${index}` ``), which reads like "I generated a proper
id for each row" but is functionally identical to `key={index}`: stable
per render, blind to the data. Reorder the array and React reuses each DOM
node for whatever now sits at that index — any state living in that row
(an uncontrolled input, local component state) stays behind instead of
following its item. See [`ListKeyMisuse.tsx`](./useId/ListKeyMisuse.tsx).

### 3. SSR/hydration id stability (conceptual)

On the server, `useId` derives the id from the component's position in the
render tree. On the client, hydration walks the same tree and reconstructs
the identical id — that's the whole point: no `useEffect`-based
"generate an id after mount" dance, and no server/client markup mismatch
warning for the id itself. This only holds if the tree shape genuinely
matches; see the caveat above.

---

## `useId` vs. hand-rolled id generation

|                                           | Manual (`Math.random()`, a module-level counter, uuid)                                 | `useId`              |
| ----------------------------------------- | -------------------------------------------------------------------------------------- | -------------------- |
| Unique per component instance             | Only if you're careful                                                                 | Yes, by construction |
| Stable across server/client render        | No — `Math.random()`/`Date.now()` differ per environment, causing hydration mismatches | Yes                  |
| Needs a `useEffect` to avoid SSR mismatch | Often, which then flashes a re-render post-hydration                                   | No                   |
| Safe as a list key                        | N/A — not what it's for either way                                                     | No — see above       |
