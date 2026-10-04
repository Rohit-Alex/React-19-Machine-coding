export type Player = "X" | "O";
export type Cell = Player | null;

export interface GameState {
  size: number;
  /** Every board so far. history[0] is empty; history[step] is on screen. */
  history: Cell[][];
  step: number;
}

export type GameAction =
  | { type: "play"; index: number }
  | { type: "jump"; step: number }
  | { type: "reset"; size?: number };

export const initGame = (size: number): GameState => ({
  size,
  history: [Array<Cell>(size * size).fill(null)],
  step: 0,
});

/** Every row, column and both diagonals, as lists of cell indexes. Works for any size. */
export function getLines(size: number): number[][] {
  const range = Array.from({ length: size }, (_, i) => i);
  return [
    ...range.map((r) => range.map((c) => r * size + c)), // rows
    ...range.map((c) => range.map((r) => r * size + c)), // columns
    range.map((i) => i * size + i), // top-left to bottom-right
    range.map((i) => i * size + (size - 1 - i)), // top-right to bottom-left
  ];
}

export function getWinner(board: Cell[], size: number): { player: Player; line: number[] } | null {
  for (const line of getLines(size)) {
    const first = board[line[0]];
    if (first && line.every((i) => board[i] === first)) return { player: first, line };
  }
  return null;
}

// Whose turn, the winner and a draw are all worked out from the board, never
// stored. Stored copies can disagree with the board; derived ones can't.
export const nextPlayer = (step: number): Player => (step % 2 === 0 ? "X" : "O");

export function getStatus(state: GameState) {
  const board = state.history[state.step];
  const winner = getWinner(board, state.size);
  if (winner) return { kind: "won" as const, ...winner };
  if (board.every(Boolean)) return { kind: "draw" as const };
  return { kind: "playing" as const, player: nextPlayer(state.step) };
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "play": {
      const board = state.history[state.step];
      // Illegal moves are refused here, in one place, not in each button:
      // a taken cell, or any move after the game is over.
      if (board[action.index] || getStatus(state).kind !== "playing") return state;
      const next = board.slice();
      next[action.index] = nextPlayer(state.step);
      // Playing after going back in time throws away the old future.
      return { ...state, history: [...state.history.slice(0, state.step + 1), next], step: state.step + 1 };
    }
    case "jump":
      return { ...state, step: action.step };
    case "reset":
      return initGame(action.size ?? state.size);
  }
}
