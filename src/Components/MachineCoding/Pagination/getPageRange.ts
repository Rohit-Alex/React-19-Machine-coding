export type PageItem = number | "gap";

const range = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i);

/*
 * Page buttons to show: first, last, the current page, `siblingCount` pages
 * either side of it, and a gap wherever pages are hidden.
 *
 * Always returns the same number of slots (2 * siblingCount + 5) once there
 * are enough pages, so the buttons don't shift under the cursor as you click.
 */
export function getPageRange(
  currentPage: number,
  totalPages: number,
  siblingCount = 1,
): PageItem[] {
  const totalSlots = 2 * siblingCount + 5;
  if (totalPages <= totalSlots) return range(1, totalPages);

  const leftSibling = Math.max(currentPage - siblingCount, 1);
  const rightSibling = Math.min(currentPage + siblingCount, totalPages);

  // A gap takes a slot, so it must hide at least two pages. Hiding one page
  // behind "…" saves nothing — just show the page.
  const showLeftGap = leftSibling > 3;
  const showRightGap = rightSibling < totalPages - 2;

  // Near an edge, spend the missing gap's slot on more page numbers.
  const edgeCount = 3 + 2 * siblingCount;

  if (!showLeftGap) {
    return [...range(1, edgeCount), "gap", totalPages];
  }
  if (!showRightGap) {
    return [1, "gap", ...range(totalPages - edgeCount + 1, totalPages)];
  }
  return [1, "gap", ...range(leftSibling, rightSibling), "gap", totalPages];
}
