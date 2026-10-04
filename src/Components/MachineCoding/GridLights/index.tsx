import { GridLights } from "./GridLights";
import "../../Hooks/hook-demo.css";

export const GridLightsDemo = () => {
  return (
    <section>
      <h2>Grid lights</h2>
      <p>
        Writeup: <code>src/Components/MachineCoding/GridLights/GridLights.md</code>
        . The click order is a stack; switching off is popping it on a timer.
      </p>
      <GridLights />
    </section>
  );
};
