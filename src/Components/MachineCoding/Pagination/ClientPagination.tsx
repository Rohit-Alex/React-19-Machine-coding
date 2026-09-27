import { useState } from "react";
import { Pagination } from "./Pagination";
import { PRODUCTS } from "./productsApi";

export const ClientPagination = () => {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filtered = PRODUCTS.filter((p) =>
    p.name.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  // Belt and braces: never render a page that no longer exists.
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const visible = filtered.slice(start, start + pageSize);

  return (
    <div className="demo-card">
      <h4>Client-side: all 95 rows already in memory</h4>
      <p>
        Go to page 8, then type <code>9</code> in the search box. You land on
        page 1 of the results instead of an empty page 8.
      </p>

      <div className="demo-actions">
        <input
          type="search"
          aria-label="Filter products"
          placeholder="Filter..."
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            // Reset in the handler, not in an effect: an effect would render
            // the empty page first and fix it one render later.
            setPage(1);
          }}
        />
        <label>
          per page{" "}
          <select
            value={pageSize}
            onChange={(event) => {
              const nextSize = Number(event.target.value);
              // Keep the first row you were looking at on screen.
              setPage(
                Math.floor(((currentPage - 1) * pageSize) / nextSize) + 1,
              );
              setPageSize(nextSize);
            }}
          >
            {[5, 10, 25].map((size) => (
              <option key={size}>{size}</option>
            ))}
          </select>
        </label>
      </div>

      <p aria-live="polite">
        {filtered.length === 0
          ? "No products match."
          : `Showing ${start + 1}–${start + visible.length} of ${filtered.length}`}
      </p>

      <ul>
        {visible.map((p) => (
          <li key={p.id}>
            {p.name} — ₹{p.price}
          </li>
        ))}
      </ul>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </div>
  );
};
