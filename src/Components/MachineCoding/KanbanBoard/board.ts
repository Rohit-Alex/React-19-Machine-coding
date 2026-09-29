export interface Card {
  id: string;
  title: string;
}

export interface Column {
  id: string;
  title: string;
  cardIds: string[];
}

// Cards in one table, columns hold ordered ids. Moving a card only rewrites
// id lists; the card object itself is never copied or touched.
export interface Board {
  cards: Record<string, Card>;
  columns: Column[];
}

const titles = {
  todo: ["Design login page", "Write API spec", "Set up CI"],
  doing: ["Build carousel", "Fix scroll bug"],
  done: ["Project kickoff"],
};

export const initialBoard: Board = {
  cards: Object.fromEntries(
    Object.values(titles)
      .flat()
      .map((title, i) => [`c${i}`, { id: `c${i}`, title }]),
  ),
  columns: (() => {
    let n = 0;
    return (Object.keys(titles) as (keyof typeof titles)[]).map((id) => ({
      id,
      title: { todo: "To do", doing: "Doing", done: "Done" }[id],
      cardIds: titles[id].map(() => `c${n++}`),
    }));
  })(),
};

export function findCard(board: Board, cardId: string) {
  for (const column of board.columns) {
    const index = column.cardIds.indexOf(cardId);
    if (index !== -1) return { column, index };
  }
  return null;
}

/**
 * Move a card to `toIndex` in the target column. `toIndex` counts positions
 * in the target list *without* the moving card, which is how both the drop
 * indicator and the buttons work it out. Take the card out first, then
 * insert: that avoids the classic off-by-one when moving down in the same
 * column. Returns the same board if nothing moved.
 */
export function moveCard(
  board: Board,
  cardId: string,
  toColumnId: string,
  toIndex: number,
): Board {
  const from = findCard(board, cardId);
  if (!from || !board.columns.some((c) => c.id === toColumnId)) return board;
  if (from.column.id === toColumnId && from.index === toIndex) return board;

  return {
    ...board,
    columns: board.columns.map((column) => {
      const touchesSource = column.id === from.column.id;
      const isTarget = column.id === toColumnId;
      if (!touchesSource && !isTarget) return column; // Untouched: same object.

      const ids = column.cardIds.filter((id) => id !== cardId);
      if (isTarget) {
        ids.splice(Math.max(0, Math.min(toIndex, ids.length)), 0, cardId);
      }
      return { ...column, cardIds: ids };
    }),
  };
}
