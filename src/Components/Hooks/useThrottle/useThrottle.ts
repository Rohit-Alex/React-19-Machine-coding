import { useEffect, useState } from "react";
import { useThrottleCallback } from "./useThrottleCallback";

/*
 * useThrottle — throttle a value
 * Input: A value
 * Output: A throttled version of that value
 */
export function useThrottle<T>(value: T, intervalMs: number): T {
  const [throttled, setThrottled] = useState(value);
  const setThrottledValue = useThrottleCallback(setThrottled, intervalMs);

  useEffect(() => {
    setThrottledValue(value);
  }, [value]);

  return throttled;
}
