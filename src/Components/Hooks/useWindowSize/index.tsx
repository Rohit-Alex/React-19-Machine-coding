import "../hook-demo.css";
import { WindowSizeDisplay } from "./WindowSizeDisplay";
import { WindowSizeIndependentReaders } from "./WindowSizeIndependentReaders";
import { WindowSizeSharedReaders } from "./WindowSizeSharedReaders";

export const UseWindowSizeDemo = () => {
  return (
    <section>
      <h2>useWindowSize</h2>
      <p>
        A custom hook (not part of the React API) that subscribes to the
        window's <code>resize</code> event and returns the current{" "}
        <code>innerWidth</code>/<code>innerHeight</code>, so a component can
        re-render whenever the viewport changes.
      </p>
      <WindowSizeDisplay />
      <WindowSizeIndependentReaders />
      <WindowSizeSharedReaders />
    </section>
  );
};
