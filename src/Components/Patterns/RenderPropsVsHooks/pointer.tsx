import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { useIsOnline } from "../../Hooks/useIsOnline/useIsOnline";

export interface Pointer {
  x: number;
  y: number;
  inside: boolean;
}

// ---- The logic, as a hook ----
export function usePointer(ref: RefObject<HTMLElement | null>): Pointer {
  const [pointer, setPointer] = useState<Pointer>({ x: 0, y: 0, inside: false });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onMove = (e: PointerEvent) => {
      const box = el.getBoundingClientRect();
      setPointer({ x: Math.round(e.clientX - box.left), y: Math.round(e.clientY - box.top), inside: true });
    };
    const onLeave = () => setPointer((p) => ({ ...p, inside: false }));
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, [ref]);
  return pointer;
}

// ---- The same logic, as render-prop components ----
// Before hooks, this was the main way to share stateful logic. Note that a
// render prop can be a thin wrapper around a hook — the hook is the core.

export const PointerTracker = ({ children }: { children: (pointer: Pointer) => ReactNode }) => {
  const ref = useRef<HTMLDivElement>(null);
  const pointer = usePointer(ref);
  // The component must render an element to measure — the caller can't choose it.
  return <div ref={ref}>{children(pointer)}</div>;
};

export const OnlineStatus = ({ children }: { children: (online: boolean) => ReactNode }) => <>{children(useIsOnline())}</>;
