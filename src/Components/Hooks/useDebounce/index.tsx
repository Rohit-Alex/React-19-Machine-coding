import "../hook-demo.css";
import { DebouncedSearchBox } from "./DebouncedSearchBox";
import { DebouncedSaveButton } from "./DebouncedSaveButton";

export const UseDebounceDemo = () => {
  return (
    <section>
      <h2>useDebounce</h2>
      <p>
        A custom hook (not part of the React API) that delays committing a
        fast-changing value until it's stopped changing for a set period —
        the classic pattern for search inputs and other high-frequency input
        that shouldn't trigger work on every keystroke.
      </p>
      <DebouncedSearchBox />
      <DebouncedSaveButton />
    </section>
  );
};
