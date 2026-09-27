import { useEffect, useState, type Key, type ReactNode } from "react";

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  bufferCount?: number;
  getKey: (item: T, index: number) => Key;
  renderItem: (item: T, index: number) => ReactNode;
  onRangeChange?: (start: number, end: number) => void;
  ariaLabel: string;
}

export function VirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  bufferCount = 2,
  getKey,
  renderItem,
  onRangeChange,
  ariaLabel,
}: VirtualListProps<T>) {
  // Store the first visible row, not the raw scrollTop. Scrolling fires dozens
  // of events per row; the row index only changes once per row, and React
  // skips the re-render when the new state equals the old one.
  const [firstVisibleRowIndex, setFirstVisibleRowIndex] = useState(0);

  // +1 because a scrolled window shows a partial row at the top AND the bottom.
  const visibleCount = Math.ceil(containerHeight / itemHeight) + 1;

  const startIndex = Math.max(0, firstVisibleRowIndex - bufferCount);
  const endIndex = Math.min(
    items.length,
    firstVisibleRowIndex + visibleCount + bufferCount,
  );

  useEffect(() => {
    onRangeChange?.(startIndex, endIndex);
  }, [startIndex, endIndex, onRangeChange]);

  return (
    <div
      role="list"
      aria-label={ariaLabel}
      tabIndex={0}
      onScroll={(event) =>
        setFirstVisibleRowIndex(
          Math.floor(event.currentTarget.scrollTop / itemHeight),
        )
      }
      style={{
        height: containerHeight,
        overflowY: "auto",
        border: "1px solid rgba(128,128,128,0.4)",
        borderRadius: 6,
      }}
    >
      <div style={{ height: items.length * itemHeight }}>
        <div style={{ transform: `translateY(${startIndex * itemHeight}px)` }}>
          {items.slice(startIndex, endIndex).map((item, offset) => {
            const index = startIndex + offset;
            return (
              <div
                key={getKey(item, index)}
                role="listitem"
                // Only a slice is in the DOM, so tell assistive tech where
                // this row sits in the full list.
                aria-setsize={items.length}
                aria-posinset={index + 1}
                style={{
                  height: itemHeight,
                  // Without this the border adds 1px to every row, and the
                  // rows drift away from the positions the maths assumes.
                  boxSizing: "border-box",
                  overflow: "hidden",
                }}
              >
                {renderItem(item, index)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
