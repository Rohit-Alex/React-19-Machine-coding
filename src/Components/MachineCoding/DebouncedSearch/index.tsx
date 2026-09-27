import { DebouncedSearch } from "./DebouncedSearch";
import "../../Hooks/hook-demo.css";

export const DebouncedSearchDemo = () => {
  return (
    <section>
      <h2>Debounced search box</h2>
      <p>
        Writeup:{" "}
        <code>src/Components/MachineCoding/DebouncedSearch/DebouncedSearch.md</code>.
        Debouncing alone does not make search correct — it cuts the number of
        requests, but the ones that survive can still come back out of order.
        The fix is cancellation, not a longer delay.
      </p>
      <DebouncedSearch />
    </section>
  );
};
