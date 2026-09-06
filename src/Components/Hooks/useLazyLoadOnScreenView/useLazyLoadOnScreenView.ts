import type { RefObject } from "react";
import { useIntersectionObserver } from "../useIntersectionObserver/useIntersectionObserver";

export interface UseLazyLoadOnScreenViewOptions {
  rootMargin?: string;
  threshold?: number;
}

interface UseLazyLoadOnScreenViewResult<T extends HTMLElement> {
  ref: RefObject<T | null>;
  shouldLoad: boolean;
}

export function useLazyLoadOnScreenView<T extends HTMLElement>({
  rootMargin = "200px",
  threshold = 0,
}: UseLazyLoadOnScreenViewOptions = {}): UseLazyLoadOnScreenViewResult<T> {
  const { ref, isIntersecting } = useIntersectionObserver<T>({
    rootMargin,
    threshold,
    observeOnce: true,
  });

  return { ref, shouldLoad: isIntersecting };
}
