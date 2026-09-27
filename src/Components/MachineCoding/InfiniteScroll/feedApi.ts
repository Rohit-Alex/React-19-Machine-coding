export interface FeedItem {
  id: string;
  title: string;
  author: string;
}

export interface FeedPage {
  items: FeedItem[];
  nextCursor: string | null;
}

const TOTAL = 84;
const PAGE_SIZE = 12;
const AUTHORS = ["ada", "grace", "linus", "barbara", "alan", "margaret"];

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/*
 * A fake cursor-paginated feed.
 *
 * The cursor here wraps an index because the data is a fixed array. A real
 * cursor encodes the sort key of the last row you saw - "created_at + id",
 * usually base64'd so clients can't do arithmetic on it. The shape is what
 * matters: the server tells you where to resume, you never compute it.
 */
export async function fetchFeedPage(cursor: string | null): Promise<FeedPage> {
  await delay(100);

  const start = cursor ? Number(cursor.replace("c_", "")) : 0;
  const end = Math.min(start + PAGE_SIZE, TOTAL);

  const items: FeedItem[] = [];
  for (let i = start; i < end; i++) {
    items.push({
      id: `item_${i}`,
      title: `Post #${i + 1}`,
      author: AUTHORS[i % AUTHORS.length],
    });
  }

  return { items, nextCursor: end < TOTAL ? `c_${end}` : null };
}
