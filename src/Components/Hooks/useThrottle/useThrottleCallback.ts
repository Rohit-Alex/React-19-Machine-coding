import { useEffect, useMemo, useRef } from "react";
import { throttle, type ThrottleOptions } from "./throttle";

/*
 *useThrottleCallback — throttle a callback
 *Input: A function
 *Output: A throttled version of that function
 */

export function useThrottleCallback<Args extends unknown[]>(
  callback: (...args: Args) => void,
  interval: number,
  options: ThrottleOptions = {},
) {
  const callbackRef = useRef(callback);

  // Always point to the latest callback
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const throttled = useMemo(() => {
    const fn = throttle<Args>(
      (...args) => callbackRef.current(...args),
      interval,
      options,
    );

    return fn;
  }, [interval, options.leading, options.trailing]);

  // Cancel pending trailing call on unmount
  useEffect(() => {
    return () => throttled.cancel();
  }, [throttled]);

  return throttled;
}
