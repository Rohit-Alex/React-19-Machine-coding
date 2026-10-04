import { createContext, use, useEffect, useReducer, type Dispatch, type ReactNode } from "react";
import { wait } from "../RaceConditions/fakeApi";
import { initialState, storeReducer, type Action, type CartLine, type StoreState } from "./cartReducer";

/*
 * Two contexts, not one. `dispatch` never changes, so components that only
 * send actions (an "Add to cart" button) read DispatchContext and never
 * re-render when the state changes.
 */
const StateContext = createContext<StoreState | null>(null);
const DispatchContext = createContext<Dispatch<Action> | null>(null);

const STORAGE_KEY = "mini-store-cart";

// Lazy initializer (useReducer's third argument): read storage once, on mount.
function init(): StoreState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? { ...initialState, cart: JSON.parse(saved) as CartLine[] } : initialState;
  } catch {
    return initialState; // Private mode, blocked storage, or bad JSON.
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(storeReducer, undefined, init);

  // Persistence is a side effect, so it lives here — not in the reducer.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.cart));
    } catch {
      // Storage full or blocked: the cart still works for this visit.
    }
  }, [state.cart]);

  return (
    <DispatchContext value={dispatch}>
      <StateContext value={state}>{children}</StateContext>
    </DispatchContext>
  );
}

export function useStoreState() {
  const state = use(StateContext);
  if (!state) throw new Error("useStoreState must be used inside <StoreProvider>");
  return state;
}

export function useDispatch() {
  const dispatch = use(DispatchContext);
  if (!dispatch) throw new Error("useDispatch must be used inside <StoreProvider>");
  return dispatch;
}

/**
 * An async "action": the reducer can't await, so async work happens outside
 * it and reports progress with plain actions. (Redux calls this a thunk.)
 */
export async function checkout(dispatch: Dispatch<Action>, cart: CartLine[], fail: boolean) {
  dispatch({ type: "checkout/started" });
  await wait(900); // Pretend to call the payments API.
  if (fail || cart.length === 0) dispatch({ type: "checkout/failed", message: "Payment declined (simulated)." });
  else dispatch({ type: "checkout/succeeded", orderId: `A${cart.length}${cart[0].qty}` });
}
