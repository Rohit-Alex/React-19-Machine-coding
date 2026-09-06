import { useState } from "react";

// The "before" version — kept only to demonstrate the issue BuggyPersistedFields
// shows. See useLocalStorage.ts for the useSyncExternalStore-based fix.
export function useLocalStorageWithState<T>(
  key: string,
  initialValue: T,
): [T, (value: T | ((previous: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item !== null ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = (value: T | ((previous: T) => T)) => {
    setStoredValue((previous) => {
      const next = value instanceof Function ? value(previous) : value;
      try {
        window.localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // Storage can fail (quota exceeded, private browsing) — state still updates.
      }
      return next;
    });
  };

  return [storedValue, setValue];
}
