import { useEffect, useState } from "react";
import { Pagination } from "./Pagination";
import { fetchProducts, type ProductPage } from "./productsApi";

export const ServerPagination = () => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [data, setData] = useState<ProductPage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Click page 2 then page 3 quickly: if page 2's response lands last, it
    // must not overwrite page 3. The cleanup marks the old request as stale.
    let ignore = false;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const result = await fetchProducts(page, pageSize);
        if (!ignore) setData(result);
      } catch (err) {
        if (!ignore) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, [page, pageSize]);

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0;
  const start = (page - 1) * pageSize;

  return (
    <div className="demo-card">
      <h4>Server-side: one page per request</h4>
      <p>
        Each click asks the server for one page (500ms). The old page stays on
        screen, dimmed, until the new one arrives — no blank flash, no jump in
        height.
      </p>

      <div className="demo-actions">
        <label>
          per page{" "}
          <select
            value={pageSize}
            onChange={(event) => {
              const nextSize = Number(event.target.value);
              setPage(Math.floor(((page - 1) * pageSize) / nextSize) + 1);
              setPageSize(nextSize);
            }}
          >
            {[5, 10, 25].map((size) => (
              <option key={size}>{size}</option>
            ))}
          </select>
        </label>
      </div>

      {error && <p role="alert">{error}</p>}

      <p aria-live="polite">
        {!data
          ? "Loading..."
          : `Showing ${start + 1}–${Math.min(start + pageSize, data.total)} of ${data.total}${isLoading ? " · loading" : ""}`}
      </p>

      <ul
        aria-busy={isLoading}
        style={{ opacity: isLoading && data ? 0.5 : 1, transition: "opacity 150ms" }}
      >
        {data?.items.map((p) => (
          <li key={p.id}>
            {p.name} — ₹{p.price}
          </li>
        ))}
      </ul>

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </div>
  );
};
