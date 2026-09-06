import { useImperativeHandle, useRef } from "react";

type InputHandle = {
  focus: () => void;
  scrollIntoView: () => void;
};

function MyInput({ ref }: { ref?: React.Ref<InputHandle> }) {
  const inputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(
    ref,
    () => {
      return {
        focus() {
          inputRef.current?.focus();
        },
        scrollIntoView() {
          inputRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        },
      };
    },
    [],
  );

  return <input ref={inputRef} placeholder="Type here" />;
}

export const RestrictedHandle = () => {
  const handleRef = useRef<InputHandle>(null);

  return (
    <div>
      <h3>Restricted handle</h3>
      <p>
        <code>MyInput</code> never hands out its <code>&lt;input&gt;</code>{" "}
        DOM node. The parent only ever sees <code>{"{ focus, scrollIntoView }"}</code> —
        there's no <code>handleRef.current.value</code> to read, no{" "}
        <code>handleRef.current.style</code> to mutate. No <code>forwardRef</code>{" "}
        anywhere; <code>ref</code> is just a prop (React 19).
      </p>
      <button onClick={() => handleRef.current?.focus()}>Focus</button>{" "}
      <button onClick={() => handleRef.current?.scrollIntoView()}>
        Scroll into view
      </button>
      <div style={{ height: 80, overflow: "auto", border: "1px solid #ccc" }}>
        <div style={{ height: 200 }} />
        <MyInput ref={handleRef} />
        <div style={{ height: 200 }} />
      </div>
    </div>
  );
};
