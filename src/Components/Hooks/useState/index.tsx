import { Batching } from "./Batching";
import { ImmutableUpdate } from "./ImmutableUpdate";
import { LazyInit } from "./LazyInit";
import { ResetWithKey } from "./ResetWithKey";
import "../hook-demo.css";

export const UseStateDemo = () => {
  return (
    <section>
      <h2>useState</h2>
      <p>
        Full writeup: <code>src/Components/Hooks/useState/useState.md</code>. The
        functional-updater scenario is already covered by{" "}
        <code>useCallback/UpdaterFunction.tsx</code> above, so only the four
        genuinely new scenarios are demoed here.
      </p>
      <LazyInit />
      <ImmutableUpdate />
      <Batching />
      <ResetWithKey />
    </section>
  );
};
