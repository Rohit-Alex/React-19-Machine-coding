import { createContext, use, useMemo, useState, type ReactNode } from "react";
import { RenderCount, slowDown } from "../RenderCount";

type Theme = "light" | "dark";

/** A page section that uses no shared state at all. ~20ms to render. */
const SlowPage = () => {
  slowDown(20);
  return (
    <p style={{ fontSize: 13 }}>
      📄 Page content (uses no shared state) <RenderCount />
    </p>
  );
};

const Row = ({ children }: { children: ReactNode }) => <div style={{ display: "flex", gap: 8, alignItems: "center", margin: "4px 0" }}>{children}</div>;

// ---------- One big context (versions A and B) ----------

interface Store {
  theme: Theme;
  user: string;
  cartCount: number;
  toggleTheme: () => void;
  addToCart: () => void;
}
const StoreContext = createContext<Store | null>(null);
const useStore = () => use(StoreContext)!;

const BigThemeBadge = () => (
  <Row>
    🎨 Theme: {useStore().theme} <RenderCount />
  </Row>
);
const BigUserName = () => (
  <Row>
    👤 {useStore().user} <RenderCount />
  </Row>
);
const BigCartIcon = () => (
  <Row>
    🛒 {useStore().cartCount} items <RenderCount />
  </Row>
);
const BigButtons = () => {
  const { addToCart, toggleTheme } = useStore();
  return (
    <Row>
      <button onClick={addToCart}>Add to cart</button>
      <button onClick={toggleTheme}>Toggle theme</button>
      <RenderCount label="buttons" />
    </Row>
  );
};
const BigLeaves = () => (
  <>
    <BigThemeBadge />
    <BigUserName />
    <BigCartIcon />
    <BigButtons />
  </>
);

function useStoreState() {
  const [theme, setTheme] = useState<Theme>("light");
  const [cartCount, setCartCount] = useState(0);
  return {
    theme,
    user: "Asha",
    cartCount,
    toggleTheme: () => setTheme((t) => (t === "light" ? "dark" : "light")),
    addToCart: () => setCartCount((c) => c + 1),
  };
}

// A: state in the component that also renders the page. A cart change
// re-renders this component, so everything it renders re-renders — page included.
export const StateInParent = () => {
  const store = useStoreState();
  return (
    <StoreContext value={store}>
      <BigLeaves />
      <SlowPage />
    </StoreContext>
  );
};

// B: the state moves into a provider component that takes `children`. The
// children were created by the parent, which didn't re-render, so React
// skips them. Only context consumers re-render — but all of them.
const StoreProvider = ({ children }: { children: ReactNode }) => {
  const store = useStoreState();
  return <StoreContext value={store}>{children}</StoreContext>;
};
export const ProviderWithChildren = () => (
  <StoreProvider>
    <BigLeaves />
    <SlowPage />
  </StoreProvider>
);

// ---------- Split contexts (version C) ----------

const ThemeContext = createContext<Theme>("light");
const UserContext = createContext("");
const CartContext = createContext(0);
interface Actions {
  toggleTheme: () => void;
  addToCart: () => void;
}
const ActionsContext = createContext<Actions | null>(null);

const SplitProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<Theme>("light");
  const [cartCount, setCartCount] = useState(0);
  // Actions never change, so components that only *do* things (buttons)
  // never re-render when the data changes.
  const actions = useMemo<Actions>(
    () => ({
      toggleTheme: () => setTheme((t) => (t === "light" ? "dark" : "light")),
      addToCart: () => setCartCount((c) => c + 1),
    }),
    [],
  );
  return (
    <ActionsContext value={actions}>
      <ThemeContext value={theme}>
        <UserContext value="Asha">
          <CartContext value={cartCount}>{children}</CartContext>
        </UserContext>
      </ThemeContext>
    </ActionsContext>
  );
};

const SplitThemeBadge = () => (
  <Row>
    🎨 Theme: {use(ThemeContext)} <RenderCount />
  </Row>
);
const SplitUserName = () => (
  <Row>
    👤 {use(UserContext)} <RenderCount />
  </Row>
);
const SplitCartIcon = () => (
  <Row>
    🛒 {use(CartContext)} items <RenderCount />
  </Row>
);
const SplitButtons = () => {
  const { addToCart, toggleTheme } = use(ActionsContext)!;
  return (
    <Row>
      <button onClick={addToCart}>Add to cart</button>
      <button onClick={toggleTheme}>Toggle theme</button>
      <RenderCount label="buttons" />
    </Row>
  );
};

// C: composition + one context per kind of data, actions separate.
export const SplitContexts = () => (
  <SplitProvider>
    <SplitThemeBadge />
    <SplitUserName />
    <SplitCartIcon />
    <SplitButtons />
    <SlowPage />
  </SplitProvider>
);
