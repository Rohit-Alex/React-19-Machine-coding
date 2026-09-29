import { useRef, useState } from "react";
import type { DragEvent } from "react";
import { flushSync } from "react-dom";
import { findCard, initialBoard, moveCard } from "./board";

type Direction = "up" | "down" | "left" | "right";

const arrows: Record<Direction, string> = { up: "↑", down: "↓", left: "←", right: "→" };

/**
 * Where in this column the dragged card would land: the number of other cards
 * whose middle is above the pointer. The dragged card is skipped, so the
 * answer already means "position in the list without it" — what moveCard
 * expects.
 */
// ponytail: measures every card on each dragover; fine for a board, cache
// the rects on dragenter if columns hold hundreds of cards.
function dropIndex(columnEl: HTMLElement, clientY: number, dragId: string | null) {
  const cards = [...columnEl.querySelectorAll<HTMLElement>("[data-card-id]")].filter(
    (el) => el.dataset.cardId !== dragId,
  );
  const i = cards.findIndex((el) => {
    const r = el.getBoundingClientRect();
    return clientY < r.top + r.height / 2;
  });
  return i === -1 ? cards.length : i;
}

const Indicator = () => (
  <div aria-hidden="true" style={{ height: 3, borderRadius: 2, background: "var(--accent)", margin: "2px 0" }} />
);

export const KanbanBoard = () => {
  const [board, setBoard] = useState(initialBoard);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ columnId: string; index: number } | null>(null);
  const [message, setMessage] = useState("");
  const boardRef = useRef<HTMLDivElement>(null);

  // Drag and buttons both end up here, so both get the same announcement.
  const move = (cardId: string, toColumnId: string, toIndex: number) => {
    const next = moveCard(board, cardId, toColumnId, toIndex);
    if (next === board) return false;
    const { column, index } = findCard(next, cardId)!;
    // flushSync: the DOM must be updated before the caller moves focus.
    flushSync(() => setBoard(next));
    setMessage(
      `Moved "${next.cards[cardId].title}" to ${column.title}, position ${index + 1} of ${column.cardIds.length}.`,
    );
    return true;
  };

  const moveWithButton = (cardId: string, direction: Direction) => {
    const from = findCard(board, cardId)!;
    const col = board.columns.findIndex((c) => c.id === from.column.id);
    const target =
      direction === "up" ? { col, index: from.index - 1 }
      : direction === "down" ? { col, index: from.index + 1 }
      : { col: col + (direction === "left" ? -1 : 1), index: from.index };
    const toColumn = board.columns[target.col];
    if (!toColumn || !move(cardId, toColumn.id, target.index)) return;

    // Moving to another column remounts the card, so the button that was
    // focused no longer exists. Put focus back on the same button in its new
    // spot, or on the card if that button is now disabled (at an edge).
    const cardEl = boardRef.current?.querySelector<HTMLElement>(`[data-card-id="${cardId}"]`);
    const button = cardEl?.querySelector<HTMLButtonElement>(`[data-move="${direction}"]`);
    (button && !button.disabled ? button : cardEl)?.focus();
  };

  const onDragOver = (e: DragEvent<HTMLElement>, columnId: string) => {
    e.preventDefault(); // Without this the browser refuses the drop.
    e.dataTransfer.dropEffect = "move";
    const index = dropIndex(e.currentTarget, e.clientY, dragId);
    // dragover fires many times a second. Returning the same object skips
    // the re-render when the spot hasn't changed.
    setDropTarget((prev) =>
      prev?.columnId === columnId && prev.index === index ? prev : { columnId, index },
    );
  };

  const onDrop = (e: DragEvent<HTMLElement>, columnId: string) => {
    e.preventDefault();
    const cardId = e.dataTransfer.getData("text/plain");
    // Anything can be dropped here — text dragged from another page too.
    // Only act on ids that are our cards.
    if (board.cards[cardId]) {
      move(cardId, columnId, dropIndex(e.currentTarget, e.clientY, cardId));
    }
    // Clear here, not only in dragend: a drop into another column replaces
    // the dragged card's element, and the browser then fires dragend on the
    // old, removed element — React never sees it.
    setDragId(null);
    setDropTarget(null);
  };

  return (
    <div ref={boardRef}>
      <div style={{ display: "flex", gap: 12, overflowX: "auto", alignItems: "flex-start" }}>
        {board.columns.map((column, colIndex) => {
          const target = dropTarget?.columnId === column.id ? dropTarget.index : null;
          let position = 0; // Counts cards other than the dragged one.

          return (
            <section
              key={column.id}
              aria-labelledby={`col-${column.id}`}
              onDragOver={(e) => onDragOver(e, column.id)}
              onDragLeave={(e) => {
                // dragleave also fires when moving onto a child element.
                // Only clear when the pointer really left the column.
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDropTarget(null);
              }}
              onDrop={(e) => onDrop(e, column.id)}
              style={{
                flex: "1 0 200px",
                minHeight: 120, // So an empty column is still something to drop on.
                padding: 8,
                borderRadius: 8,
                border: `1px solid ${target !== null ? "var(--accent-border)" : "var(--border)"}`,
              }}
            >
              <h4 id={`col-${column.id}`} style={{ margin: "0 0 8px" }}>
                {column.title} ({column.cardIds.length})
              </h4>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {column.cardIds.map((cardId, i) => {
                  const card = board.cards[cardId];
                  const isDragged = cardId === dragId;
                  const showIndicatorBefore = !isDragged && target === position;
                  if (!isDragged) position++;

                  return (
                    <li key={cardId}>
                      {showIndicatorBefore && <Indicator />}
                      <div
                        data-card-id={cardId}
                        tabIndex={-1}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData("text/plain", cardId);
                          e.dataTransfer.effectAllowed = "move";
                          setDragId(cardId);
                        }}
                        // Covers the endings with no drop on the board:
                        // dropped outside, or cancelled with Escape.
                        onDragEnd={() => {
                          setDragId(null);
                          setDropTarget(null);
                        }}
                        style={{
                          padding: 8,
                          margin: "4px 0",
                          borderRadius: 6,
                          border: "1px solid var(--border)",
                          background: "var(--bg)",
                          cursor: "grab",
                        }}
                      >
                        <div>{card.title}</div>
                        <div className="demo-actions" style={{ margin: "6px 0 0" }}>
                          {(Object.keys(arrows) as Direction[]).map((dir) => (
                            <button
                              key={dir}
                              data-move={dir}
                              aria-label={`Move "${card.title}" ${dir}`}
                              disabled={
                                (dir === "up" && i === 0) ||
                                (dir === "down" && i === column.cardIds.length - 1) ||
                                (dir === "left" && colIndex === 0) ||
                                (dir === "right" && colIndex === board.columns.length - 1)
                              }
                              onClick={() => moveWithButton(cardId, dir)}
                              style={{ padding: "0 6px" }}
                            >
                              {arrows[dir]}
                            </button>
                          ))}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
              {target !== null && target === position && <Indicator />}
            </section>
          );
        })}
      </div>
      {/* Read out after every move, for drag and buttons alike. */}
      <p role="status" aria-live="polite" style={{ minHeight: "1.5em" }}>
        {message}
      </p>
    </div>
  );
};
