import { PaintBlocking } from "./PaintBlocking";
import "../hook-demo.css";
import { PositionCalculation } from "./PositionCalculation";
import { EffectFlush } from "./EffectFlush";

export const UseLayoutEffectDemo = () => {
  return (
    <section>
      <h2>useLayoutEffect</h2>
      <p>
        Full writeup: <code>src/Components/Hooks/useLayoutEffect/useLayoutEffect.md</code>.
        Dependency-array behavior and Strict Mode double-invoke are the same as{" "}
        <code>useEffect</code>, so only the paint-blocking difference and its
        effect-flushing caveat are demoed here.
      </p>
      <PaintBlocking />
      <PositionCalculation />
      <EffectFlush />
    </section>
  );
};
