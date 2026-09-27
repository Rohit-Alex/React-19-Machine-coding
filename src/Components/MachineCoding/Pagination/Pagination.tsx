import { getPageRange } from "./getPageRange";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationProps) => {
  if (totalPages <= 1) return null;

  return (
    <nav aria-label="Pagination" className="demo-actions">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label="Previous page"
      >
        ‹
      </button>

      {getPageRange(currentPage, totalPages).map((item, i) =>
        item === "gap" ? (
          // Two gaps can appear, so the key needs the position.
          <span key={`gap-${i}`} aria-hidden="true">
            …
          </span>
        ) : (
          <button
            key={item}
            onClick={() => onPageChange(item)}
            aria-label={`Page ${item}`}
            aria-current={item === currentPage ? "page" : undefined}
            style={{ fontWeight: item === currentPage ? 700 : 400 }}
          >
            {item}
          </button>
        ),
      )}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        aria-label="Next page"
      >
        ›
      </button>
    </nav>
  );
};
