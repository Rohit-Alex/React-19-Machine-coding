import { useId, useState } from "react";
import { useDebounce } from "../../Hooks/useDebounce/useDebounce";
import { useSearch } from "./useSearch";

export const DebouncedSearch = () => {
  const [query, setQuery] = useState("");
  const [cancelStale, setCancelStale] = useState(true);

  const debouncedQuery = useDebounce(query, 350);
  const { status, results, error, resultsFor } = useSearch(
    debouncedQuery,
    cancelStale,
  );

  const inputId = useId();
  const isStale =
    status === "success" && resultsFor !== debouncedQuery.trim();

  return (
    <div className="demo-card">
      <h4>Debounced search with stale-request cancellation</h4>
      <p>
        Type <code>react</code> quickly. Short queries are served slower than
        long ones, so the request for <code>rea</code> lands after the request
        for <code>react</code>. With cancellation off, that late response
        overwrites the correct one.
      </p>

      <div className="demo-actions">
        <label htmlFor={inputId}>Search libraries</label>
        <input
          id={inputId}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="react, vite, state..."
          autoComplete="off"
        />
        <label>
          <input
            type="checkbox"
            checked={cancelStale}
            onChange={(event) => setCancelStale(event.target.checked)}
          />{" "}
          cancel stale requests
        </label>
      </div>

      <p aria-live="polite">
        {status === "loading" && <>Searching for "{debouncedQuery.trim()}"...</>}
        {status === "error" && <>Search failed: {error}</>}
        {status === "idle" && <>Type at least one character to search.</>}
        {status === "success" && (
          <>
            {results.length} result{results.length === 1 ? "" : "s"} for "
            {resultsFor}"
            {isStale && (
              <strong> — stale! the input now says "{debouncedQuery.trim()}"</strong>
            )}
          </>
        )}
      </p>

      {status === "success" && results.length > 0 && (
        <ul>
          {results.map((item) => (
            <li key={item.id}>
              {item.name} <small>({item.category})</small>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
