import "../hook-demo.css";
import { DismissiblePanel } from "./DismissiblePanel";

export const UseOnClickOutsideDemo = () => {
  return (
    <section>
      <h2>useOnClickOutside</h2>
      <p>
        A custom hook (not part of the React API) that calls a handler
        whenever a click or tap lands outside a given element — the standard
        pattern behind dismissible dropdowns, popovers, and modals.
      </p>
      <DismissiblePanel />
    </section>
  );
};
