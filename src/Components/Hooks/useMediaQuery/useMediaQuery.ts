import { useCallback, useSyncExternalStore } from "react";

/**
 * `true` while the CSS media query matches, e.g. `"(max-width: 600px)"` or
 * `"(prefers-color-scheme: dark)"`. Re-renders only when the answer flips,
 * not on every resize.
 *
 * `serverValue` is what SSR (and the first hydration pass) renders, because
 * the server has no screen to ask.
 */
export function useMediaQuery(query: string, serverValue = false): boolean {
  // useSyncExternalStore re-subscribes whenever `subscribe` is a new function.
  // Inline, that would be every render; useCallback makes it once per query.
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    [query],
  );

  return useSyncExternalStore(
    subscribe,
    // Returns a boolean, so React's Object.is check sees "no change" between
    // renders. Returning the MediaQueryList itself would also be stable, but
    // its `.matches` would then change without React noticing.
    () => window.matchMedia(query).matches,
    () => serverValue,
  );
}
