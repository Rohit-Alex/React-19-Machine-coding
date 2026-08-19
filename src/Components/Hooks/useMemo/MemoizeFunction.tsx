import { memo, useCallback, useMemo, useState } from "react";

interface IFormProps {
  label: string;
  onSubmit: (orderDetails: string) => void;
}

const Form = memo(({ label, onSubmit }: IFormProps) => {
  console.log(`[Form: ${label}] rendering`);
  return (
    <button onClick={() => onSubmit(`order via ${label}`)}>
      submit ({label})
    </button>
  );
});

/**
 * Scenario 3: Memoizing a function.
 * Both handlers below are equivalent — useCallback(fn, deps) is just
 * useMemo(() => fn, deps) without the extra nested arrow function. Prefer
 * useCallback for functions; this exists to show they behave identically.
 */
export const MemoizeFunction = () => {
  const [productId, setProductId] = useState("p-1");
  const [unrelated, setUnrelated] = useState(0);

  const handleSubmitViaMemo = useMemo(() => {
    return (orderDetails: string) => {
      console.log(`POST /product/${productId}/buy`, { orderDetails });
    };
  }, [productId]);

  const handleSubmitViaCallback = useCallback(
    (orderDetails: string) => {
      console.log(`POST /product/${productId}/buy`, { orderDetails });
    },
    [productId],
  );

  return (
    <div className="demo-card">
      <h4>3. Memoizing a function</h4>
      <p>
        Open the console. Neither Form below should log a re-render on an
        unrelated click.
      </p>
      <div className="demo-actions">
        <button
          onClick={() =>
            setProductId((prev) => (prev === "p-1" ? "p-2" : "p-1"))
          }
        >
          change product ({productId})
        </button>
        <button onClick={() => setUnrelated((prev) => prev + 1)}>
          unrelated re-render ({unrelated})
        </button>
      </div>
      <Form label="useMemo" onSubmit={handleSubmitViaMemo} />
      <Form label="useCallback" onSubmit={handleSubmitViaCallback} />
    </div>
  );
};
