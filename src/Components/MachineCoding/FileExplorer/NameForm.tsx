import { useId, useState } from "react";
import { validateName } from "./fileTree";
import type { Entry } from "./fileTree";

interface NameFormProps {
  /** Accessible name for the input, e.g. "New folder name" or "Rename App.tsx". */
  label: string;
  /** Rename: the current name. Create: leave empty. */
  initialName?: string;
  placeholder?: string;
  submitLabel: string;
  /** Names it must not clash with. For rename, leave the item itself out. */
  siblings: Entry[];
  onSubmit: (name: string) => void;
  onCancel: () => void;
}

// One form for create and rename: same checks, same keys (Enter submits,
// Escape cancels).
//
// A controlled input with onSubmit, not a React 19 form action: React resets
// the form after an action runs, which would wipe what the user typed when it
// fails validation.
export const NameForm = ({
  label,
  initialName = "",
  placeholder,
  submitLabel,
  siblings,
  onSubmit,
  onCancel,
}: NameFormProps) => {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string | null>(null);
  const errorId = useId();

  return (
    <form
      className="demo-actions"
      style={{ margin: "2px 0" }}
      onSubmit={(e) => {
        e.preventDefault();
        if (initialName && name.trim() === initialName) return onCancel(); // Unchanged.
        const problem = validateName(name, siblings);
        if (problem) setError(problem);
        else onSubmit(name.trim());
      }}
    >
      <input
        autoFocus
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          setError(null);
        }}
        // Rename selects the name but not the extension, like Finder and
        // Drive: typing replaces "report", keeps ".pdf".
        onFocus={(e) => {
          const dot = e.target.value.lastIndexOf(".");
          e.target.setSelectionRange(0, dot > 0 ? dot : e.target.value.length);
        }}
        onKeyDown={(e) => e.key === "Escape" && onCancel()}
        aria-label={label}
        placeholder={placeholder}
        aria-invalid={error !== null}
        aria-describedby={error ? errorId : undefined}
      />
      <button>{submitLabel}</button>
      <button type="button" onClick={onCancel}>
        Cancel
      </button>
      {error && (
        <span id={errorId} role="alert">
          {error}
        </span>
      )}
    </form>
  );
};
