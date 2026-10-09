export const SIZE = 10;
export const LAST_CELL = SIZE * SIZE;

/**
 * Where each snake head or ladder foot sends you. One map for both:
 * `to > from` is a ladder, `to < from` is a snake.
 */
export const JUMPS: Record<number, number> = {
  // ladders
  4: 14,
  9: 31,
  21: 42,
  28: 84,
  51: 67,
  72: 91,
  80: 99,
  // snakes
  17: 7,
  54: 34,
  62: 19,
  64: 60,
  87: 36,
  93: 73,
  98: 79,
};

export const rollDice = () => Math.floor(Math.random() * 6) + 1;

/**
 * Where the token ends up. Position 0 means "not on the board yet".
 * You need the exact roll to land on 100; overshooting means you stay put.
 */
export function move(position: number, roll: number): number {
  const landed = position + roll;
  if (landed > LAST_CELL) return position;
  return JUMPS[landed] ?? landed;
}

/**
 * Cell numbers in screen order, top-left first, for a CSS grid.
 * 1 is bottom-left and the rows zig-zag: odd rows (from the bottom) run
 * left to right, even rows right to left. So 100 is top-left.
 */
export const BOARD: number[] = Array.from({ length: SIZE }, (_, r) => {
  const rowFromBottom = SIZE - 1 - r;
  const row = Array.from({ length: SIZE }, (_, c) => rowFromBottom * SIZE + c + 1);
  return rowFromBottom % 2 === 0 ? row : row.reverse();
}).flat();
