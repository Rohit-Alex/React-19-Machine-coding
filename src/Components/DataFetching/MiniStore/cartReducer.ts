export interface Product {
  id: string;
  name: string;
  price: number;
}
export interface CartLine {
  product: Product;
  qty: number;
}

export interface StoreState {
  cart: CartLine[];
  theme: "light" | "dark";
  checkout: { status: "idle" | "pending" | "success" | "error"; message?: string };
  /** Last few actions, for the on-page log — kept in state, so the reducer stays pure. */
  log: string[];
}

export type Action =
  | { type: "cart/add"; product: Product }
  | { type: "cart/setQty"; id: string; qty: number }
  | { type: "cart/remove"; id: string }
  | { type: "cart/clear" }
  | { type: "theme/toggle" }
  | { type: "checkout/started" }
  | { type: "checkout/succeeded"; orderId: string }
  | { type: "checkout/failed"; message: string };

export const initialState: StoreState = { cart: [], theme: "light", checkout: { status: "idle" }, log: [] };

// Plain data in, plain data out: no fetch, no storage, no Date.now(). Easy to
// test, safe under StrictMode's double call, and replayable.
function apply(state: StoreState, action: Action): StoreState {
  const inCart = (id: string) => state.cart.some((l) => l.product.id === id);
  switch (action.type) {
    case "cart/add": {
      const line = state.cart.find((l) => l.product.id === action.product.id);
      return {
        ...state,
        cart: line
          ? state.cart.map((l) => (l === line ? { ...l, qty: l.qty + 1 } : l))
          : [...state.cart, { product: action.product, qty: 1 }],
      };
    }
    case "cart/setQty":
      if (!inCart(action.id)) return state;
      // Qty 0 means remove: one rule, in one place.
      return action.qty <= 0
        ? apply(state, { type: "cart/remove", id: action.id })
        : { ...state, cart: state.cart.map((l) => (l.product.id === action.id ? { ...l, qty: action.qty } : l)) };
    case "cart/remove":
      // Nothing to do → return the SAME object. A new one would re-render
      // every component reading the store, for no change.
      if (!inCart(action.id)) return state;
      return { ...state, cart: state.cart.filter((l) => l.product.id !== action.id) };
    case "cart/clear":
      return state.cart.length ? { ...state, cart: [] } : state;
    case "theme/toggle":
      return { ...state, theme: state.theme === "light" ? "dark" : "light" };
    case "checkout/started":
      return { ...state, checkout: { status: "pending" } };
    case "checkout/succeeded":
      return { ...state, cart: [], checkout: { status: "success", message: `Order ${action.orderId} placed.` } };
    case "checkout/failed":
      return { ...state, checkout: { status: "error", message: action.message } };
    default: {
      const unreachable: never = action; // A new action type without a case won't compile.
      return unreachable;
    }
  }
}

export function storeReducer(state: StoreState, action: Action): StoreState {
  const next = apply(state, action);
  if (next === state) return state; // Nothing changed: same object, so React skips the render.
  return { ...next, log: [action.type, ...state.log].slice(0, 6) };
}

// Selectors: derived values computed from state, never stored in it.
export const selectCount = (state: StoreState) => state.cart.reduce((n, l) => n + l.qty, 0);
export const selectTotal = (state: StoreState) => state.cart.reduce((sum, l) => sum + l.qty * l.product.price, 0);
