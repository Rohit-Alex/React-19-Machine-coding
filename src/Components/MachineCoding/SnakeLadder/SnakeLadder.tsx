import { useState } from "react";
import { BOARD, JUMPS, LAST_CELL, SIZE, move, rollDice } from "./game";

interface LastMove {
  from: number;
  roll: number;
  to: number;
}

// Sentence for the status line, worked out from the last move.
function describe({ from, roll, to }: LastMove): string {
  const landed = from + roll;
  if (landed > LAST_CELL) return `Rolled ${roll}. You need exactly ${LAST_CELL - from} to finish — staying on ${from}.`;
  if (to > landed) return `Rolled ${roll}. Ladder on ${landed}! Climbed up to ${to}.`;
  if (to < landed) return `Rolled ${roll}. Snake on ${landed}! Slid down to ${to}.`;
  return `Rolled ${roll}. Moved to ${to}.`;
}

export const SnakeLadder = () => {
  const [position, setPosition] = useState(0); // 0 = not on the board yet
  const [roll, setRoll] = useState<number | null>(null); // rolled but not played yet
  const [lastMove, setLastMove] = useState<LastMove | null>(null);

  const hasWon = position === LAST_CELL;

  const play = () => {
    if (roll === null) return;
    const to = move(position, roll);
    setLastMove({ from: position, roll, to });
    setPosition(to);
    setRoll(null);
  };

  const reset = () => {
    setPosition(0);
    setRoll(null);
    setLastMove(null);
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <button type="button" onClick={() => setRoll(rollDice())} disabled={roll !== null || hasWon}>
          Roll dice
        </button>
        <span aria-label="Dice" style={{ fontSize: 24, minWidth: 32, textAlign: "center" }}>
          {roll ?? "–"}
        </span>
        <button type="button" onClick={play} disabled={roll === null || hasWon}>
          Play
        </button>
        <button type="button" onClick={reset}>
          Reset
        </button>
      </div>

      <p aria-live="polite" style={{ fontWeight: hasWon ? 700 : 400 }}>
        {hasWon
          ? "🎉 You win!"
          : lastMove
            ? describe(lastMove)
            : "Roll the dice, then press Play. You start just off cell 1."}
      </p>

      <div
        role="grid"
        aria-label="Snakes and ladders board"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${SIZE}, 48px)`,
          border: "1px solid",
          width: "fit-content",
        }}
      >
        {BOARD.map((cell) => {
          const target = JUMPS[cell];
          const isLadder = target !== undefined && target > cell;
          const isSnake = target !== undefined && target < cell;
          const hasToken = cell === position;
          return (
            <div
              key={cell}
              role="gridcell"
              aria-label={`Cell ${cell}${isLadder ? `, ladder to ${target}` : ""}${isSnake ? `, snake to ${target}` : ""}${hasToken ? ", you are here" : ""}`}
              style={{
                height: 48,
                border: "1px solid #ccc",
                position: "relative",
                fontSize: 11,
                padding: 2,
                background: isLadder ? "#d8f3d0" : isSnake ? "#f8d4d4" : undefined,
                color: isLadder || isSnake ? "#222" : undefined,
              }}
            >
              {cell}
              {/* The jump indicator: ↑ to a ladder top, ↓ to a snake tail. */}
              {target !== undefined && (
                <div aria-hidden style={{ fontWeight: 700 }}>
                  {isLadder ? "🪜↑" : "🐍↓"}
                  {target}
                </div>
              )}
              {hasToken && (
                <span
                  aria-hidden
                  style={{
                    position: "absolute",
                    right: 4,
                    bottom: 4,
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    background: "#1f5fbf",
                    border: "2px solid white",
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
