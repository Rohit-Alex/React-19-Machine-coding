import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export const Modal = ({ isOpen, ...props }: ModalProps) =>
  // Mount the content only while open, so its effects run on open and their
  // cleanups run on close — no "if (!isOpen)" checks inside them.
  isOpen ? createPortal(<ModalContent {...props} />, document.body) : null;

const ModalContent = ({ onClose, title, children }: Omit<ModalProps, "isOpen">) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  // Focus: move in on open, give it back on close.
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    const first = dialog?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? dialog)?.focus();
    return () => previouslyFocused?.focus();
  }, []);

  // Scroll lock. Save and restore the old value rather than setting "" —
  // with a modal open on top of a modal, the inner one must restore "hidden".
  useEffect(() => {
    const { overflow, paddingRight } = document.body.style;
    // Hiding the scrollbar makes the page wider and everything jumps right.
    // Pad by the scrollbar's width to keep it still.
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;
    return () => {
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
    };
  }, []);

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      // React events bubble through the React tree, even across portals. A
      // modal opened from inside this one would also close this one.
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== "Tab") return;
    event.stopPropagation();
    // Focus trap: wrap from the last element to the first, and back.
    const focusables = [...(dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])];
    if (focusables.length === 0) return event.preventDefault();
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      // Close on a press that *starts* on the backdrop. With onClick, selecting
      // text inside the dialog and releasing outside it would close it.
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgb(0 0 0 / 0.5)",
        display: "grid",
        placeItems: "center",
        zIndex: 1000,
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1} // Focus target if there's nothing focusable inside.
        onKeyDown={onKeyDown}
        style={{
          background: "var(--bg)",
          color: "var(--text)",
          borderRadius: 8,
          padding: 20,
          width: "min(420px, calc(100vw - 32px))",
          boxShadow: "0 10px 40px rgb(0 0 0 / 0.3)",
        }}
      >
        <h3 id={titleId} style={{ marginTop: 0 }}>
          {title}
        </h3>
        {children}
      </div>
    </div>
  );
};
