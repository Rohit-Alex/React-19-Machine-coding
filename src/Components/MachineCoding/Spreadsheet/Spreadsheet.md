# Grid / spreadsheet-style editable table with keyboard navigation

> **The prompt:** "Build a small spreadsheet: a grid of cells you can click
> and edit, and move around with the arrow keys."
>
> The trick is that a spreadsheet has **two modes**. When you're moving
> around, the arrow keys move between cells. When you're editing, the arrow
> keys move the text cursor. Most bugs come from mixing the two.

Runnable demo: [`index.tsx`](./index.tsx) · component:
[`Spreadsheet.tsx`](./Spreadsheet.tsx)

---

## 1. Clarify before you code

| Question | Why it changes your code |
| --- | --- |
| How many rows and columns? | Thousands of rows needs virtualisation (section 7). |
| Formulas (`=A1+B1`, `SUM`)? | A parser and a dependency graph — usually a follow-up, not the main build. |
| Range selection (Shift+arrows, drag)? | Selection becomes an anchor plus a focus cell, not one position. |
| Copy and paste with Excel / Google Sheets? | Tab-separated text (section 5). |
| Undo? | The command pattern from [TodoUndoRedo](../TodoUndoRedo/TodoUndoRedo.md) — a cell edit is a `{row, col, old, new}` command. |

---

## 2. State: data, active cell, draft

```ts
const [data, setData]     = useState<string[][]>(…);
const [active, setActive] = useState({ row: 0, col: 0 });
const [draft, setDraft]   = useState<string | null>(null);  // null = navigating
```

`draft` *is* the mode. `null`: arrows move between cells. A string: the active
cell shows an `<input>` with that text, and the arrows belong to the input.

- **The draft is separate from the data.** Typing doesn't change the grid
  until you save, so Escape can throw it away.
- **Updating one cell copies only its row.** Other rows keep the same array,
  so memoised cells in them don't re-render.

---

## 3. Keys in each mode

**Navigating:**

| Key | Does |
| --- | --- |
| Arrows | Move one cell (clamped at the edges) |
| Home / End | Start / end of the row; with Ctrl/⌘, top-left / bottom-right |
| Page Up / Down | Ten rows |
| Enter or F2 | Edit, keeping the text |
| Any character | Edit, **replacing** the text with that character (like Excel) |
| Delete / Backspace | Clear the cell |
| Tab | Leaves the grid |

**Editing:** Enter saves and moves down (Shift+Enter: up), Tab saves and moves
right, Escape cancels. Arrows move the text cursor.

**Tab leaves the grid on purpose.** In Excel, Tab moves right; on a web page,
taking over Tab traps keyboard users inside a 90-cell grid. Arrows move
inside, Tab moves past — the same rule as [Tabs](../Tabs/Tabs.md#4-keyboard-roving-tabindex).

Analogy: a car's gearstick. In drive, the pedal moves the car; in park, the
same pedal only revs the engine. Same key, different job, and the gear you're
in decides which.

---

## 4. Focus: roving tabindex

- Only the active cell has `tabIndex={0}`; every other cell has `-1`. The grid
  is one stop in the Tab order.
- After a move, an effect focuses the new active cell. It only runs after a
  user action, so the page doesn't jump to the grid on load.
- The editor `<input>` is `autoFocus` and puts the cursor at the **end** —
  after the typed character, or after the existing text for F2.

### Saving without double saves

Enter and Tab call `input.blur()`, and **blur is the only place that saves**.
If Enter also saved, the input's removal could fire `blur` and save a second
time. Escape sets a "cancelled" flag before closing, so its blur doesn't save.

Clicking another cell while editing is the one exception: it saves straight
away. Left to blur, the save would run *after* the click had already moved
the active cell — and write the text into the cell you clicked.

---

## 5. Copy and paste

```ts
text.replace(/\r?\n$/, "").split(/\r?\n/).map((line) => line.split("\t"))
```

Excel and Google Sheets copy a block as **tab-separated text** — tabs between
columns, newlines between rows, and a newline at the end. Parse that, and a
block copied from a real spreadsheet lands in the right cells starting at the
active cell. Cells past the grid's edge are dropped. Copy does the reverse
(here for one cell; a range would join with `\t` and `\n`).

Copy and paste only take over in navigate mode; while editing, the input does
normal text copy and paste.

---

## 6. Performance and accessibility

- **Event delegation.** One `onKeyDown`, `onMouseDown`, `onCopy` and `onPaste`
  on the `<table>`; the clicked cell is found with
  `closest("[data-row]")`. Cells get only plain values as props — no
  callbacks to keep stable — so `memo` works.
- **`role="grid"`** on the table: screen readers then treat arrow keys as grid
  movement and announce row and column headers. Column letters are `<th
  scope="col">`, row numbers `<th scope="row">`.
- **The editor has a label** ("Edit B3"), so it's clear which cell is being
  edited.
- Numbers are right-aligned with tabular digits, like every spreadsheet.

---

## 7. Follow-ups to expect

| They ask | Short answer |
| --- | --- |
| "Formulas: `=A1+B2`, `=SUM(A1:A5)`." | Store the raw text; compute shown values. Parse with a small recursive-descent parser (never `eval`). Track which cells each formula reads; when a cell changes, recompute only its dependents, in dependency order. Detect cycles (`=A1` in A1) and show `#CYCLE`. |
| "10,000 rows." | Virtualise rows ([VirtualList](../VirtualList/VirtualList.md)). The active cell must stay focusable, so scroll it into view before focusing; `aria-rowcount` / `aria-rowindex` give the real position. |
| "Range selection." | Keep `anchor` and `focus` positions; Shift+arrows move `focus`; the selection is the rectangle between them. Copy joins it as TSV. |
| "Resize columns." | A drag handle on each header updating a widths array; `table-layout: fixed`. |
| "Collaborative editing." | Each edit is a small command `{cell, value}` sent over a socket; show other users' active cells. Conflicts on the same cell: last write wins, or a CRDT. |
| "Sort / filter." | Sort a list of row indexes, not the data, so cell addresses (and formulas) don't move. |

---

## 8. Scoring notes

- **Mid:** an editable table with inputs in every cell; Tab moves between
  inputs, arrows don't, no clear edit mode.
- **Senior:** explicit navigate / edit modes, roving tabindex with full key
  map, type-to-replace vs Enter/F2-to-edit, a single save path through blur,
  Escape to cancel, Tab that doesn't trap, delegated handlers with memoised
  cells, TSV copy/paste, `role="grid"` with headers, and a plan for formulas
  and virtualisation.
