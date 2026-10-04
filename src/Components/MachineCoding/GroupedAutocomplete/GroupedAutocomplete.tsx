import { useCallback, useId, useMemo, useState } from "react";
import { CATALOG, type SearchResult } from "../DebouncedSearch/searchApi";
import { useCombobox } from "../Typeahead/useCombobox";

/** Wraps the first match of `query` in <mark>. */
const Highlight = ({ text, query }: { text: string; query: string }) => {
  const start = query ? text.toLowerCase().indexOf(query.toLowerCase()) : -1;
  if (start < 0) return <>{text}</>;
  const end = start + query.length;
  return (
    <>
      {text.slice(0, start)}
      <mark>{text.slice(start, end)}</mark>
      {text.slice(end)}
    </>
  );
};

export const GroupedAutocomplete = () => {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<SearchResult | null>(null);
  const inputId = useId();
  const q = query.trim();

  // Groups are for drawing; the flat list is for the keyboard. Arrow keys walk
  // `flat` straight through every group, skipping the headers for free —
  // headers aren't in it.
  const { groups, flat } = useMemo(() => {
    const needle = q.toLowerCase();
    const matches = CATALOG.filter(
      // Matching the group name too: "state" shows the whole State group.
      (item) => item.name.toLowerCase().includes(needle) || item.category.toLowerCase().includes(needle),
    );
    // Map.groupBy does this, but it's ES2024 and this project targets ES2023.
    const byCategory = new Map<string, SearchResult[]>();
    for (const item of matches) byCategory.set(item.category, [...(byCategory.get(item.category) ?? []), item]);
    const groups = [...byCategory].sort(([a], [b]) => a.localeCompare(b));
    // Build `flat` from the sorted groups, so index 0 is the first option on screen.
    return { groups, flat: groups.flatMap(([, items]) => items) };
  }, [q]);

  const handleSelect = useCallback((item: SearchResult) => {
    setSelected(item);
    setQuery(item.name);
  }, []);

  const { isOpen, activeIndex, listboxId, open, close, optionId, onKeyDown, setActiveIndex } = useCombobox({
    items: flat,
    onSelect: handleSelect,
    onClear: () => {
      setQuery("");
      setSelected(null);
    },
  });

  let flatIndex = 0; // Running position across groups while rendering.

  return (
    <div style={{ position: "relative", maxWidth: 360 }}>
      <label htmlFor={inputId}>Find a library</label>
      <input
        id={inputId}
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={isOpen && activeIndex >= 0 ? optionId(activeIndex) : undefined}
        autoComplete="off"
        value={query}
        placeholder="react, state, testing…"
        onChange={(event) => {
          setQuery(event.target.value);
          setSelected(null);
          open();
        }}
        onFocus={open}
        onBlur={close}
        onKeyDown={onKeyDown}
        style={{ width: "100%", boxSizing: "border-box" }}
      />

      {isOpen && flat.length > 0 && (
        <div
          id={listboxId}
          role="listbox"
          aria-label="Libraries"
          style={{
            position: "absolute",
            zIndex: 1,
            left: 0,
            right: 0,
            marginTop: 4,
            maxHeight: 260,
            overflowY: "auto",
            border: "1px solid var(--border)",
            borderRadius: 6,
            background: "var(--bg)",
          }}
        >
          {groups.map(([category, items], groupIndex) => {
            const headerId = `${listboxId}-group-${groupIndex}`;
            return (
              // role="group" + a label: screen readers say "State, group"
              // when the highlight moves into a new group.
              <div key={category} role="group" aria-labelledby={headerId}>
                <div
                  id={headerId}
                  role="presentation"
                  style={{
                    position: "sticky", // Stays in view while scrolling its group.
                    top: 0,
                    padding: "4px 10px",
                    fontSize: 12,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    background: "var(--code-bg)",
                  }}
                >
                  <Highlight text={category} query={q} />
                </div>
                {items.map((item) => {
                  const index = flatIndex++;
                  return (
                    <div
                      key={item.id}
                      id={optionId(index)}
                      role="option"
                      aria-selected={index === activeIndex}
                      onPointerDown={(event) => event.preventDefault()}
                      onClick={() => {
                        handleSelect(item);
                        close();
                      }}
                      onPointerEnter={() => setActiveIndex(index)}
                      style={{
                        padding: "6px 10px 6px 18px",
                        cursor: "pointer",
                        background: index === activeIndex ? "rgba(128,128,128,0.25)" : "transparent",
                      }}
                    >
                      <Highlight text={item.name} query={q} />
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      <p aria-live="polite">
        {isOpen &&
          q &&
          (flat.length === 0
            ? `No matches for “${q}”`
            : `${flat.length} result${flat.length === 1 ? "" : "s"} in ${groups.length} group${groups.length === 1 ? "" : "s"}`)}
      </p>
      <p>
        Selected:{" "}
        <strong>{selected ? `${selected.name} (${selected.category})` : "nothing yet"}</strong>
      </p>
    </div>
  );
};
