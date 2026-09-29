import { ClickOrHoldButton } from "./ClickOrHoldButton";
import "../hook-demo.css";

export const UseClickOrHoldDemo = () => {
  return (
    <section>
      <h2>useClickOrHold</h2>
      <p>
        Pointer events start a timer; the browser's own <code>click</code>{" "}
        handles short presses (so keyboard and "release outside to cancel" come
        free), and a click that ends a hold is swallowed.
      </p>
      <ClickOrHoldButton />
    </section>
  );
};
