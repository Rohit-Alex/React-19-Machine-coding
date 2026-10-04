import { useState, type ReactNode } from "react";
import { RenderCount } from "../../Performance/RenderCount";
import { selectCount, selectTotal, type Product } from "./cartReducer";
import { checkout, StoreProvider, useDispatch, useStoreState } from "./store";
import "../../Hooks/hook-demo.css";

const PRODUCTS: Product[] = [
  { id: "tea", name: "Masala tea", price: 120 },
  { id: "mug", name: "Clay mug", price: 350 },
  { id: "kettle", name: "Kettle", price: 1499 },
];

// Reads only dispatch → never re-renders when the cart changes.
const ProductList = () => {
  const dispatch = useDispatch();
  return (
    <div>
      <strong>Products</strong> <RenderCount />
      <ul style={{ paddingLeft: 18 }}>
        {PRODUCTS.map((p) => (
          <li key={p.id}>
            {p.name} — ₹{p.price} <button onClick={() => dispatch({ type: "cart/add", product: p })}>Add</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

const CartBadge = () => (
  <span>
    🛒 {selectCount(useStoreState())} <RenderCount />
  </span>
);

// Uses only the theme — but re-renders on every cart change too, because
// it reads the one state context. Context can't subscribe to a slice.
const ThemeToggle = () => {
  const { theme } = useStoreState();
  const dispatch = useDispatch();
  return (
    <span>
      <button onClick={() => dispatch({ type: "theme/toggle" })}>Theme: {theme}</button> <RenderCount />
    </span>
  );
};

const CartPanel = () => {
  const state = useStoreState();
  const dispatch = useDispatch();
  const [fail, setFail] = useState(false);
  const busy = state.checkout.status === "pending";
  return (
    <div>
      <strong>Cart</strong> <RenderCount />
      {state.cart.length === 0 ? (
        <p>Empty.</p>
      ) : (
        <ul style={{ paddingLeft: 18 }}>
          {state.cart.map(({ product, qty }) => (
            <li key={product.id}>
              {product.name}{" "}
              <button aria-label={`One fewer ${product.name}`} onClick={() => dispatch({ type: "cart/setQty", id: product.id, qty: qty - 1 })}>
                −
              </button>{" "}
              {qty}{" "}
              <button aria-label={`One more ${product.name}`} onClick={() => dispatch({ type: "cart/setQty", id: product.id, qty: qty + 1 })}>
                +
              </button>{" "}
              ₹{qty * product.price}
            </li>
          ))}
        </ul>
      )}
      <p>
        Total: <strong>₹{selectTotal(state)}</strong>
      </p>
      <label style={{ display: "block" }}>
        <input type="checkbox" checked={fail} onChange={(e) => setFail(e.target.checked)} /> Make payment fail
      </label>
      <div className="demo-actions">
        <button disabled={busy || !state.cart.length} onClick={() => checkout(dispatch, state.cart, fail)}>
          {busy ? "Paying…" : "Checkout"}
        </button>
        <button disabled={!state.cart.length} onClick={() => dispatch({ type: "cart/clear" })}>
          Clear
        </button>
      </div>
      <p role="status">{state.checkout.message}</p>
    </div>
  );
};

const ActionLog = () => (
  <div style={{ fontSize: 12, fontFamily: "monospace" }}>
    <strong>Actions (newest first)</strong>
    <ol style={{ paddingLeft: 18 }}>
      {useStoreState().log.map((type, i) => (
        <li key={i}>{type}</li>
      ))}
    </ol>
  </div>
);

const Themed = ({ children }: { children: ReactNode }) => {
  const { theme } = useStoreState();
  return (
    <div style={{ padding: 12, borderRadius: 8, background: theme === "dark" ? "#1e1e24" : "transparent", color: theme === "dark" ? "#eee" : "inherit" }}>
      {children}
    </div>
  );
};

export const MiniStoreDemo = () => (
  <section>
    <h2>Context + useReducer as a mini global store</h2>
    <p>
      Writeup: <code>src/Components/DataFetching/MiniStore/MiniStore.md</code>. One reducer, actions
      from anywhere, state and dispatch in separate contexts. The cart survives a reload.
    </p>
    <StoreProvider>
      <div className="demo-card">
        <Themed>
          <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 8 }}>
            <CartBadge />
            <ThemeToggle />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
            <ProductList />
            <CartPanel />
            <ActionLog />
          </div>
        </Themed>
        <p style={{ fontSize: 13 }}>
          Watch the render counts: <em>Products</em> never re-renders (it only dispatches).{" "}
          <em>Theme</em> re-renders on every cart change though it only uses the theme — the limit of
          one state context.
        </p>
      </div>
    </StoreProvider>
  </section>
);
