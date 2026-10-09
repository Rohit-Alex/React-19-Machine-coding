import { SnakeLadder } from "./SnakeLadder";
import "../../Hooks/hook-demo.css";

export const SnakeLadderDemo = () => (
  <section>
    <h2>Snake &amp; ladder</h2>
    <p>
      Writeup: <code>src/Components/MachineCoding/SnakeLadder/SnakeLadder.md</code>. Snakes and
      ladders are one <code>from → to</code> map; a move is a pure function of position and roll.
    </p>
    <div className="demo-card">
      <h4>Play</h4>
      <p>Roll, then Play. Green cells are ladders, red cells are snakes. Land on 100 exactly to win.</p>
      <SnakeLadder />
    </div>
  </section>
);
