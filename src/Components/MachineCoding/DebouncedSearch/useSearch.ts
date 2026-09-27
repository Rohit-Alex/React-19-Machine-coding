import { useEffect, useState } from "react";
import { CATALOG, searchCatalog, type SearchResult } from "./searchApi";

export interface SearchState {
  status: "idle" | "loading" | "success" | "error";
  results: SearchResult[];
  error: string | null;
  /** The query these results actually belong to. Mismatch with the live input = a stale response won. */
  resultsFor: string;
}

const IDLE: SearchState = {
  status: "idle",
  results: CATALOG,
  error: null,
  resultsFor: "",
};

export function useSearch(query: string, cancelStale = true): SearchState {
  const [state, setState] = useState<SearchState>(IDLE);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setState(IDLE);
      return;
    }

    const controller = new AbortController();
    let isCurrent = true;

    setState((prev) => ({ ...prev, status: "loading", error: null }));

    searchCatalog(trimmed, controller.signal)
      .then((results) => {
        if (cancelStale && !isCurrent) return;
        setState({
          status: "success",
          results,
          error: null,
          resultsFor: trimmed,
        });
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (cancelStale && !isCurrent) return;
        setState({
          status: "error",
          results: [],
          error: err instanceof Error ? err.message : String(err),
          resultsFor: trimmed,
        });
      });

    return () => {
      isCurrent = false;
      if (cancelStale) controller.abort();
    };
  }, [query, cancelStale]);

  return state;
}
