import { CountdownTimer } from "./CountdownTimer";
import "../../Hooks/hook-demo.css";

export const CountdownTimerDemo = () => {
  return (
    <section>
      <h2>Countdown timer</h2>
      <p>
        Writeup:{" "}
        <code>src/Components/MachineCoding/CountdownTimer/CountdownTimer.md</code>
        . Store the moment you're counting to, not the time left.
      </p>
      <CountdownTimer />
    </section>
  );
};
