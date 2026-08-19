import "../hook-demo.css";
import { TodoReducer } from "./TodoReducer";
import { LazyInitializer } from "./LazyInitializer";

export const UseReducerDemo = () => {
  return (
    <section>
      <h2>useReducer</h2>
      <p>
        Full writeup: <code>src/Components/Hooks/useReducer.md</code>.
        Snapshot behavior, batching, and Strict Mode double-invoke are the
        same as <code>useState</code>, so only the reducer pattern itself and
        the 3-argument lazy-init form are demoed here.
      </p>
      <TodoReducer />
      <LazyInitializer />
    </section>
  );
};
