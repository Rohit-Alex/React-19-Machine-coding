import { CustomHookOptimization } from "./CustomHookOptimization";
import { UpdaterFunction } from "./UpdaterFunction";
import "../hook-demo.css";

export const UseCallbackDemo = () => {
  return (
    <section>
      <h2>useCallback</h2>
      <p>
        Full writeup: <code>src/Components/Hooks/useCallback.md</code>. The
        "skip child re-render" scenario is already covered by{" "}
        <code>useMemo/MemoizeFunction.tsx</code> above, so only the two
        genuinely new scenarios are demoed here.
      </p>
      <UpdaterFunction />
      <CustomHookOptimization />
    </section>
  );
};
