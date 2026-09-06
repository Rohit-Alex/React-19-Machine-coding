import { useEffect, useRef } from "react";
import type { RefObject } from "react";

export function useEventListener<K extends keyof WindowEventMap>(
  eventType: K,
  handler: (event: WindowEventMap[K]) => void,
  target?: RefObject<HTMLElement | null> | Window,
): void {
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    const node = target && "current" in target ? target.current : (target ?? window);
    if (!node) return;

    const listener = (event: Event) => handlerRef.current(event as WindowEventMap[K]);

    node.addEventListener(eventType, listener);
    return () => node.removeEventListener(eventType, listener);
  }, [eventType, target]);
}
