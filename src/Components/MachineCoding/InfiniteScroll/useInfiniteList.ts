import { useCallback, useRef, useState } from "react";
import { fetchFeedPage, type FeedItem } from "./feedApi";

export function useInfiniteList() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  // Refs, not state: the observer can call loadMore twice before React
  // re-renders, and both calls would read the same stale `isLoading === false`.
  const cursorRef = useRef<string | null>(null);
  const loadingRef = useRef(false);
  const requestIdRef = useRef(0); // reset() bumps this, so a response that lands after a reset is ignored.

  const loadMore = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    const requestId = requestIdRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const page = await fetchFeedPage(cursorRef.current);
      if (requestId !== requestIdRef.current) return;
      cursorRef.current = page.nextCursor;
      setItems((prev) => [...prev, ...page.items]);
      setHasMore(page.nextCursor !== null);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      if (requestId === requestIdRef.current) {
        loadingRef.current = false;
        setIsLoading(false);
      }
    }
  }, []);

  const reset = useCallback(() => {
    requestIdRef.current++;
    cursorRef.current = null;
    loadingRef.current = false;
    setItems([]);
    setError(null);
    setHasMore(true);
    setIsLoading(false);
  }, []);

  return { items, isLoading, error, hasMore, loadMore, reset };
}
