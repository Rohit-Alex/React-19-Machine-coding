# Context + `useReducer` as a mini global store

> **The question:** "Build a cart that any component can read and update,
> without Redux." Or: "When is Context + `useReducer` enough, and when do you
> need a real state library?"
>
> The build is short. The marks are for the reducer's purity, splitting state
> from dispatch, where async work and persistence go — and knowing exactly
> where this pattern stops scaling.

Runnable demo: [`index.tsx`](./index.tsx) · provider and hooks:
[`store.tsx`](./store.tsx) · reducer, actions, selectors (no React):
[`cartReducer.ts`](./cartReducer.ts)

Hook basics are in Phase 1: [useReducer](../../Hooks/useReducer/useReducer.md),
[useContext](../../Hooks/useContext/useContext.md).

---

## 1. The shape

```
 component ──dispatch({ type: "cart/add", product })──► reducer(state, action) ──► new state
     ▲                                                                            │
     └──────────────────── StateContext (re-render readers) ◄─────────────────────┘
```

- **One reducer** holds every rule for changing the store.
- **Components never change state directly**; they dispatch *what happened*.
- **The provider** runs `useReducer` and shares the result through context.

Analogy: a bank. You don't open the vault and move money yourself; you hand
the teller a slip ("deposit ₹500"). The teller (reducer) applies the bank's
rules and updates the ledger. Everyone reads the same ledger.

---

## 2. The reducer: pure, typed, exhaustive

```ts
type Action =
  | { type: "cart/add"; product: Product }
  | { type: "cart/setQty"; id: string; qty: number }
  | { type: "cart/remove"; id: string }
  | …;

function apply(state: StoreState, action: Action): StoreState {
  switch (action.type) {
    case "cart/add": …
    default: {
      const unreachable: never = action;   // a new action without a case won't compile
      return unreachable;
    }
  }
}
```

- **Pure**: no fetch, no `localStorage`, no `Date.now()`. Same input, same
  output — so it's safe under StrictMode's double call, easy to test, and
  could replay a list of actions to rebuild state. It's in its own file with
  no React, and was checked in Node: 2 × tea + 1 mug → count 3, total ₹590;
  setting qty to 0 removes the line; checkout success empties the cart; the
  input state is never mutated.
- **`"slice/event"` names** (`cart/add`, `checkout/failed`) group actions by
  area — the Redux convention, and it makes the log readable.
- **Rules live in one place**: "qty 0 means remove" is in the reducer, not in
  every `−` button.

### Return the same object when nothing changes

```ts
case "cart/remove":
  if (!inCart(action.id)) return state;   // nothing to do → same object
```

The first version always returned `{ ...state, cart: filtered }` — a **new**
object even when the id wasn't in the cart (caught by the Node check). React
compares state with `Object.is`; a new object means every reader re-renders
for no change. Returning `state` lets React skip the render entirely.

### Derived values: selectors, not state

```ts
export const selectCount = (s: StoreState) => s.cart.reduce((n, l) => n + l.qty, 0);
export const selectTotal = (s: StoreState) => s.cart.reduce((sum, l) => sum + l.qty * l.product.price, 0);
```

Never store `count` or `total` next to `cart` — they'd have to be updated in
every case and would drift. Compute them.

---

## 3. Two contexts: state and dispatch

```tsx
<DispatchContext value={dispatch}>
  <StateContext value={state}>{children}</StateContext>
</DispatchContext>
```

`dispatch` from `useReducer` **never changes**. Components that only send
actions read `DispatchContext` and **never re-render when state changes** —
in the demo, *Products* keeps its render count at 1 however much you add to
the cart. With one context holding `{ state, dispatch }`, every "Add" button
would re-render on every cart change.

The hooks throw outside the provider (`useStoreState must be used inside
<StoreProvider>`) instead of failing with a `null` error deep inside.

---

## 4. Async work and persistence: outside the reducer

**Async ("thunks"):**

```ts
async function checkout(dispatch, cart, fail) {
  dispatch({ type: "checkout/started" });
  await payApi(cart);
  dispatch(ok ? { type: "checkout/succeeded", orderId } : { type: "checkout/failed", message });
}
```

The reducer can't `await`. Async work runs in a plain function that reports
each stage as an action — so the UI shows *Paying…*, success, or the error,
all from state. Redux calls this a thunk; it's just a function that has
`dispatch`.

**Persistence:**
- **Load once** with `useReducer`'s third argument — a lazy initializer that
  reads `localStorage` on mount (not on every render).
- **Save in an effect** when `state.cart` changes.
- Both wrapped in `try/catch`: storage can be blocked (private mode), full,
  or hold bad JSON. The cart should still work.

Add something, reload the page — the cart is still there.

**Logging** (the demo's action list) is done *purely*: the reducer adds the
action's type to `state.log`. No side effect, and it shows what Redux DevTools
gives you for free.

---

## 5. Where it stops scaling

Watch *Theme* in the demo: it only uses `theme`, but its render count goes up
on **every cart change**. A context has no "subscribe to one field": when the
state object changes, **every** `useStoreState()` caller re-renders.

Fine for a cart badge and a few panels. Not fine for:
- many components reading **small slices** of a big store;
- **frequent** updates (typing, drag, live data).

Fixes, in order of effort:
1. **Split the store** — a separate provider per area (`CartProvider`,
   `ThemeProvider`) — see [ContextPerformance](../../Performance/ContextPerformance/ContextPerformance.md).
2. **An external store with selectors** — keep the same reducer, but hold
   state outside React and subscribe with `useSyncExternalStore(subscribe,
   () => selector(store.get()))`, so a component re-renders only when *its*
   slice changes. The [FormLibrary](../../MachineCoding/FormLibrary/FormLibrary.md)
   and [ParkingLot](../../MachineCoding/ParkingLot/ParkingLot.md) builds use
   this.
3. **A library** — Zustand (that pattern, packaged), Redux Toolkit (reducers,
   selectors, DevTools, middleware), Jotai (atoms).

And **server data** (products, orders) usually belongs in a data cache like
TanStack Query, not in a global store — the store holds client state (cart,
theme, UI).

---

## 6. Follow-ups to expect

| They ask | Short answer |
| --- | --- |
| "Why not `useState` in a provider?" | Fine for one or two values. A reducer wins once updates have rules, several fields change together, or you want actions you can log and test. |
| "How is this different from Redux?" | Same idea (actions → pure reducer → state). Redux adds an external store (so selectors avoid extra re-renders), middleware, DevTools, and Toolkit's less-verbose slices. |
| "Middleware?" | Wrap `dispatch`: `const enhanced = (action) => { log(action); dispatch(action); }`, and put the enhanced one in the dispatch context. Keep it stable (`useCallback`). |
| "Undo / time travel?" | Store past states or commands next to the present ([TodoUndoRedo](../../MachineCoding/TodoUndoRedo/TodoUndoRedo.md)). Pure reducers make this possible. |
| "Testing?" | Test the reducer directly — plain functions, no rendering. A few component tests for wiring. |
| "Server rendering?" | Each request needs its own store (the provider gives that for free). Never a module-level store holding user data on the server. |

---

## 7. Scoring notes

- **Mid:** one context with `{ state, dispatch }`; side effects inside the
  reducer; `count` stored in state.
- **Senior:** pure, typed, exhaustive reducer that returns the same object
  for no-ops; selectors for derived data; separate state and dispatch
  contexts; async as functions dispatching stage actions; lazy-init plus
  effect persistence with error handling; and a clear story for when to split,
  move to `useSyncExternalStore` selectors, or adopt Zustand / Redux Toolkit.
