import "../hook-demo.css";
import { PreviousCountTracker } from "./PreviousCountTracker";

export const UsePreviousDemo = () => {
  return (
    <section>
      <h2>usePrevious</h2>
      <p>
        A custom hook (not part of the React API) that hangs on to whatever a
        value was during the previous render, using a ref that's updated
        after render — handy for diffing "what changed" between renders.
      </p>
      <PreviousCountTracker />
    </section>
  );
};
