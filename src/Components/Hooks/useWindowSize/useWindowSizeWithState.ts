import { useEffect, useState } from "react";

interface WindowSize {
  width: number;
  height: number;
}

function getWindowSize(): WindowSize {
  return { width: window.innerWidth, height: window.innerHeight };
}

// The "before" version — kept only to compare against useWindowSize.ts.
// Every instance keeps its own useState and its own resize listener, each
// independently reading window.innerWidth/innerHeight. They still converge
// to the right value in practice, but under concurrent rendering a render
// can be interrupted between the state update and the next paint, so two
// parts of the tree can briefly observe different snapshots (tearing) —
// the exact failure mode useSyncExternalStore is designed to rule out.
export function useWindowSizeWithState(): WindowSize {
  const [size, setSize] = useState<WindowSize>(getWindowSize);

  useEffect(() => {
    const handleResize = () => setSize(getWindowSize());
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return size;
}
