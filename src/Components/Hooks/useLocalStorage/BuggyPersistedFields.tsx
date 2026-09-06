import { useLocalStorageWithState } from "./useLocalStorageWithState";

const Field = ({ label }: { label: string }) => {
  const [name, setName] = useLocalStorageWithState("demo:buggy-name", "");

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

export const BuggyPersistedFields = () => {
  return (
    <div>
      <h3>The issue: a plain useState-backed version</h3>
      <p>
        Both fields below call the same{" "}
        <code>useLocalStorageWithState("demo:buggy-name", "")</code> — the
        original hook, which keeps a private <code>useState</code> per
        instance and only writes to <code>localStorage</code> as a side
        effect. Type in Field A: only Field A updates. Field B still shows
        whatever it read on mount, because nothing ever told it that Field A
        (or another tab) changed the value — reloading the page is the only
        time it re-reads <code>localStorage</code>.
      </p>
      <Field label="Field A" />
      <Field label="Field B" />
    </div>
  );
};
