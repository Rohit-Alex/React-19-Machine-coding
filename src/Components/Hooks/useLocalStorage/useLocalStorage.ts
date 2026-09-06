import { useCallback, useSyncExternalStore } from "react";

type Listener = () => void;

const listeners = new Map<string, Set<Listener>>();
const snapshotCache = new Map<string, { raw: string | null; parsed: unknown }>();

function getListeners(key: string): Set<Listener> {
  let set = listeners.get(key);
  if (!set) {
    set = new Set();
    listeners.set(key, set);
  }
  return set;
}

function notify(key: string): void {
  getListeners(key).forEach((listener) => listener());
}

function readRaw(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

// React compares snapshots with Object.is, so returning a freshly-parsed
// object on every call would look like a change on every render. Cache the
// parsed value per key and only re-parse when the raw string actually moved.
function getSnapshot<T>(key: string, initialValue: T): T {
  const raw = readRaw(key);
  const cached = snapshotCache.get(key);
  if (cached && cached.raw === raw) {
    return cached.parsed as T;
  }

  const parsed = raw !== null ? (JSON.parse(raw) as T) : initialValue;
  snapshotCache.set(key, { raw, parsed });
  return parsed;
}

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, (value: T | ((previous: T) => T)) => void] {
  const subscribe = useCallback(
    (callback: Listener) => {
      getListeners(key).add(callback);

      // Same-tab writes go through setValue/notify below. Other tabs never
      // call notify, but they do fire this native event on every tab but
      // their own, so it covers the case notify() can't.
      const handleStorageEvent = (event: StorageEvent) => {
        if (event.key === key || event.key === null) callback();
      };
      window.addEventListener("storage", handleStorageEvent);

      return () => {
        getListeners(key).delete(callback);
        window.removeEventListener("storage", handleStorageEvent);
      };
    },
    [key],
  );

  const getSnap = useCallback(() => getSnapshot(key, initialValue), [key, initialValue]);

  const storedValue = useSyncExternalStore(subscribe, getSnap);

  const setValue = useCallback(
    (value: T | ((previous: T) => T)) => {
      const previous = getSnapshot(key, initialValue);
      const next = value instanceof Function ? value(previous) : value;
      const raw = JSON.stringify(next);

      try {
        window.localStorage.setItem(key, raw);
      } catch {
        // Storage can fail (quota exceeded, private browsing) — every
        // subscribed instance still updates below.
      }

      snapshotCache.set(key, { raw, parsed: next });
      notify(key);
    },
    [key, initialValue],
  );

  return [storedValue, setValue];
}
