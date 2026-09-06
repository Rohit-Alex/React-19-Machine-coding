import "../hook-demo.css";
import { PersistedNameField } from "./PersistedNameField";
import { BuggyPersistedFields } from "./BuggyPersistedFields";
import { SyncedNameFields } from "./SyncedNameFields";

export const UseLocalStorageDemo = () => {
  return (
    <section>
      <h2>useLocalStorage</h2>
      <p>
        A custom hook (not part of the React API) that behaves like{" "}
        <code>useState</code>, but reads its initial value from{" "}
        <code>localStorage</code> and writes every update back to it, so
        state survives page reloads.
      </p>
      <PersistedNameField />
      <BuggyPersistedFields />
      <SyncedNameFields />
    </section>
  );
};
