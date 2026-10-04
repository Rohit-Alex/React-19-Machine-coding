import { useReducer } from "react";
import { gameReducer, getStatus, initGame } from "./game";

export const TicTacToe = () => {
  const [state, dispatch] = useReducer(gameReducer, 3, initGame);
  const { size, history, step } = state;
  const board = history[step];
  const status = getStatus(state);
  const winningCells = status.kind === "won" ? status.line : [];

  return (
    <div>
      <div className="demo-actions">
        <label>
          Board size{" "}
          <select value={size} onChange={(event) => dispatch({ type: "reset", size: Number(event.target.value) })}>
            {[3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n} × {n}
              </option>
            ))}
          </select>
        </label>
        <button onClick={() => dispatch({ type: "reset" })}>New game</button>
      </div>

      <p aria-live="polite" style={{ fontWeight: 600 }}>
        {status.kind === "won" && `${status.player} wins!`}
        {status.kind === "draw" && "It's a draw."}
        {status.kind === "playing" && `${status.player} to play`}
      </p>

      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "start" }}>
        <div
          role="group"
          aria-label="Board"
          style={{ display: "grid", gridTemplateColumns: `repeat(${size}, 56px)`, gap: 4 }}
        >
          {board.map((cell, index) => {
            const row = Math.floor(index / size) + 1;
            const column = (index % size) + 1;
            return (
              <button
                key={index}
                onClick={() => dispatch({ type: "play", index })}
                // Not `disabled`: a disabled button can't be focused, so a
                // screen-reader user couldn't hear what's in the square.
                aria-disabled={cell !== null || status.kind !== "playing"}
                aria-label={`Row ${row}, column ${column}, ${cell ?? "empty"}`}
                style={{
                  width: 56,
                  height: 56,
                  fontSize: 28,
                  fontWeight: 700,
                  background: winningCells.includes(index) ? "rgb(47 125 31 / 0.25)" : undefined,
                }}
              >
                {cell}
              </button>
            );
          })}
        </div>

        <div>
          <strong>History</strong>
          <ol start={0} style={{ paddingLeft: 24 }}>
            {history.map((_, move) => (
              <li key={move}>
                <button onClick={() => dispatch({ type: "jump", step: move })} aria-current={move === step ? "step" : undefined} style={{ fontWeight: move === step ? 700 : 400 }}>
                  {move === 0 ? "Start" : `Move ${move}`}
                </button>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
};
