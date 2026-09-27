import { EffectEvent } from "./EffectEvent";
import { EffectEventCustomHook } from "./EffectEventCustomHook";
import { EffectEventPitfall } from "./EffectEventPitfall";
import { Lifecycle } from "./Lifecycle";
import { RaceCondition } from "./RaceCondition";
import { UnstableDependency } from "./UnstableDependency";
import "../hook-demo.css";

export const UseEffectDemo = () => {
  return (
    <section>
      <h2>useEffect</h2>
      <p>
        Full writeup: <code>src/Components/Hooks/useEffect/useEffect.md</code>. The
        updater-function scenario for reading state inside an Effect is
        already covered by <code>useCallback/UpdaterFunction.tsx</code>{" "}
        above, so it isn't re-demoed here.
      </p>
      <Lifecycle />
      <RaceCondition />
      <UnstableDependency />
      <EffectEvent />
      <EffectEventPitfall />
      <EffectEventCustomHook />
    </section>
  );
};
