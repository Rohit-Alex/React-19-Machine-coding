import { useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type Ref } from "react";
import { buildOffsets, findRowAt, visibleRange } from "./layout";

export interface VirtualListHandle {
  scrollToIndex: (index: number) => void;
}

interface Props<T> {
  items: T[];
  getKey: (item: T) => string | number;
  renderItem: (item: T, index: number) => ReactNode;
  height: number;
  estimate?: number; // Guess for rows not measured yet.
  overscan?: number;
  ariaLabel: string;
  ref?: Ref<VirtualListHandle>; // React 19: ref is a normal prop.
}

export function VariableVirtualList<T>({ items, getKey, renderItem, height, estimate = 64, overscan = 4, ariaLabel, ref }: Props<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Measured heights. A ref, not state: thousands of numbers updated from an
  // observer. `version` is the state that says "they changed, re-render".
  const heights = useRef<(number | undefined)[]>([]);
  const [version, setVersion] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps -- `version` is how we know heights.current changed.
  const offsets = useMemo(() => buildOffsets(items.length, heights.current, estimate), [items.length, estimate, version]);
  const { start, end } = visibleRange(offsets, scrollTop, height, overscan);

  // The first row actually on screen, read by the observer below. Updated
  // after each commit (refs shouldn't be written during render), before the
  // observer runs.
  const firstVisible = useRef(0);
  useLayoutEffect(() => {
    firstVisible.current = findRowAt(offsets, scrollTop);
  }, [offsets, scrollTop]);

  // One observer for every row. It fires when a row first appears and
  // whenever its height changes (text wraps differently, an image loads).
  const observer = useMemo(
    () =>
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver((entries) => {
            let changed = false;
            let shiftAbove = 0;
            for (const entry of entries) {
              const index = Number((entry.target as HTMLElement).dataset.index);
              const measured = entry.borderBoxSize[0].blockSize;
              const previous = heights.current[index] ?? estimate;
              if (heights.current[index] === measured) continue;
              heights.current[index] = measured;
              changed = true;
              // A row *above* what you're reading changed height: everything
              // below it moves. Remember by how much, to scroll by the same.
              if (index < firstVisible.current) shiftAbove += measured - previous;
            }
            if (!changed) return;
            if (shiftAbove && containerRef.current) containerRef.current.scrollTop += shiftAbove;
            setVersion((v) => v + 1);
          }),
    [estimate],
  );
  useEffect(() => () => observer?.disconnect(), [observer]);

  // A ref callback with cleanup (React 19): observe on mount, stop on unmount.
  const observeRow = useCallback(
    (el: HTMLDivElement | null) => {
      if (!el || !observer) return;
      observer.observe(el);
      return () => observer.unobserve(el);
    },
    [observer],
  );

  useImperativeHandle(ref, () => ({
    scrollToIndex(index) {
      // Lands on the estimate first; measuring the rows there corrects it.
      if (containerRef.current) containerRef.current.scrollTop = offsets[Math.max(0, Math.min(index, items.length - 1))];
    },
  }));

  return (
    <div
      ref={containerRef}
      role="list"
      aria-label={ariaLabel}
      tabIndex={0}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
      style={{ height, overflowY: "auto", border: "1px solid var(--border)", borderRadius: 6, overflowAnchor: "none" }}
    >
      {/* The full height, so the scrollbar is the right size. */}
      <div style={{ height: offsets[items.length], position: "relative" }}>
        {/* Only the rendered rows, moved down to where the first one belongs. */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, transform: `translateY(${offsets[start]}px)` }}>
          {items.slice(start, end).map((item, i) => {
            const index = start + i;
            return (
              <div key={getKey(item)} ref={observeRow} data-index={index} role="listitem" aria-setsize={items.length} aria-posinset={index + 1}>
                {renderItem(item, index)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
