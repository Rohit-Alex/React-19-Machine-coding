import "../hook-demo.css";
import { ThrottledScrollTracker } from "./ThrottledScrollTracker";
import { ThrottledClickCounter } from "./ThrottledClickCounter";

export const UseThrottleDemo = () => {
  return (
    <section>
      <h2>useThrottle</h2>
      <p>
        A custom hook (not part of the React API) that caps how often a
        fast-changing value is allowed to update — at most once per fixed
        interval, regardless of how continuously the source keeps firing.
      </p>
      <ThrottledScrollTracker />
      <ThrottledClickCounter />
    </section>
  );
};
