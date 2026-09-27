import { useEffect, useMemo, useRef } from "react";

type RafThrottled<Args extends unknown[]> = ((...args: Args) => void) & {
  cancel: () => void;
};

/*
 * useRafThrottle — coalesce a burst of calls down to one per animation frame.
 *
 * Same shape as useThrottleCallback, but the clock is the browser's paint
 * schedule instead of a fixed millisecond interval. Use this when the callback
 * ends in something visible; use a time-based throttle when it ends in a
 * network request.
 */
export function useRafThrottle<Args extends unknown[]>(
  callback: (...args: Args) => void,
): RafThrottled<Args> {
  const callbackRef = useRef(callback);

  // Always point at the latest callback, so the memoised wrapper below never
  // calls a stale closure.
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const throttled = useMemo(() => {
    let frameId: number | null = null;
    let latestArgs: Args | null = null;

    const run = () => {
      frameId = null;
      const args = latestArgs;
      latestArgs = null;
      if (args) callbackRef.current(...args);
    };

    const fn = (...args: Args) => {
      // Keep the newest arguments; the frame that eventually runs should see
      // the latest scroll position, not the one that happened to schedule it.
      latestArgs = args;
      if (frameId !== null) return;
      frameId = requestAnimationFrame(run);
    };

    fn.cancel = () => {
      if (frameId !== null) cancelAnimationFrame(frameId);
      frameId = null;
      latestArgs = null;
    };

    return fn as RafThrottled<Args>;
  }, []);

  useEffect(() => () => throttled.cancel(), [throttled]);

  return throttled;
}
