import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

export interface UseIntersectionObserverOptions extends IntersectionObserverInit {
  observeOnce?: boolean;
}

interface UseIntersectionObserverResult<T extends HTMLElement> {
  ref: RefObject<T | null>;
  isIntersecting: boolean;
  entry: IntersectionObserverEntry | null;
}

export function useIntersectionObserver<T extends HTMLElement>({
  root = null,
  rootMargin = "0px",
  threshold = 0,
  observeOnce = false,
}: UseIntersectionObserverOptions = {}): UseIntersectionObserverResult<T> {
  const ref = useRef<T | null>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || (observeOnce && isIntersecting)) return;

    const observer = new IntersectionObserver(
      ([observedEntry]) => {
        setEntry(observedEntry);
        setIsIntersecting(observedEntry.isIntersecting);
      },
      { root, rootMargin, threshold },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [root, rootMargin, threshold, observeOnce, isIntersecting]);

  return { ref, isIntersecting, entry };
}
