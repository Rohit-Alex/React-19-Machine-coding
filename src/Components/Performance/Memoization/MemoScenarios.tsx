import { memo, useCallback, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { RenderCount, slowDown } from "../RenderCount";

const PRODUCTS = Array.from({ length: 200 }, (_, i) => ({ id: i, name: `Product ${i + 1}`, price: 100 + ((i * 37) % 900) }));

interface ListProps {
  query: string;
  onPick: (id: number) => void;
  style: CSSProperties;
}

/** The expensive child: ~40ms per render on purpose. */
const ProductList = ({ query, onPick, style }: ListProps) => {
  slowDown(40);
  const shown = PRODUCTS.filter((p) => p.name.toLowerCase().includes(query.toLowerCase())).slice(0, 5);
  return (
    <div style={style}>
      <RenderCount label="ProductList renders" />
      <ul>
        {shown.map((p) => (
          <li key={p.id}>
            <button onClick={() => onPick(p.id)}>{p.name}</button> ₹{p.price}
          </li>
        ))}
      </ul>
    </div>
  );
};
const MemoProductList = memo(ProductList);

/** Unrelated, fast-changing state that lives in the same parent. */
const useTicker = () => {
  const [count, setCount] = useState(0);
  return { count, button: <button onClick={() => setCount((c) => c + 1)}>Unrelated counter: {count}</button> };
};

// A: no memo. Every parent render re-renders the slow list.
export const NoMemo = () => {
  const { button } = useTicker();
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<number | null>(null);
  return (
    <Frame button={button} query={query} setQuery={setQuery} picked={picked}>
      <ProductList query={query} onPick={setPicked} style={{ opacity: 1 }} />
    </Frame>
  );
};

// B: memo, but the props are new every render, so memo never skips.
export const MemoBrokenByProps = () => {
  const { button } = useTicker();
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<number | null>(null);
  return (
    <Frame button={button} query={query} setQuery={setQuery} picked={picked}>
      <MemoProductList
        query={query}
        onPick={(id) => setPicked(id)} // ❌ a new function every render
        style={{ opacity: 1 }} // ❌ a new object every render
      />
    </Frame>
  );
};

// C: memo + stable props. Now the unrelated counter skips the list.
export const MemoWithStableProps = () => {
  const { button } = useTicker();
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<number | null>(null);
  const onPick = useCallback((id: number) => setPicked(id), []);
  const style = useMemo(() => ({ opacity: 1 }), []);
  return (
    <Frame button={button} query={query} setQuery={setQuery} picked={picked}>
      <MemoProductList query={query} onPick={onPick} style={style} />
    </Frame>
  );
};

// D: no memo at all — the counter moved into its own component, so its
// state changes can't reach the list.
const Counter = () => useTicker().button;
export const StateMovedDown = () => {
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<number | null>(null);
  return (
    <Frame button={<Counter />} query={query} setQuery={setQuery} picked={picked}>
      <ProductList query={query} onPick={setPicked} style={STYLE} />
    </Frame>
  );
};
const STYLE = { opacity: 1 }; // Constants outside the component are stable for free.

const Frame = ({
  button,
  query,
  setQuery,
  picked,
  children,
}: {
  button: ReactNode;
  query: string;
  setQuery: (q: string) => void;
  picked: number | null;
  children: ReactNode;
}) => (
  <div>
    <div className="demo-actions">
      {button}
      <input aria-label="Filter products" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter (should re-render the list)" />
    </div>
    <p style={{ fontSize: 13 }}>Picked: {picked === null ? "none" : `Product ${picked + 1}`}</p>
    {children}
  </div>
);
