import { useEffect, useState } from "react";
import { useIntersectionObserver } from "../../Hooks/useIntersectionObserver/useIntersectionObserver";
import { useInfiniteList } from "./useInfiniteList";

export const InfiniteFeed = () => {
  const [rootEl, setRootEl] = useState<HTMLElement | null>(null);

  const { items, isLoading, error, hasMore, loadMore, reset } =
    useInfiniteList();

  const { ref: sentinelRef, isIntersecting } =
    useIntersectionObserver<HTMLDivElement>({
      root: rootEl,
      rootMargin: "100px",
    });

  useEffect(() => {
    loadMore();
  }, [loadMore]);

  useEffect(() => {
    if (!isIntersecting) return;
    if (!hasMore || isLoading || error) return;
    loadMore();
  }, [isIntersecting, hasMore, isLoading, error, loadMore]);

  return (
    <div className="demo-card">
      <h4>Infinite scroll with a cursor-paginated feed</h4>
      <p>
        Scroll the list. A sentinel below the last row triggers the next page
        through <code>IntersectionObserver</code> — no scroll handler, no
        position arithmetic.
      </p>

      <div className="demo-actions">
        <button onClick={reset}>reset</button>
      </div>

      <div
        ref={setRootEl}
        style={{
          height: 300,
          overflowY: "auto",
          border: "1px solid rgba(128,128,128,0.4)",
          borderRadius: 6,
          padding: "0 12px",
        }}
      >
        <ul
          aria-busy={isLoading}
          style={{ listStyle: "none", padding: 0, margin: "12px 0" }}
        >
          {items.map((item) => (
            <li
              key={item.id}
              style={{
                padding: "10px 0",
                borderBottom: "1px solid rgba(128,128,128,0.2)",
              }}
            >
              {item.title} <small>by {item.author}</small>
            </li>
          ))}
        </ul>

        <div ref={sentinelRef} aria-hidden="true" style={{ height: 1 }} />

        <div style={{ padding: "12px 0" }}>
          {error && (
            <>
              <p role="alert">{error}</p>
              <button onClick={loadMore}>Retry</button>
            </>
          )}
          {!error && hasMore && (
            <button onClick={loadMore} disabled={isLoading}>
              {isLoading ? "Loading..." : "Load more"}
            </button>
          )}
          {!hasMore && <p>You have reached the end.</p>}
        </div>
      </div>

      <p aria-live="polite">
        {items.length} loaded{isLoading && " · fetching next page"}
      </p>
    </div>
  );
};
