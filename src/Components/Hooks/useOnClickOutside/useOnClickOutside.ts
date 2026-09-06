import { useEffect } from "react";
import type { RefObject } from "react";

export function useOnClickOutside(
  ref: RefObject<HTMLElement | null>,
  onClickOutside: () => void,
): void {
  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const node = ref.current;
      if (!node || node.contains(event.target as Node)) {
        return;
      }
      onClickOutside();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [ref, onClickOutside]);
}
