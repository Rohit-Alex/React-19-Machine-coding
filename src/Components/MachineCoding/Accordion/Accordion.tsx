import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

export interface AccordionItem {
  id: string;
  title: string;
  content: ReactNode;
}

interface AccordionProps {
  items: AccordionItem[];
  /** false: opening one closes the others. true: any number can be open. */
  allowMultiple?: boolean;
  defaultOpenIds?: string[];
}

export const Accordion = ({ items, allowMultiple = false, defaultOpenIds = [] }: AccordionProps) => {
  // One Set covers both modes. Single-open is just "a Set of at most one".
  const [openIds, setOpenIds] = useState(() => new Set(defaultOpenIds));
  const baseId = useId();
  const headerRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const toggle = (id: string) => {
    setOpenIds((prev) => {
      const isOpen = prev.has(id);
      if (!allowMultiple) return isOpen ? new Set() : new Set([id]);
      // New Set, never prev.add(): mutating the old one means React sees the
      // same object and skips the re-render.
      const next = new Set(prev);
      if (isOpen) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Optional per the ARIA pattern, but expected at senior level:
  // Up/Down move between headers, Home/End jump to the ends.
  const onHeaderKeyDown = (event: KeyboardEvent, index: number) => {
    const last = items.length - 1;
    const target = {
      ArrowDown: index === last ? 0 : index + 1,
      ArrowUp: index === 0 ? last : index - 1,
      Home: 0,
      End: last,
    }[event.key];
    if (target === undefined) return;
    event.preventDefault(); // Stop the page scrolling.
    headerRefs.current[target]?.focus();
  };

  return (
    <div>
      {items.map((item, index) => {
        const isOpen = openIds.has(item.id);
        const headerId = `${baseId}-header-${item.id}`;
        const panelId = `${baseId}-panel-${item.id}`;
        return (
          <div key={item.id} style={{ borderBottom: "1px solid var(--border)" }}>
            {/* The heading gives screen-reader users a way to jump between sections. */}
            <h3 style={{ margin: 0, fontSize: "1rem" }}>
              <button
                ref={(el) => {
                  headerRefs.current[index] = el;
                }}
                id={headerId}
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggle(item.id)}
                onKeyDown={(event) => onHeaderKeyDown(event, index)}
                style={{
                  all: "unset",
                  boxSizing: "border-box",
                  width: "100%",
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "10px 4px",
                  cursor: "pointer",
                }}
              >
                {item.title}
                <span aria-hidden="true">{isOpen ? "−" : "+"}</span>
              </button>
            </h3>
            {/* Always rendered, hidden when closed: aria-controls must point at
                an element that exists, and the content keeps its state. */}
            <div
              id={panelId}
              role="region"
              aria-labelledby={headerId}
              hidden={!isOpen}
              style={{ padding: "0 4px 12px" }}
            >
              {item.content}
            </div>
          </div>
        );
      })}
    </div>
  );
};
