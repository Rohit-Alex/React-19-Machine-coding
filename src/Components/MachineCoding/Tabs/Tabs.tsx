import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

export interface TabItem {
  id: string;
  label: string;
  content: ReactNode;
}

interface TabsProps {
  tabs: TabItem[];
  /** Name for the tab list, read by screen readers. */
  label: string;
  /** Controlled: the parent owns the selected tab. */
  value?: string;
  /** Uncontrolled: the starting tab; the component owns it after that. */
  defaultValue?: string;
  /** Called on every request to change tab, in both modes. */
  onChange?: (id: string) => void;
}

export const Tabs = ({ tabs, label, value, defaultValue, onChange }: TabsProps) => {
  const [internalValue, setInternalValue] = useState(defaultValue ?? tabs[0]?.id);
  // Decided by whether `value` was passed. Same rule as <input value> vs
  // <input defaultValue>.
  const isControlled = value !== undefined;
  const selectedId = isControlled ? value : internalValue;

  const baseId = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const select = (id: string) => {
    if (!isControlled) setInternalValue(id);
    onChange?.(id); // In controlled mode this is only a request; the parent decides.
  };

  // Roving tabindex: only the selected tab is in the Tab order. Arrows move
  // between tabs, so Tab goes straight from the tab list into the panel.
  const onKeyDown = (event: KeyboardEvent, index: number) => {
    const last = tabs.length - 1;
    const target = {
      ArrowRight: index === last ? 0 : index + 1,
      ArrowLeft: index === 0 ? last : index - 1,
      Home: 0,
      End: last,
    }[event.key];
    if (target === undefined) return;
    event.preventDefault();
    tabRefs.current[target]?.focus();
    select(tabs[target].id); // Automatic activation: arrowing selects.
  };

  return (
    <div>
      <div role="tablist" aria-label={label} style={{ display: "flex", borderBottom: "1px solid var(--border)" }}>
        {tabs.map((tab, index) => {
          const isSelected = tab.id === selectedId;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[index] = el;
              }}
              id={`${baseId}-tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={isSelected}
              aria-controls={`${baseId}-panel-${tab.id}`}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => select(tab.id)}
              onKeyDown={(event) => onKeyDown(event, index)}
              style={{
                all: "unset",
                padding: "8px 14px",
                cursor: "pointer",
                borderBottom: `2px solid ${isSelected ? "currentColor" : "transparent"}`,
                fontWeight: isSelected ? 600 : 400,
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {/* All panels stay mounted, so state inside them survives switching. */}
      {tabs.map((tab) => (
        <div
          key={tab.id}
          id={`${baseId}-panel-${tab.id}`}
          role="tabpanel"
          aria-labelledby={`${baseId}-tab-${tab.id}`}
          hidden={tab.id !== selectedId}
          tabIndex={0} // Lets keyboard users reach a panel with no focusable content.
          style={{ padding: "12px 4px" }}
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
};
