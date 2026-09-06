import "../hook-demo.css";
import { ListKeyMisuse } from "./ListKeyMisuse";
import { SharedPrefix } from "./SharedPrefix";

export const UseIdDemo = () => {
  return (
    <section>
      <h2>useId</h2>
      <p>
        Full writeup: <code>src/Components/Hooks/useId/useId.md</code>. Generates
        SSR-safe unique ids for accessibility attributes — and specifically
        why it's the wrong tool for list keys, demonstrated side by side.
      </p>
      <SharedPrefix />
      <ListKeyMisuse />
    </section>
  );
};
