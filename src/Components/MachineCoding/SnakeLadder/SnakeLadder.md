# Snake & ladder (single player)

> **The prompt:** "Build a 10×10 snakes and ladders board, numbered 1 to 100.
> A dice gives 1–6. A Play button moves one player token by the roll. Some
> cells are snakes or ladders. Nice to have: show where they go, and a
> 'You win!' message at 100."
>
> It looks like a drawing question. It's really about **two small pieces of
> logic**: laying out the zig-zag board, and one pure `move` function. Get those
> right and the component is just buttons and a grid.

Runnable demo: [`SnakeLadder.tsx`](./SnakeLadder.tsx) · logic: [`game.ts`](./game.ts)

---

## 1. Clarify before you code

| Question | Why it changes your code |
| --- | --- |
| Do I need the exact roll to land on 100? | Common rule: yes, overshoot means you stay put. The other rule is "stop at 100". One `if` either way. |
| Does a 6 give another turn? | Usually ignored in this round. Say so. |
| Where does the token start — on 1, or off the board? | Off the board (position `0`). Rolling a 1 lands on cell 1. |
| Fixed snakes/ladders, or random? | Fixed. Random ones can create loops (a ladder top on a snake head). |
| Separate Roll and Play buttons, or one? | The prompt says a Play button moves "based on the current dice roll", so: Roll, then Play. |

---

## 2. Snakes and ladders are one map

```ts
export const JUMPS: Record<number, number> = { 4: 14, 28: 84, 17: 7, 98: 79 /* … */ };
```

A ladder and a snake do the **same thing**: land on cell `from`, end up on
cell `to`. The only difference is the direction, and you can read that from the
numbers: `to > from` is a ladder, `to < from` is a snake.

The common mistake is two arrays, `snakes` and `ladders`, and two `find`
calls in the move code. That doubles the logic and lets the same cell end up in
both lists by accident. With one object, a cell can only have one jump — the
data structure itself prevents the bug.

The analogy: a train station departure board. It doesn't care if the train goes
north or south. It just says "from here, you go there".

---

## 3. The move is a pure function

```ts
export function move(position: number, roll: number): number {
  const landed = position + roll;
  if (landed > LAST_CELL) return position; // need the exact roll
  return JUMPS[landed] ?? landed;
}
```

- No React in it. You can check it in a Node REPL, and the interviewer can read
  the rules in five lines.
- `??` not `||`: fine here because no target is `0`, but `??` says what you
  mean — "if there's no jump".
- One jump only. A ladder that ends on a snake head would need a loop
  (`while (JUMPS[pos])`). Real boards avoid it, so don't build it unless asked.

---

## 4. The zig-zag board

Cell 1 is bottom-left. Row 1 runs left to right, row 2 runs right to left, and
so on — like a farmer ploughing a field, turning round at the end of each row.
So 100 is top-left, and a CSS grid fills top-left first.

```ts
export const BOARD = Array.from({ length: SIZE }, (_, r) => {
  const rowFromBottom = SIZE - 1 - r;
  const row = Array.from({ length: SIZE }, (_, c) => rowFromBottom * SIZE + c + 1);
  return rowFromBottom % 2 === 0 ? row : row.reverse();
}).flat();
```

Top screen row is `[100, 99, …, 91]`, bottom is `[1, 2, …, 10]`. The board
never changes, so it's a module constant, not state and not `useMemo`.

The common bug: rendering `1..100` straight into the grid. Then 1 is top-left
and every row runs the same way. It "looks" like a board but snakes and
ladders point the wrong way.

---

## 5. State: only what you can't work out

```ts
const [position, setPosition] = useState(0);
const [roll, setRoll] = useState<number | null>(null);
const [lastMove, setLastMove] = useState<LastMove | null>(null);
```

- `roll === null` means "nothing rolled yet". It disables Play and enables
  Roll, so you can't play the same roll twice or re-roll until you get a 6.
- `hasWon` is `position === 100` — worked out, not stored. A separate `won`
  flag could disagree with the position.
- The status sentence ("Snake on 54! Slid down to 34") is built from
  `lastMove`, not stored as a string. Store facts, not sentences.

`useReducer` would also be fine (three actions: roll, play, reset). With three
small fields that change together in one handler, `useState` is shorter.

---

## 6. Accessibility

- Real `<button>`s for Roll, Play, Reset; `disabled` shows what you can do now.
- One status line with `aria-live="polite"` announces each move and the win.
- Each cell has an `aria-label` like "Cell 28, ladder to 84, you are here", so
  the colours and emoji aren't the only way to know what's on a cell.

---

## 7. Follow-ups to expect

| They ask | Short answer |
| --- | --- |
| "Multiple players." | `positions: number[]` and `turn` index; `move` doesn't change. Turn is `(turn + 1) % players`. |
| "Draw real arrows." | An SVG layered over the grid. Cell `n` → row/column from the same zig-zag rule, then a `<line>` from centre to centre. |
| "Animate the token." | Step `position` one cell at a time on a timer in an effect (like Grid Lights), then apply the jump. |
| "Rolling a 6 gives another turn." | In multiplayer, don't advance `turn` when `roll === 6`. |
| "Random board." | Generate `JUMPS` once, rejecting a jump that starts on 1/100, starts where another ends, or starts twice. |
| "Why is the dice not in `move`?" | Randomness makes it hard to check. Pass the roll in; `move` stays pure. |

---

## 8. Scoring notes

- **Mid:** a working board, dice and token. Often renders 1–100 straight
  (no zig-zag), keeps snakes and ladders in two lists, and stores `won` as its
  own state.
- **Senior:** one jump map, a pure `move` with the exact-roll rule, the zig-zag
  layout as a constant, state limited to position + roll, and derived win and
  status text.
