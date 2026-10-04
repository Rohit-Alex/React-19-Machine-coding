# Avoiding prop-drilling-induced re-renders (context splitting, composition)

> **The question:** "We moved shared state into context to stop prop
> drilling. Now adding to the cart re-renders half the app. Why, and how do
> you fix it without a state library?"
>
> Context solves *passing* data; it doesn't make updates cheap. Three things
> decide what re-renders: **where the state lives**, **what's in each
> context**, and **whether the value is stable**.

Runnable demo: [`index.tsx`](./index.tsx) · the three versions:
[`Scenarios.tsx`](./Scenarios.tsx)

Context basics (provider syntax, `use(Context)`, overriding) are in Phase 1:
[useContext.md](../../Hooks/useContext/useContext.md#4-splitting-contexts-to-limit-re-renders).

---

## 1. The two rules

1. **When a component's state changes, it and everything it renders
   re-render** — whether or not they use context.
2. **When a context value changes, every component that reads that context
   re-renders** — even if it only uses a part of the value that didn't
   change. There's no "subscribe to one field".

Prop drilling has rule 1 only. Moving to context *without* thinking about
rule 2 often makes it worse.

---

## 2. The three versions (press "Add to cart")

| | Page content (no context) | Theme badge | User name | Cart icon | Buttons |
| --- | --- | --- | --- | --- | --- |
| **A.** One context, state in the page's parent | re-renders | re-renders | re-renders | ✅ re-renders | re-renders |
| **B.** One context, provider takes `children` | **skipped** | re-renders | re-renders | ✅ re-renders | re-renders |
| **C.** Split contexts + separate actions | skipped | **skipped** | **skipped** | ✅ re-renders | **skipped** |

Only the cart icon needs to re-render. C gets there with no `memo` anywhere.

---

## 3. A → B: composition (`children` don't re-render)

```tsx
// A: the state's owner also creates the page
const App = () => {
  const store = useStoreState();
  return <StoreContext value={store}><Header /><SlowPage /></StoreContext>;
};

// B: the state's owner only receives the page
const StoreProvider = ({ children }) => {
  const store = useStoreState();
  return <StoreContext value={store}>{children}</StoreContext>;
};
const App = () => <StoreProvider><Header /><SlowPage /></StoreProvider>;
```

In B, `<SlowPage />` is created by `App`, which doesn't re-render when the
cart changes. When `StoreProvider` re-renders, `children` is the **same
element object** as last time, and React skips it. Same rule as
[`memo`](../Memoization/Memoization.md), with no `memo`.

Analogy: a courier (the provider) carrying a sealed parcel (`children`). When
the courier's route changes, they don't repack the parcel — it's the same
parcel they were handed.

This is the most underused performance tool in React: **put state in a
component that takes `children`**, and the subtree below is safe.

---

## 4. B → C: split by what changes together

```tsx
<ActionsContext value={actions}>      // stable forever (useMemo, [])
  <ThemeContext value={theme}>
    <UserContext value={user}>
      <CartContext value={cartCount}>{children}</CartContext>
```

- **One context per kind of data that changes on its own.** The cart changes
  often; the theme rarely; the user almost never. In one object, a cart
  change re-renders everything that reads the theme.
- **Actions in their own context.** `addToCart` and `toggleTheme` never
  change (they use the updater form, so they need no data). Components that
  only *do* things — buttons — read only the actions and never re-render
  when the data changes.

The same split in one line: **state and dispatch in separate contexts** — the
classic `useReducer` + context setup (the Phase 3 "mini global store" item).

---

## 5. Stable values: `useMemo` the provider value

```tsx
const value = useMemo(() => ({ user, logout }), [user, logout]);   // ✅
<AuthContext value={{ user, logout }}>                              // ❌ new object each render
```

If the provider's component re-renders for **any** reason, an inline object
is a new value, and **every consumer re-renders** even though nothing in it
changed. Memoise objects you pass as a value (primitives like `cartCount`
are already stable).

---

## 6. When context isn't the right tool

- **Fast-changing values read in many places** (mouse position, scroll,
  a live price) — every reader re-renders on every change. Use a small
  external store with **selectors**: components subscribe to just the slice
  they read (`useSyncExternalStore`, or Zustand / Redux, which do exactly
  this). The [FormLibrary](../../MachineCoding/FormLibrary/FormLibrary.md) and
  [ParkingLot](../../MachineCoding/ParkingLot/ParkingLot.md) builds use this
  pattern.
- **Data only two levels down** — pass props. Prop drilling of one or two
  levels is clearer than a context.
- **Server data** — a data-fetching cache (TanStack Query) rather than putting
  responses in context.

---

## 7. Follow-ups to expect

| They ask | Short answer |
| --- | --- |
| "`memo` the consumers?" | Doesn't help: a context change re-renders a consumer even through `memo`. `memo` only helps the *non-consumers* in between — and composition does that for free. |
| "Read only part of a context?" | Not possible with context. Split the context, or wrap the consumer: a small component reads the context and passes the one field to a `memo` child. Or a store with selectors. |
| "Does the React Compiler fix this?" | Partly: it memoises the provider value and children's JSX, so A behaves more like B. It doesn't change rule 2 — consumers of a changed context still re-render. See [ReactCompiler](../ReactCompiler/ReactCompiler.md). |
| "Context selector libraries?" | `use-context-selector` adds selectors to context. Mostly superseded by small stores (Zustand, Jotai). |
| "How do you find this in a real app?" | Profiler with "why did this render": "Context changed" on many components after one click ([Profiler](../Profiler/Profiler.md)). |

---

## 8. Scoring notes

- **Mid:** one big context, inline value object; fixes re-renders with `memo`
  on consumers (which doesn't work).
- **Senior:** explains both rules; uses composition so non-consumers are
  skipped; splits contexts by update frequency with actions separate;
  memoises object values; knows when to switch to a store with selectors;
  confirms with the Profiler.
