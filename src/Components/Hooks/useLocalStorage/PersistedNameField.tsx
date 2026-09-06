import { useLocalStorage } from "./useLocalStorage";

export const PersistedNameField = () => {
  const [name, setName] = useLocalStorage("demo:name", "");

  return (
    <div>
      <h3>Persisting a field across reloads</h3>
      <p>
        <code>useLocalStorage("demo:name", "")</code> reads the initial value
        from <code>localStorage</code> on mount and writes back to it on
        every change. Type something, then reload the page — the value
        survives because it was never only in memory.
      </p>
      <input
        type="text"
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Type your name"
      />
      <p>Stored value: {name === "" ? "(empty)" : name}</p>
      <button type="button" onClick={() => setName("")}>
        Clear
      </button>
    </div>
  );
};
