import { useEffect, useState } from "react";
import { useDebounceCallback } from "./useDebouncedCallback";

/*
 * useDebounce — debounce a value
 * Input: A value
 * Output: A debounced version of that value
 */
export function useDebounce<T>(value: T, delayMs: number): T {
  const [debouncedVal, setDebouncedVal] = useState(value);
  const setDebouncedValue = useDebounceCallback(setDebouncedVal, delayMs);

  useEffect(() => {
    setDebouncedValue(value);
  }, [value]);

  return debouncedVal;
}
