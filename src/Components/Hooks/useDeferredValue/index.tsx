import "../hook-demo.css";
import { DeferredInput } from "./DeferredInput";
import { StaleIndicator } from "./StaleIndicator";

export const UseDeferredValueDemo = () => {
  return (
    <section>
      <h2>useDeferredValue</h2>
      <p>
        Full writeup: <code>src/Components/Hooks/useDeferredValue.md</code>.
        Same responsiveness goal as <code>useTransition</code>, but for a
        value you don't own the setter for — and the memo gotcha that makes
        or breaks it.
      </p>
      <DeferredInput />
      <StaleIndicator />
    </section>
  );
};
