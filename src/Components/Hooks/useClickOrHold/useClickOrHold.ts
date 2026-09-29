import { useEffect, useRef } from "react";
import type { MouseEvent, PointerEvent } from "react";

interface Options {
  onClick?: (e: MouseEvent) => void;
  onHold: () => void;
  /** How long the press must last to count as a hold, in ms. */
  delay?: number;
}

/**
 * One element, two actions: a short press is a click, a long press is a hold.
 * Spread the result onto a button: `<button {...useClickOrHold({...})}>`.
 *
 * Short presses are left to the browser's own `click` event, so keyboard
 * (Enter / Space), "released outside = cancelled" and "scrolled away =
 * cancelled" all work without extra code. The hook only has to start a timer
 * and, if the hold fired, swallow the click that follows it.
 */
export function useClickOrHold({ onClick, onHold, delay = 500 }: Options) {
  // Refs, not state: nothing on screen depends on these, and a ref is read
  // at the moment it's needed, so there's no stale closure.
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const held = useRef(false);
  const pressing = useRef(false);

  const cancel = () => {
    pressing.current = false;
    clearTimeout(timer.current);
  };

  useEffect(() => cancel, []); // Unmounted mid-press: don't fire onHold later.

  return {
    onPointerDown: (e: PointerEvent) => {
      // Main button / first finger only. Right-click and a second finger
      // shouldn't start (or restart) a hold.
      if (e.button !== 0 || !e.isPrimary) return;
      held.current = false;
      cancel();
      pressing.current = true;
      timer.current = setTimeout(() => {
        held.current = true;
        onHold();
      }, delay);
    },
    onPointerUp: cancel,
    onPointerLeave: cancel,
    // The browser took the gesture over (usually: the finger started a scroll).
    onPointerCancel: cancel,
    onClick: (e: MouseEvent) => {
      if (held.current) {
        held.current = false; // This click is just the end of the hold.
        return;
      }
      onClick?.(e);
    },
    // Android opens the long-press menu while the finger is down. Block it
    // only during our press; a right-click never starts one (button !== 0
    // above), so the desktop menu still works.
    onContextMenu: (e: MouseEvent) => {
      if (pressing.current || held.current) e.preventDefault();
    },
  };
}
