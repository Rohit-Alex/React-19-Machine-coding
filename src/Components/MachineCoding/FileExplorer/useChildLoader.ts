import { useRef, useState } from "react";
import { fetchChildren } from "./api";
import type { Entry } from "./fileTree";

export type LoadStatus = "loading" | "error";

/**
 * Fetches one folder's contents and hands them to `onLoaded`. Both versions
 * use this; they only differ in how they store the result.
 */
export function useChildLoader(onLoaded: (folderId: string, entries: Entry[]) => void) {
  // A ref, not state: a double click (or StrictMode running the mount effect
  // twice) calls `load` twice before React re-renders, so both calls would
  // still see the old state and fetch twice.
  const inFlight = useRef(new Set<string>());
  const [status, setStatus] = useState<Record<string, LoadStatus>>({});

  const load = (folderId: string) => {
    if (inFlight.current.has(folderId)) return;
    inFlight.current.add(folderId);
    setStatus((s) => ({ ...s, [folderId]: "loading" }));

    fetchChildren(folderId)
      .then(
        (entries) => {
          onLoaded(folderId, entries);
          setStatus((s) => {
            const next = { ...s };
            delete next[folderId];
            return next;
          });
        },
        () => setStatus((s) => ({ ...s, [folderId]: "error" })),
      )
      .finally(() => inFlight.current.delete(folderId));
  };

  return { status, load };
}
