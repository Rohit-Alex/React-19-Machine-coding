import { useCallback, useState } from "react";
import { useDebounceCallback } from "./useDebouncedCallback";

export const DebouncedSaveButton = () => {
  const [clickCount, setClickCount] = useState(0);
  const [saveCount, setSaveCount] = useState(0);

  const handleSave = useCallback(() => {
    setSaveCount((c) => c + 1);
  }, []);

  const save = useDebounceCallback(handleSave, 1000, {
    leading: false,
    trailing: true,
  });

  const handleClick = () => {
    setClickCount((count) => count + 1);
    save();
  };

  return (
    <div>
      <h3>Debouncing a callback (leading only)</h3>
      <p>
        This is the other half of debouncing: instead of debouncing a{" "}
        <em>value</em>, <code>useDebounceCallback</code> debounces the{" "}
        <em>callback itself</em>. With{" "}
        <code>leading: true, trailing: false</code>, the first click runs{" "}
        <code>save()</code> immediately, then every click within 1000ms is
        ignored — the standard guard against a double-submitted "Save".
      </p>
      <button onClick={handleClick}>Save</button>
      <p>Clicks: {clickCount}</p>
      <p>Saves actually run: {saveCount}</p>
    </div>
  );
};
