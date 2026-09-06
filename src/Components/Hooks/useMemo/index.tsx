import { ExpensiveCalculation } from "./ExpensiveCalculation";
import { MemoizeFunction } from "./MemoizeFunction";
import { SkipRerender } from "./SkipRerender";
import "../hook-demo.css";

export const UseMemoDemo = () => {
  return (
    <section>
      <h2>useMemo</h2>
      <p>
        Full writeup: <code>src/Components/Hooks/useMemo/useMemo.md</code>. Open the
        console before interacting with each demo below.
      </p>
      <ExpensiveCalculation />
      <SkipRerender />
      <MemoizeFunction />
    </section>
  );
};
