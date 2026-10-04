import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAnchorPosition } from "./useAnchorPosition";

interface MenuProps {
  label: string;
  items: string[];
  onSelect: (item: string) => void;
  stopPropagation: boolean;
}

export const Menu = ({ label, items, onSelect, stopPropagation }: MenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const position = useAnchorPosition(buttonRef, menuRef, isOpen, "bottom");

  // Click outside: the menu is NOT inside the button's DOM parent any more
  // (it's in <body>), so check both elements.
  useEffect(() => {
    if (!isOpen) return;
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!buttonRef.current?.contains(target) && !menuRef.current?.contains(target)) setIsOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [isOpen]);

  // Focus the first item on open; arrows move; Escape closes and returns focus.
  useEffect(() => {
    if (isOpen) menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
  }, [isOpen]);

  const close = () => {
    setIsOpen(false);
    buttonRef.current?.focus();
  };

  return (
    <>
      <button
        ref={buttonRef}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={(e) => {
          if (stopPropagation) e.stopPropagation();
          setIsOpen((o) => !o);
        }}
      >
        {label} ▾
      </button>
      {isOpen &&
        createPortal(
          <ul
            ref={menuRef}
            role="menu"
            aria-label={label}
            // React events bubble through the React tree — through the portal
            // to the card's onClick — even though the DOM parent is <body>.
            onClick={(e) => stopPropagation && e.stopPropagation()}
            onKeyDown={(e) => {
              const items = [...(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
              const i = items.indexOf(document.activeElement as HTMLElement);
              if (e.key === "Escape") close();
              else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                e.preventDefault();
                items[(i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus();
              }
            }}
            style={{
              position: "fixed",
              top: position?.top ?? 0,
              left: position?.left ?? 0,
              visibility: position ? "visible" : "hidden",
              zIndex: 1200,
              margin: 0,
              padding: 4,
              listStyle: "none",
              minWidth: 140,
              background: "var(--bg)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              boxShadow: "0 6px 20px rgb(0 0 0 / 0.2)",
            }}
          >
            {items.map((item) => (
              <li key={item}>
                <button
                  role="menuitem"
                  tabIndex={-1}
                  onClick={() => {
                    onSelect(item);
                    close();
                  }}
                  style={{ all: "unset", display: "block", width: "100%", padding: "4px 8px", cursor: "pointer", boxSizing: "border-box" }}
                >
                  {item}
                </button>
              </li>
            ))}
          </ul>,
          document.body,
        )}
    </>
  );
};
