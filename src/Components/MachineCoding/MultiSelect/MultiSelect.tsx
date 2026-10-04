import { useId, useMemo, useState } from "react";
import { CATALOG, type SearchResult } from "../DebouncedSearch/searchApi";
import { useCombobox } from "../Typeahead/useCombobox";

export const MultiSelect = () => {
  const [query, setQuery] = useState("");
  // Ids in the order they were picked, so the chips keep that order.
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [announcement, setAnnouncement] = useState("");
  const inputId = useId();

  // Memoised: useCombobox resets the highlight whenever `items` changes, so
  // a new array on every render would wipe it on every keystroke.
  const options = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? CATALOG.filter((item) => item.name.toLowerCase().includes(q)) : CATALOG;
  }, [query]);

  const selected = selectedIds.map((id) => CATALOG.find((item) => item.id === id)!);

  const toggle = (item: SearchResult) => {
    const isSelected = selectedIds.includes(item.id);
    const nextCount = selectedIds.length + (isSelected ? -1 : 1);
    setSelectedIds((prev) => (isSelected ? prev.filter((id) => id !== item.id) : [...prev, item.id]));
    setAnnouncement(`${item.name} ${isSelected ? "removed" : "added"}. ${nextCount} selected.`);
  };

  const { isOpen, activeIndex, listboxId, open, close, optionId, onKeyDown, setActiveIndex } = useCombobox({
    items: options,
    onSelect: toggle,
    onClear: () => setQuery(""),
    closeOnSelect: false, // Picking several in a row is the point.
  });

  return (
    <div style={{ maxWidth: 420 }}>
      <label htmlFor={inputId}>Tech stack</label>
      <div
        style={{
          position: "relative",
          display: "flex",
          flexWrap: "wrap",
          gap: 4,
          padding: 4,
          border: "1px solid var(--border)",
          borderRadius: 6,
          background: "var(--bg)",
        }}
      >
        {/* Chips are a list of real buttons: Tab reaches each, Enter removes it. */}
        {selected.length > 0 && (
          <ul aria-label="Selected" style={{ display: "flex", flexWrap: "wrap", gap: 4, margin: 0, padding: 0, listStyle: "none" }}>
            {selected.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  aria-label={`Remove ${item.name}`}
                  onClick={() => toggle(item)}
                  style={{ borderRadius: 12, padding: "2px 8px", border: "1px solid var(--border)", cursor: "pointer" }}
                >
                  {item.name} <span aria-hidden="true">✕</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <input
          id={inputId}
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={isOpen && activeIndex >= 0 ? optionId(activeIndex) : undefined}
          autoComplete="off"
          value={query}
          placeholder={selected.length ? "" : "Search…"}
          onChange={(event) => {
            setQuery(event.target.value);
            open();
          }}
          onFocus={open}
          onBlur={close}
          onKeyDown={(event) => {
            // Backspace in an empty box removes the last chip, like an email "To" field.
            if (event.key === "Backspace" && query === "" && selected.length > 0) {
              toggle(selected[selected.length - 1]);
              return;
            }
            onKeyDown(event);
          }}
          style={{ flex: 1, minWidth: 100, border: 0, outline: "none", background: "transparent", font: "inherit", padding: 4 }}
        />

        {isOpen && (
          <ul
            id={listboxId}
            role="listbox"
            aria-label="Tech options"
            aria-multiselectable="true"
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              zIndex: 1,
              margin: "4px 0 0",
              padding: 0,
              listStyle: "none",
              maxHeight: 220,
              overflowY: "auto",
              border: "1px solid var(--border)",
              borderRadius: 6,
              background: "var(--bg)",
            }}
          >
            {options.map((item, index) => {
              const isSelected = selectedIds.includes(item.id);
              return (
                <li
                  key={item.id}
                  id={optionId(index)}
                  role="option"
                  // In a multi-select, aria-selected means "picked", not
                  // "highlighted". The highlight is aria-activedescendant.
                  aria-selected={isSelected}
                  onPointerDown={(event) => event.preventDefault()} // Keep focus in the input.
                  onClick={() => toggle(item)}
                  onPointerEnter={() => setActiveIndex(index)}
                  style={{
                    display: "flex",
                    gap: 8,
                    padding: "6px 10px",
                    cursor: "pointer",
                    background: index === activeIndex ? "rgba(128,128,128,0.25)" : "transparent",
                  }}
                >
                  <span aria-hidden="true" style={{ width: 16 }}>
                    {isSelected ? "✓" : ""}
                  </span>
                  {item.name}
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {isOpen && options.length === 0 && <p>No matches for “{query}”.</p>}

      <div className="demo-actions">
        <button type="button" onClick={() => setSelectedIds([])} disabled={selected.length === 0}>
          Clear all
        </button>
      </div>
      <p aria-live="polite" className="visually-hidden">
        {announcement}
      </p>
      <p>
        Selected ({selected.length}): {selected.map((item) => item.name).join(", ") || "none"}
      </p>
    </div>
  );
};
