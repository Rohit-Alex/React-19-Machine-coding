import { memo, useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent, type MouseEvent } from "react";

const ROWS = 15;
const COLS = 6;
const columnName = (col: number) => String.fromCharCode(65 + col); // 0 → A

type Grid = string[][];
interface Pos {
  row: number;
  col: number;
}

const emptyGrid = (): Grid => Array.from({ length: ROWS }, () => Array<string>(COLS).fill(""));
const clamp = (n: number, max: number) => Math.max(0, Math.min(max, n));

export const Spreadsheet = () => {
  const [data, setData] = useState<Grid>(() => {
    const grid = emptyGrid();
    grid[0] = ["Item", "Qty", "Price", "", "", ""];
    grid[1] = ["Coffee", "2", "180", "", "", ""];
    grid[2] = ["Bagel", "1", "120", "", "", ""];
    return grid;
  });
  const [active, setActive] = useState<Pos>({ row: 0, col: 0 });
  // null = moving around; a string = editing the active cell with this text.
  const [draft, setDraft] = useState<string | null>(null);

  const tableRef = useRef<HTMLTableElement>(null);
  const shouldFocusCell = useRef(false);
  const cancelled = useRef(false);

  // Roving tabindex: after moving, put real focus on the new active cell.
  // Only after a user action, so the page doesn't jump here on load.
  useEffect(() => {
    if (!shouldFocusCell.current || draft !== null) return;
    tableRef.current?.querySelector<HTMLElement>(`[data-row="${active.row}"][data-col="${active.col}"]`)?.focus();
  }, [active, draft]);

  const moveTo = (row: number, col: number) => {
    shouldFocusCell.current = true;
    setActive({ row: clamp(row, ROWS - 1), col: clamp(col, COLS - 1) });
  };

  const setCell = (row: number, col: number, value: string) =>
    // Copy only the row that changed; the other rows keep their identity,
    // so memoised cells in them don't re-render.
    setData((prev) => prev.map((cells, r) => (r === row ? cells.map((v, c) => (c === col ? value : v)) : cells)));

  const startEditing = (text: string) => {
    cancelled.current = false;
    setDraft(text);
  };

  // All saves go through blur (Enter and Tab blur first), so a save can't run twice.
  const commit = () => {
    if (draft !== null && !cancelled.current) setCell(active.row, active.col, draft);
    shouldFocusCell.current = true;
    setDraft(null);
  };

  // One handler for the whole table (event delegation), so the cells stay
  // simple memoised components with no callbacks.
  const onKeyDown = (event: KeyboardEvent) => {
    const { row, col } = active;

    if (draft !== null) {
      // Editing: arrows move the text cursor, so only these keys are ours.
      if (event.key === "Escape") {
        cancelled.current = true;
        setDraft(null);
        shouldFocusCell.current = true;
      } else if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        (event.target as HTMLInputElement).blur(); // → commit()
        if (event.key === "Enter") moveTo(row + (event.shiftKey ? -1 : 1), col);
        else moveTo(row, col + (event.shiftKey ? -1 : 1));
      }
      return;
    }

    const ctrl = event.ctrlKey || event.metaKey;
    const moves: Record<string, [number, number]> = {
      ArrowUp: [row - 1, col],
      ArrowDown: [row + 1, col],
      ArrowLeft: [row, col - 1],
      ArrowRight: [row, col + 1],
      Home: ctrl ? [0, 0] : [row, 0],
      End: ctrl ? [ROWS - 1, COLS - 1] : [row, COLS - 1],
      PageUp: [row - 10, col],
      PageDown: [row + 10, col],
    };
    if (moves[event.key]) {
      event.preventDefault(); // Stop the page scrolling.
      moveTo(...moves[event.key]);
    } else if (event.key === "Enter" || event.key === "F2") {
      event.preventDefault();
      startEditing(data[row][col]); // Edit, keeping the text.
    } else if (event.key === "Delete" || event.key === "Backspace") {
      setCell(row, col, "");
    } else if (event.key.length === 1 && !ctrl && !event.altKey) {
      // Typing a character starts editing and *replaces* the content, like Excel.
      event.preventDefault();
      startEditing(event.key);
    }
    // Tab isn't handled: it leaves the grid, so keyboard users can get out.
  };

  const onMouseDown = (event: MouseEvent) => {
    const cell = (event.target as HTMLElement).closest<HTMLElement>("[data-row]");
    if (!cell) return;
    if (draft !== null) {
      // Save now, into the cell being edited. Leaving it to blur would save
      // after the move — into the cell just clicked.
      setCell(active.row, active.col, draft);
      cancelled.current = true;
      setDraft(null);
    }
    moveTo(Number(cell.dataset.row), Number(cell.dataset.col));
  };

  // Copy and paste as tab-separated text: what Excel and Google Sheets use,
  // so a block copied from them pastes into the right cells.
  const onCopy = (event: ClipboardEvent) => {
    if (draft !== null) return; // Inside the editor, normal text copy.
    event.preventDefault();
    event.clipboardData.setData("text/plain", data[active.row][active.col]);
  };

  const onPaste = (event: ClipboardEvent) => {
    if (draft !== null) return;
    event.preventDefault();
    const rows = event.clipboardData
      .getData("text/plain")
      .replace(/\r?\n$/, "") // Spreadsheets add a trailing newline.
      .split(/\r?\n/)
      .map((line) => line.split("\t"));
    setData((prev) =>
      prev.map((cells, r) =>
        cells.map((value, c) => rows[r - active.row]?.[c - active.col] ?? value),
      ),
    );
  };

  return (
    <div style={{ overflowX: "auto" }}>
      <table
        ref={tableRef}
        role="grid"
        aria-label="Expenses"
        onKeyDown={onKeyDown}
        onMouseDown={onMouseDown}
        onDoubleClick={() => draft === null && startEditing(data[active.row][active.col])}
        onCopy={onCopy}
        onPaste={onPaste}
        style={{ borderCollapse: "collapse", fontVariantNumeric: "tabular-nums" }}
      >
        <thead>
          <tr>
            <th aria-hidden="true" />
            {Array.from({ length: COLS }, (_, col) => (
              <th key={col} scope="col" style={HEADER}>
                {columnName(col)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((cells, row) => (
            <tr key={row}>
              <th scope="row" style={HEADER}>
                {row + 1}
              </th>
              {cells.map((value, col) => {
                const isActive = active.row === row && active.col === col;
                if (isActive && draft !== null) {
                  return (
                    <td key={col} style={{ ...CELL, padding: 0, outline: "2px solid #3b6fd4" }}>
                      <input
                        autoFocus
                        aria-label={`Edit ${columnName(col)}${row + 1}`}
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        onBlur={commit}
                        // Cursor at the end, after the typed character or existing text.
                        onFocus={(event) => event.currentTarget.setSelectionRange(draft.length, draft.length)}
                        style={{ width: "100%", boxSizing: "border-box", border: 0, padding: "4px 6px", font: "inherit" }}
                      />
                    </td>
                  );
                }
                return <Cell key={col} row={row} col={col} value={value} isActive={isActive} />;
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        Active cell:{" "}
        <strong>
          {columnName(active.col)}
          {active.row + 1}
        </strong>
        {draft !== null && " (editing)"}
      </p>
    </div>
  );
};

const HEADER = { padding: "4px 8px", fontWeight: 600, background: "var(--code-bg)", border: "1px solid var(--border)" };
const CELL = { width: 110, height: 28, border: "1px solid var(--border)" };

// Memoised: typing in one cell re-renders the grid, but only cells whose
// props changed re-render. Props are plain values — no callbacks — thanks to
// the delegated handlers above.
const Cell = memo(({ row, col, value, isActive }: { row: number; col: number; value: string; isActive: boolean }) => (
  <td
    data-row={row}
    data-col={col}
    tabIndex={isActive ? 0 : -1} // One Tab stop for the whole grid.
    aria-selected={isActive}
    style={{
      ...CELL,
      padding: "4px 6px",
      cursor: "cell",
      outline: isActive ? "2px solid #3b6fd4" : undefined,
      outlineOffset: -2,
      textAlign: value !== "" && !Number.isNaN(Number(value)) ? "right" : "left",
      whiteSpace: "nowrap",
      overflow: "hidden",
      maxWidth: 110,
    }}
  >
    {value}
  </td>
));
