import { Stopwatch } from "./Stopwatch";
import "../../Hooks/hook-demo.css";

export const StopwatchDemo = () => {
  return (
    <section>
      <h2>Stopwatch / timer</h2>
      <p>
        Writeup: <code>src/Components/MachineCoding/Stopwatch/Stopwatch.md</code>
        . Timers only decide when to repaint. The time itself comes from
        timestamps.
      </p>
      <Stopwatch />
    </section>
  );
};
