import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

export interface ElementSize {
  width: number;
  height: number;
}

interface UseResizeObserverResult<T extends HTMLElement> {
  ref: RefObject<T | null>;
  size: ElementSize | null;
}

/*
 * useResizeObserver — observe one element's box, not the window's.
 *
 * window.resize only fires when the viewport changes. An element can change
 * size for reasons the window never hears about: a sidebar collapsing, a font
 * loading, content growing, a flex sibling giving up space. ResizeObserver is
 * the only thing that catches those.
 */
export function useResizeObserver<
  T extends HTMLElement,
>(): UseResizeObserverResult<T> {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState<ElementSize | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new ResizeObserver(([entry]) => {
      // contentBoxSize is the modern, fractional-accurate read.
      // contentRect is the older equivalent and is still fine.
      // console.log(entry, "entry");
      const box = entry.contentBoxSize?.[0];
      setSize(
        box
          ? { width: box.inlineSize, height: box.blockSize }
          : {
              width: entry.contentRect.width,
              height: entry.contentRect.height,
            },
      );
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return { ref, size };
}
