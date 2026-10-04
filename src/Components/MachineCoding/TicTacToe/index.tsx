import { TicTacToe } from "./TicTacToe";
import "../../Hooks/hook-demo.css";

export const TicTacToeDemo = () => (
  <section>
    <h2>Tic-tac-toe</h2>
    <p>
      Writeup: <code>src/Components/MachineCoding/TicTacToe/TicTacToe.md</code>. The board history
      is the only state; whose turn it is and who won are worked out from it.
    </p>
    <div className="demo-card">
      <h4>Play</h4>
      <p>Jump back in the history and play a different move — the old future is dropped.</p>
      <TicTacToe />
    </div>
  </section>
);
