import { useRef } from "react";

/**
 * Scenario 2: DOM refs + React 19 ref-as-prop (no forwardRef needed).
 */
interface MyInputProps {
  ref?: React.Ref<HTMLInputElement>;
}

const MyInput = ({ ref }: MyInputProps) => {
  return <input ref={ref} placeholder="focus me via ref" />;
};

export const DomRef = () => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFocus = () => {
    inputRef.current?.focus();
  };

  return (
    <div className="demo-card">
      <h4>2. DOM ref + React 19 ref-as-prop</h4>
      <p>
        <code>MyInput</code> is a plain function component that declares{" "}
        <code>ref</code> as a regular prop and passes it straight to the DOM
        node — no <code>forwardRef</code> wrapper needed in React 19.
      </p>
      <div className="demo-actions">
        <MyInput ref={inputRef} />
        <button onClick={handleFocus}>focus the input</button>
      </div>
    </div>
  );
};
