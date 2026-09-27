import { useCallback, useId, useRef, useState } from "react";
import { useDebounce } from "../../Hooks/useDebounce/useDebounce";
import { useSearch } from "../DebouncedSearch/useSearch";
import type { SearchResult } from "../DebouncedSearch/searchApi";
import { useCombobox } from "./useCombobox";

export const Typeahead = () => {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<SearchResult | null>(null);

  const debouncedQuery = useDebounce(query, 300);
  const { status, results } = useSearch(debouncedQuery);

  const rootRef = useRef<HTMLDivElement>(null);
  const inputId = useId();

  const handleSelect = useCallback((item: SearchResult) => {
    setSelected(item);
    setQuery(item.name);
  }, []);

  const handleClear = useCallback(() => {
    setQuery("");
    setSelected(null);
  }, []);

  const {
    isOpen,
    activeIndex,
    listboxId,
    open,
    close,
    optionId,
    onKeyDown,
    setActiveIndex,
  } = useCombobox({
    items: results,
    onSelect: handleSelect,
    onClear: handleClear,
  });

  const toggleListView = (show: boolean) => {
    return show ? open : close;
  };

  const hasResults = results.length > 0;
  const isSettled = isOpen && status === "success";
  const showEmpty = isSettled && !hasResults;

  return (
    <div className="demo-card">
      <h4>Typeahead with full keyboard support</h4>
      <p>
        Type, then drive it entirely from the keyboard: arrows to move, Enter to
        pick, Escape to close, Escape again to clear. Focus never leaves the
        input.
      </p>

      <div ref={rootRef} style={{ position: "relative", maxWidth: 360 }}>
        <label htmlFor={inputId}>Pick a library</label>
        <input
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-autocomplete="none"
          aria-activedescendant={
            activeIndex >= 0 ? optionId(activeIndex) : undefined
          }
          autoComplete="off"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setSelected(null);
          }}
          onKeyDown={onKeyDown}
          onFocus={toggleListView(true)}
          onBlur={toggleListView(false)}
          placeholder="react, vite, state..."
          style={{ width: "100%", boxSizing: "border-box" }}
        />

        {isOpen && (
          <ul
            id={listboxId}
            role="listbox"
            aria-label="Suggestions"
            style={{
              position: "absolute",
              zIndex: 1,
              left: 0,
              right: 0,
              margin: "4px 0 0",
              padding: 0,
              listStyle: "none",
              maxHeight: 180,
              overflowY: "auto",
              border: "1px solid rgba(128,128,128,0.4)",
              borderRadius: 6,
              background: "var(--bg, Canvas)",
            }}
          >
            {results.map((item, index) => (
              <li
                key={item.id}
                id={optionId(index)}
                role="option"
                aria-selected={index === activeIndex}
                // Stops the input losing focus before the click lands.
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => {
                  handleSelect(item);
                  close();
                }}
                onPointerEnter={() => setActiveIndex(index)}
                style={{
                  padding: "6px 10px",
                  cursor: "pointer",
                  background:
                    index === activeIndex
                      ? "rgba(128,128,128,0.25)"
                      : "transparent",
                }}
              >
                {item.name} <small>({item.category})</small>
              </li>
            ))}
            {showEmpty && (
              <li
                style={{
                  padding: "6px 10px",
                  opacity: 0.7,
                }}
              >
                No matches
              </li>
            )}
          </ul>
        )}
      </div>

      <p aria-live="polite">
        {status === "loading" && <>Searching...</>}
        {status === "success" &&
          isOpen &&
          `${results.length} suggestion${results.length === 1 ? "" : "s"}`}
      </p>
      <p>
        Selected: <strong>{selected ? selected.name : "nothing yet"}</strong>
      </p>
    </div>
  );
};
