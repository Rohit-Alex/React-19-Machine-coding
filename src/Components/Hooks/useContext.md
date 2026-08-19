# `useContext`

> Source: [react.dev/reference/react/useContext](https://react.dev/reference/react/useContext) — verified against React 19 docs.

`useContext` reads a value provided by the closest matching context
provider above the calling component in the tree — no matter how many
layers of components sit in between, and without passing that value down
as a prop through every one of them.

```tsx
const value = useContext(SomeContext);
```

Two live demos: [`ThemeDrilling.tsx`](./useContext/ThemeDrilling.tsx)
(passing data deeply + the "closest provider wins" override rule) and
[`SplitContext.tsx`](./useContext/SplitContext.tsx) (the re-render
implication of context, and splitting one context into two to avoid
unnecessary re-renders). Everything else below is conceptual.

---

## Signature

```tsx
const value = useContext(SomeContext);
```

### Parameters

| Parameter | Description |
|---|---|
| `SomeContext` | The context object created with `createContext(defaultValue)`. The context object itself holds no data — it's just an identity that a provider and its consumers agree on. |

### Returns

The context value for the calling component: the `value` prop of the
**closest** matching provider above it in the tree, or `defaultValue` from
`createContext` if there's no provider above at all.

### React 19: provider syntax

You render the context itself as the provider — `<SomeContext.Provider>`
is no longer required (though still works):

```tsx
// React 19+
<ThemeContext value="dark">
  <Form />
</ThemeContext>
```

---

## Rules

- **Top-level only** — same Hook rule as every other hook.
- **Only looks upward.** A provider rendered by the *same* component that
  calls `useContext()`, or lower in the tree, has no effect on that call —
  the provider must be an ancestor. See
  [`ThemeDrilling.tsx`](./useContext/ThemeDrilling.tsx).
- **Always pass `value`.** `<ThemeContext>` with no `value` prop is
  `value={undefined}` — an explicit provider always wins over the
  `defaultValue`, even when it provides `undefined`. A missing/renamed prop
  (e.g. `theme={theme}` instead of `value={theme}`) is a common typo that
  silently falls through to `undefined`, not the default.

---

## Caveats

- **Re-renders propagate from the provider down**, comparing the new
  `value` to the old one with `Object.is` — if it changed, **every**
  descendant that calls `useContext()` on that context re-renders, and
  **`memo` does not stop this** (memo only blocks re-renders caused by the
  *parent* re-rendering with the same props — a changed context value is a
  separate re-render trigger). See
  [`SplitContext.tsx`](./useContext/SplitContext.tsx).
- **Passing an object/function literal as `value`** creates a new
  reference every render of the provider, so consumers re-render even if
  the underlying data didn't change. Fix with `useMemo`/`useCallback` —
  identical mechanic already covered in
  [`useMemo.md`](./useMemo.md)/[`useCallback.md`](./useCallback.md), not
  re-demoed here.
- **Duplicate module instances** (e.g. from a symlinked package or a
  monorepo misconfiguration) mean the context object used to provide and
  the one used to read aren't `===`, and reading always falls back to the
  default. Rare, but the classic "context works everywhere except this one
  package" bug report.

---

## Usage scenarios worth knowing

### 1. Passing data deeply / avoiding prop drilling
The textbook case: a value needed by a deeply nested component, without
manually threading it as a prop through every component in between that
doesn't otherwise care about it. See
[`ThemeDrilling.tsx`](./useContext/ThemeDrilling.tsx).

### 2. Overriding context for part of the tree
Providers nest and override freely — a consumer always resolves to the
*closest* provider above it, so wrapping only a subtree in a second
provider changes the value for just that subtree. Same demo as #1 — it's
the natural extension of "closest provider wins."

### 3. Updating context values
Context itself has no setter — pair it with `useState` (simple values) or
`useReducer` (related values / many action types) in the provider, and put
both the value and the updater function into context. This is exactly the
"mini global store" pattern — see Phase 3 of the roadmap for a fuller
build; [`SplitContext.tsx`](./useContext/SplitContext.tsx) shows the
minimal version (state context + dispatch context from
[`useReducer`](./useReducer.md)).

### 4. Splitting contexts to limit re-renders
If one context bundles a frequently-changing value with a rarely-changing
one (or a value with its updater function), every consumer re-renders on
every change, even ones that only read the stable part. Splitting into two
contexts — e.g. a state context and a dispatch context — lets consumers
that only need `dispatch` (whose identity never changes, see
[`useReducer.md`](./useReducer.md#parameters)) skip re-rendering entirely
when only the state changes. See
[`SplitContext.tsx`](./useContext/SplitContext.tsx).

---

## Troubleshooting (from the docs)

| Symptom | Cause | Fix |
|---|---|---|
| Component doesn't see the provided value | Provider is rendered in the same component (or below) the `useContext()` call | Move the provider to an actual ancestor in JSX. |
| Component doesn't see the provided value | Forgot to wrap the component in the provider at all, or it's in the wrong branch of the tree | Verify the tree with React DevTools' Components panel. |
| Always gets the default value, never the provided one | Duplicate module instance (symlinks/monorepo) — provided and read contexts aren't `===` | Dedupe the package, or compare context object identity directly. |
| Always gets `undefined` | Provider is missing the `value` prop, or uses the wrong prop name | Always pass `value={...}` explicitly. |
