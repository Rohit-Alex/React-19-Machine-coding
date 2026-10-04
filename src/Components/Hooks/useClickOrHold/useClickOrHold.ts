import { useEffect, useRef } from "react";
import type { MouseEvent, PointerEvent } from "react";

interface Options {
  onClick?: (e: MouseEvent) => void;
  onHold: () => void;
  delay?: number;
}

/**
 * One element, two actions: a short press is a click, a long press is a hold.
 * Spread the result onto a button: `<button {...useClickOrHold({...})}>`.
 */
export function useClickOrHold({ onClick, onHold, delay = 500 }: Options) {
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const held = useRef(false);

  const cancel = () => {
    clearTimeout(timer.current);
  };

  useEffect(() => {
    return () => {
      clearTimeout(timer.current);
    };
  }, []);

  return {
    onPointerDown: (e: PointerEvent) => {
      // Main button / first finger only. Right-click and a second finger
      // shouldn't start (or restart) a hold.
      if (e.button !== 0 || !e.isPrimary) return;
      clearTimeout(timer.current);
      held.current = false;
      timer.current = setTimeout(() => {
        held.current = true;
        onHold();
      }, delay);
    },
    onPointerUp: () => {
      clearTimeout(timer.current);
    },
    onPointerLeave: cancel,
    onPointerCancel: cancel,
    onClick: (e: MouseEvent) => {
      if (held.current) {
        return;
      }
      onClick?.(e);
    },
  };
}
