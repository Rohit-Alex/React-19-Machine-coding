import { useLayoutEffect, useState, type RefObject } from "react";

export interface Position {
  top: number;
  left: number;
  placement: "top" | "bottom";
}

const GAP = 6;

/**
 * Where to put a floating element (portaled to <body>, position: fixed) next
 * to its anchor. Prefers `preferred`, flips if there's no room, keeps it on
 * screen sideways, and follows the anchor on scroll and resize.
 */
export function useAnchorPosition(
  anchorRef: RefObject<HTMLElement | null>,
  floatingRef: RefObject<HTMLElement | null>,
  isOpen: boolean,
  preferred: "top" | "bottom",
) {
  const [position, setPosition] = useState<Position | null>(null);

  // Layout effect: measure and place before the browser paints, so the
  // floating element never flashes at the wrong spot.
  useLayoutEffect(() => {
    if (!isOpen) return setPosition(null);
    const update = () => {
      const anchor = anchorRef.current?.getBoundingClientRect();
      const floating = floatingRef.current?.getBoundingClientRect();
      if (!anchor || !floating) return;
      const roomAbove = anchor.top;
      const roomBelow = window.innerHeight - anchor.bottom;
      const needed = floating.height + GAP;
      const placement =
        preferred === "top" ? (roomAbove >= needed || roomAbove > roomBelow ? "top" : "bottom") : roomBelow >= needed || roomBelow > roomAbove ? "bottom" : "top";
      const top = placement === "top" ? anchor.top - needed : anchor.bottom + GAP;
      // Centre on the anchor, but never off either edge of the screen.
      const centred = anchor.left + anchor.width / 2 - floating.width / 2;
      const left = Math.max(8, Math.min(centred, window.innerWidth - floating.width - 8));
      setPosition({ top, left, placement });
    };
    update();
    // capture: true catches scrolling in *any* scroll container, not just the window.
    window.addEventListener("scroll", update, { capture: true, passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, { capture: true });
      window.removeEventListener("resize", update);
    };
  }, [isOpen, anchorRef, floatingRef, preferred]);

  return position;
}
