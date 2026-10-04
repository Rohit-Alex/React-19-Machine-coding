import { useState } from "react";
import { ErrorBoundary, useShowBoundary } from "./ErrorBoundary";
import "../../Hooks/hook-demo.css";

interface Product {
  name: string;
  price: number | null; // The API sometimes sends null.
}
const GOOD: Product = { name: "Headphones", price: 2499 };
const BAD: Product = { name: "Headphones", price: null };

// Crashes during render when price is null: null.toLocaleString() throws.
const PriceTag = ({ product }: { product: Product }) => (
  <p>
    {product.name}: ₹{product.price!.toLocaleString("en-IN")}
  </p>
);

const ActionButtons = ({ onLog }: { onLog: (line: string) => void }) => {
  const showBoundary = useShowBoundary();
  return (
    <div className="demo-actions">
      <button
        onClick={() => {
          onLog("Threw in a click handler — the boundary did NOT catch it (see the console). The page carries on.");
          throw new Error("Error in an event handler");
        }}
      >
        Throw in onClick
      </button>
      <button
        onClick={async () => {
          try {
            await Promise.reject(new Error("Network request failed"));
          } catch (error) {
            showBoundary(error); // Hand it to the boundary on purpose.
          }
        }}
      >
        Async error → boundary
      </button>
    </div>
  );
};

export const ErrorBoundariesDemo = () => {
  const [product, setProduct] = useState(GOOD);
  const [log, setLog] = useState<string[]>([]);
  const addLog = (line: string) => setLog((prev) => [line, ...prev].slice(0, 4));

  return (
    <section>
      <h2>Error boundaries</h2>
      <p>
        Writeup: <code>src/Components/Patterns/ErrorBoundaries/ErrorBoundaries.md</code>. A crash in
        one widget shows a fallback for that widget, not a blank page.
      </p>
      <div className="demo-card">
        <div className="demo-actions">
          <button onClick={() => setProduct(BAD)}>Load bad data (price: null)</button>
          <button onClick={() => setProduct(GOOD)}>Load good data</button>
        </div>
        <p style={{ fontSize: 13 }}>Header and footer stay up — only the widget inside the boundary is replaced.</p>
        <div style={{ border: "1px solid var(--border)", borderRadius: 6, padding: 8 }}>
          <strong>Shop header</strong>
          <ErrorBoundary
            // New data → try again automatically.
            resetKeys={[product]}
            onError={(error, info) => addLog(`Caught: ${error.message} (component stack starts: ${info.componentStack?.trim().split("\n")[0]})`)}
            fallback={({ error, reset }) => (
              <div role="alert" style={{ padding: 8, background: "rgb(196 50 28 / 0.1)", borderRadius: 4 }}>
                <p style={{ margin: 0 }}>This part of the page broke: {error.message}</p>
                <button onClick={reset}>Try again</button>
              </div>
            )}
          >
            <PriceTag product={product} />
            <ActionButtons onLog={addLog} />
          </ErrorBoundary>
          <small>Shop footer</small>
        </div>
        <ul style={{ fontSize: 13 }}>
          {log.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      </div>
    </section>
  );
};
