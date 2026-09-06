import "../hook-demo.css";
import { LastKeyPressed } from "./LastKeyPressed";
import { HoverTracker } from "./HoverTracker";

export const UseEventListenerDemo = () => {
  return (
    <section>
      <h2>useEventListener</h2>
      <p>
        A custom hook (not part of the React API) that attaches a DOM event
        listener — to <code>window</code> or to a specific element via a ref —
        and cleans it up automatically, keeping the handler itself in a ref so
        the listener never needs to be re-attached just because the handler
        changed.
      </p>
      <LastKeyPressed />
      <HoverTracker />
    </section>
  );
};
