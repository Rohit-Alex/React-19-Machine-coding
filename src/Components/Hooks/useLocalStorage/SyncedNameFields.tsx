import { useLocalStorage } from "./useLocalStorage";

const Field = ({ label }: { label: string }) => {
  const [name, setName] = useLocalStorage("demo:synced-name", "");

  return (
    <div>
      <label>
        {label}:{" "}
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Type here"
        />
      </label>
    </div>
  );
};

export const SyncedNameFields = () => {
  return (
    <div>
      <h3>The fix: useSyncExternalStore</h3>
      <p>
        Same setup as above, but both fields now call{" "}
        <code>useLocalStorage("demo:synced-name", "")</code> — the{" "}
        <code>useSyncExternalStore</code>-based hook. Every instance
        subscribes to the same store instead of owning its own{" "}
        <code>useState</code>, so typing in either field updates both
        immediately. Opening this page in a second tab and typing there
        updates these fields too, via the native <code>storage</code> event.
      </p>
      <Field label="Field A" />
      <Field label="Field B" />
    </div>
  );
};
