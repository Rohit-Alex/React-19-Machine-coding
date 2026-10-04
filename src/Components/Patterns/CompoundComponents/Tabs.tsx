import { createContext, use, useId, useState, type KeyboardEvent, type ReactNode } from "react";

/*
 * Compound components: one Tabs made of parts the caller arranges.
 * Root owns the state and shares it through context; each part reads what
 * it needs. Same behaviour as the Phase 2 Tabs, different API.
 */

interface TabsContextValue {
  selected: string;
  select: (value: string) => void;
  baseId: string;
}
const TabsContext = createContext<TabsContextValue | null>(null);

function useTabs(part: string) {
  const context = use(TabsContext);
  // A clear error beats "cannot read properties of null" deep inside.
  if (!context) throw new Error(`<Tabs.${part}> must be inside <Tabs.Root>`);
  return context;
}

interface RootProps {
  children: ReactNode;
  value?: string; // Controlled.
  defaultValue?: string; // Uncontrolled.
  onValueChange?: (value: string) => void;
}

function Root({ children, value, defaultValue = "", onValueChange }: RootProps) {
  const [internal, setInternal] = useState(defaultValue);
  const isControlled = value !== undefined;
  const selected = isControlled ? value : internal;
  const baseId = useId();
  const select = (next: string) => {
    if (!isControlled) setInternal(next);
    onValueChange?.(next);
  };
  return <TabsContext value={{ selected, select, baseId }}>{children}</TabsContext>;
}

function List({ children, label }: { children: ReactNode; label: string }) {
  const { select } = useTabs("List");

  // Arrow keys: find the tabs in the DOM, in the order they're on screen.
  // Parts can be anywhere, wrapped, or conditional, so the list can't know
  // its tabs from its children — the DOM can.
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const tabs = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]:not([disabled])')];
    const index = tabs.indexOf(document.activeElement as HTMLButtonElement);
    if (index < 0) return;
    const next = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: tabs.length - 1 }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    const target = tabs[(next + tabs.length) % tabs.length];
    target.focus();
    select(target.dataset.value!);
  };

  return (
    <div role="tablist" aria-label={label} onKeyDown={onKeyDown} style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--border)" }}>
      {children}
    </div>
  );
}

function Tab({ value, children, disabled }: { value: string; children: ReactNode; disabled?: boolean }) {
  const { selected, select, baseId } = useTabs("Tab");
  const isSelected = selected === value;
  return (
    <button
      type="button"
      role="tab"
      id={`${baseId}-tab-${value}`}
      aria-controls={`${baseId}-panel-${value}`}
      aria-selected={isSelected}
      tabIndex={isSelected ? 0 : -1}
      disabled={disabled}
      data-value={value}
      onClick={() => select(value)}
      style={{
        all: "unset",
        padding: "6px 12px",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1,
        borderBottom: `2px solid ${isSelected ? "currentColor" : "transparent"}`,
        fontWeight: isSelected ? 600 : 400,
      }}
    >
      {children}
    </button>
  );
}

function Panel({ value, children }: { value: string; children: ReactNode }) {
  const { selected, baseId } = useTabs("Panel");
  return (
    <div
      role="tabpanel"
      id={`${baseId}-panel-${value}`}
      aria-labelledby={`${baseId}-tab-${value}`}
      hidden={selected !== value}
      tabIndex={0}
      style={{ padding: "10px 4px" }}
    >
      {children}
    </div>
  );
}

// One export, parts as properties: <Tabs.Root>, <Tabs.List>, …
export const Tabs = { Root, List, Tab, Panel };
