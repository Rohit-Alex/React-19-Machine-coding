import "../hook-demo.css";
import { TinyStore } from "./TinyStore";
import { WindowWidth } from "./WindowWidth";

export const UseSyncExternalStoreDemo = () => {
  return (
    <section>
      <h2>useSyncExternalStore</h2>
      <p>
        Full writeup:{" "}
        <code>src/Components/Hooks/useSyncExternalStore/useSyncExternalStore.md</code>. For
        reading state that lives outside React — a browser API or a
        hand-rolled store — without tearing during concurrent rendering.
      </p>
      <WindowWidth />
      <TinyStore />
    </section>
  );
};
