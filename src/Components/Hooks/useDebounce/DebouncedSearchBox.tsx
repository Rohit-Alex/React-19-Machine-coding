import { useState } from "react";
import { useDebounce } from "./useDebounce";

export const DebouncedSearchBox = () => {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 400);

  return (
    <div>
      <h3>Debouncing a search input</h3>
      <p>
        <code>query</code> updates on every keystroke, but{" "}
        <code>useDebounce(query, 400)</code> only commits a new value once
        typing has paused for 400ms. The "search ran" counter below only
        increments off the debounced value, so typing a whole word fires it once
        instead of once per character.
      </p>
      <input
        type="text"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Type to search..."
      />
      <p>Live input: {query || <em>(empty)</em>}</p>
      <p>Debounced (searched for): {debouncedQuery || <em>(empty)</em>}</p>
    </div>
  );
};
