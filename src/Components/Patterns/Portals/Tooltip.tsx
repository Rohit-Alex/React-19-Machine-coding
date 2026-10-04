import { cloneElement, useEffect, useId, useRef, useState, type ReactElement } from "react";
import { createPortal } from "react-dom";
import { useAnchorPosition } from "./useAnchorPosition";

interface TooltipProps {
  text: string;
  /** One focusable element: the trigger. */
  children: ReactElement<{ "aria-describedby"?: string }>;
  usePortal?: boolean;
}

export const Tooltip = ({ text, children, usePortal = true }: TooltipProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const anchorRef = useRef<HTMLSpanElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const timer = useRef(0); // One timer for both the show and hide delays.
  const id = useId();
  const position = useAnchorPosition(anchorRef, tipRef, isOpen && usePortal, "top");

  // Show after a short delay, so sweeping the mouse across the page doesn't
  // pop tooltips everywhere. Hide after a shorter one, so the pointer can
  // travel from the trigger onto the tooltip without it vanishing.
  const later = (open: boolean, ms: number) => {
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setIsOpen(open), ms);
  };
  const show = () => later(true, 300);
  const hide = () => later(false, 120);
  const keepOpen = () => clearTimeout(timer.current);
  useEffect(() => () => clearTimeout(timer.current), []);

  // Escape must close it without moving focus (WCAG 1.4.13).
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setIsOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen]);

  const tip = (
    <div
      ref={tipRef}
      id={id}
      role="tooltip"
      // Hovering the tooltip itself keeps it open, so it can be read and selected.
      onPointerEnter={keepOpen}
      onPointerLeave={hide}
      style={{
        ...(usePortal
          ? // Fixed to the viewport, hidden until measured and placed.
            { position: "fixed", top: position?.top ?? 0, left: position?.left ?? 0, visibility: position ? "visible" : "hidden" }
          : // Not portaled: positioned inside the trigger's box, so clipped by any overflow:hidden parent.
            { position: "absolute", bottom: "calc(100% + 6px)", left: 0 }),
        zIndex: 1200,
        maxWidth: 220,
        padding: "6px 8px",
        borderRadius: 4,
        fontSize: 12,
        background: "#222",
        color: "#fff",
        pointerEvents: "auto",
      }}
    >
      {text}
    </div>
  );

  return (
    <span
      ref={anchorRef}
      onPointerEnter={show}
      onPointerLeave={hide}
      onFocus={() => {
        keepOpen();
        setIsOpen(true); // Keyboard users: no delay.
      }}
      onBlur={hide}
      style={{ position: "relative", display: "inline-block" }}
    >
      {/* The trigger points at the tooltip, so screen readers read it as a description. */}
      {cloneElement(children, { "aria-describedby": isOpen ? id : undefined })}
      {isOpen && (usePortal ? createPortal(tip, document.body) : tip)}
    </span>
  );
};
