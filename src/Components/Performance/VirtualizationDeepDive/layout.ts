/**
 * offsets[i] = top of row i; offsets[n] = total height.
 * Unknown rows use the estimate until they've been measured.
 */
export function buildOffsets(count: number, heights: (number | undefined)[], estimate: number): number[] {
  const offsets = [0];
  for (let i = 0; i < count; i++) offsets[i + 1] = offsets[i] + (heights[i] ?? estimate);
  return offsets;
}

/**
 * The row at `y` pixels from the top: the last i with offsets[i] <= y.
 * Binary search, because rows have different heights — y / rowHeight only
 * works when they're all the same.
 */
export function findRowAt(offsets: number[], y: number): number {
  let low = 0;
  let high = offsets.length - 2; // Last row index.
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (offsets[mid] <= y) low = mid;
    else high = mid - 1;
  }
  return Math.max(0, low);
}

export function visibleRange(offsets: number[], scrollTop: number, viewport: number, overscan: number) {
  const count = offsets.length - 1;
  const first = findRowAt(offsets, scrollTop);
  const last = findRowAt(offsets, scrollTop + viewport);
  return { start: Math.max(0, first - overscan), end: Math.min(count, last + 1 + overscan) };
}
