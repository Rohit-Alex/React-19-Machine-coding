# Tic-tac-toe (game state as a state machine)

> **The prompt:** "Build tic-tac-toe for two players. Show the winner. Bonus:
> undo / move history, and an N×N board."
>
> Everyone gets a working board. The marks are for **how little state you
> store**: if the board history is the only state, every other fact — whose
> turn, who won, is it a draw — can't get out of sync.

Runnable demo: [`index.tsx`](./index.tsx) · UI: [`TicTacToe.tsx`](./TicTacToe.tsx) ·
logic: [`game.ts`](./game.ts)

---

## 1. Clarify before you code

| Question | Why it changes your code |
| --- | --- |
| Fixed 3×3, or any size? | Generate the winning lines instead of listing eight by hand. |
| On N×N, is it N in a row, or K in a row (like Gomoku)? | K-in-a-row needs a different check (section 6). |
| Undo, or full history with jumping? | Store every board, not just the current one. |
| Against the computer? | Minimax for 3×3 — a pure function over the same board (section 6). |
| Keep score across games? | A separate counter outside the game state. |

---

## 2. Store the history; derive everything else

```ts
interface GameState { size: number; history: Cell[][]; step: number }
```

| Fact | Derived from |
| --- | --- |
| Current board | `history[step]` |
| Whose turn | `step % 2 === 0 ? "X" : "O"` |
| Winner + winning line | `getWinner(board)` |
| Draw | board full and no winner |

The usual first draft stores `board`, `isXNext`, `winner` and `isDraw` as four
pieces of state, updated together in the click handler. Miss one update —
say, undo restores the board but not `isXNext` — and the game says it's X's
turn on a board where X just played.

Analogy: a chess scoresheet. If you have every move written down, you never
also need a note saying whose turn it is. You can work it out, and it can't
be wrong.

---

## 3. A reducer as the state machine

```ts
case "play":
  if (board[index] || getStatus(state).kind !== "playing") return state;   // refuse
  …
  return { ...state, history: [...history.slice(0, step + 1), next], step: step + 1 };
```

- **Illegal moves are refused in one place.** A taken cell, or a click after
  the game ended, returns the same state — React then skips the re-render.
  Buttons don't each need their own checks; even a bug in the UI can't put
  two marks in one cell.
- **The status is a small machine:** `playing → won` or `playing → draw`, and
  only `reset` leaves the end states. `getStatus` returns a discriminated
  union (`{ kind: "won", player, line } | { kind: "draw" } | { kind: "playing",
  player }`), so TypeScript won't let you read `line` unless the game is won.
- **The reducer is pure** — `game.ts` has no React in it. That's why it could
  be checked in Node: wins, draws, refused moves, rewinding, 4×4 diagonals.

### Time travel

Jump to move 3 and play a different move: everything after move 3 is
dropped (`history.slice(0, step + 1)`). Same rule as typing after an undo in a
text editor — the redo stack is gone. (The [Todo undo/redo](../TodoUndoRedo/TodoUndoRedo.md)
writeup goes deeper on this.)

---

## 4. Winning lines for any size

```ts
rows:      r * size + c        for each r, all c
columns:   r * size + c        for each c, all r
diagonal:  i * size + i
anti-diag: i * size + (size - 1 - i)
```

`2n + 2` lines for an n×n board. Hard-coding the eight 3×3 lines is fine for
a first pass; generating them is what makes the 4×4 and 5×5 options in the
demo free. Checked: on 4×4 the anti-diagonal is `[3, 6, 9, 12]`.

Cost: checking every line is O(n²) per move. For tic-tac-toe sizes that's
nothing.

---

## 5. Accessibility

- **Squares are buttons** with labels like "Row 2, column 3, X" — the visual
  grid means nothing to a screen reader.
- **`aria-disabled`, not `disabled`, on filled squares.** A disabled button
  can't receive focus, so a screen-reader user tabbing through the board
  would skip the filled squares and never hear where the X's are. The reducer
  already ignores the click.
- **One live status line** ("O to play", "X wins!") rather than announcing
  each square.
- **Not colour alone** for the win: the status line says who won; the
  highlight is extra.
- Arrow-key movement around the grid (`role="grid"` with roving tabindex) is
  the polished version; worth mentioning, rarely required.

---

## 6. Follow-ups to expect

| They ask | Short answer |
| --- | --- |
| "K in a row on a big board (Gomoku: 5 on 15×15)." | Don't scan every line. After each move, count matching cells outward from the move in 4 directions (—, |, ╲, ╱). O(K) per move. |
| "Play against the computer." | Minimax over the pure `gameReducer`: try each empty cell, score win +1 / loss −1 / draw 0, recurse. 3×3 has few enough positions to search completely; larger boards need depth limits and alpha-beta pruning. |
| "Online two-player." | The server owns the state and runs the same reducer; clients send `{type: "play", index}` actions over a WebSocket and render what comes back. Pure reducer = same code on both sides. |
| "Undo just the last move." | `jump` to `step - 1`. History already supports it. |
| "Save and resume." | Store `history` and `step` — it's plain JSON. |
| "Memory with long histories." | Store moves (`index` per step) instead of whole boards, and rebuild the board by replaying. Trade memory for a little CPU. |

---

## 7. Scoring notes

- **Mid:** works, with `board`, `isXNext` and `winner` in separate state and
  hand-written 3×3 lines; often allows moves after a win.
- **Senior:** history as the only state, everything else derived; a pure
  reducer that refuses illegal moves in one place; time travel that drops
  the old future; lines generated for any size; accessible squares with
  `aria-disabled`; and a plan for K-in-a-row and an AI opponent.
