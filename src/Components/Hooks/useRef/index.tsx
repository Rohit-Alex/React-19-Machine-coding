import "../hook-demo.css";
import { RefVsState } from "./RefVsState";
import { DomRef } from "./DomRef";
import { LazyInit } from "./LazyInit";
import { CallbackRef } from "./CallbackRef";
import { RefList } from "./RefList";

export const UseRefDemo = () => {
  return (
    <section>
      <h2>useRef</h2>
      <p>
        Full writeup: <code>src/Components/Hooks/useRef/useRef.md</code>. The
        one rule that matters: changing <code>ref.current</code> never triggers
        a re-render.
      </p>
      <RefVsState />
      <DomRef />
      <LazyInit />
      <CallbackRef />
      <RefList />
    </section>
  );
};
