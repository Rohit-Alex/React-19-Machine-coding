import { useSyncExternalStore } from "react";

interface WindowSize {
  width: number;
  height: number;
}

// Shared across every instance, so there is only one resize listener and
// only one snapshot object — every component reading it sees the exact same
// reference at the exact same time, which rules out tearing by construction.
let cachedSize: WindowSize = {
  width: window.innerWidth,
  height: window.innerHeight,
};

function subscribe(callback: () => void): () => void {
  const handleResize = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    if (width !== cachedSize.width || height !== cachedSize.height) {
      // New reference only when the size actually changed, so React's
      // Object.is comparison in useSyncExternalStore doesn't see a "change"
      // (and re-render) on every call.
      cachedSize = { width, height };
    }
    callback();
  };

  window.addEventListener("resize", handleResize);
  return () => window.removeEventListener("resize", handleResize);
}

function getSnapshot(): WindowSize {
  return cachedSize;
}

export function useWindowSize(): WindowSize {
  return useSyncExternalStore(subscribe, getSnapshot);
}
