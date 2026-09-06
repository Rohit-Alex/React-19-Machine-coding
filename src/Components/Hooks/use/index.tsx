import "../hook-demo.css";
import { ConditionalContextRead } from "./ConditionalContextRead";
import { ReadPromiseWithSuspense } from "./ReadPromiseWithSuspense";

export const UseDemo = () => {
  return (
    <section>
      <h2>use</h2>
      <p>
        Full writeup: <code>src/Components/Hooks/use/use.md</code>. Reads the
        value of a resource — a Promise or a Context — and, unlike other
        Hooks, can be called conditionally and inside loops.
      </p>
      <ReadPromiseWithSuspense />
      <ConditionalContextRead />
    </section>
  );
};
