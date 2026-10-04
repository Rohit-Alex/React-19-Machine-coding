import { useCallback, useEffect, useRef, useState } from "react";

/**
 * One hook for a component that can be controlled (`value` given) or
 * uncontrolled (`defaultValue` given). Returns [value, setValue] either way;
 * the component never needs to know which mode it's in.
 */
export function useControllableState<T>(value: T | undefined, defaultValue: T, onChange?: (value: T) => void) {
  const [internal, setInternal] = useState(defaultValue);
  const isControlled = value !== undefined; // Not truthiness: false, 0 and "" are real values.
  const current = isControlled ? value : internal;

  // Switching modes mid-life is a bug in the caller (usually value going
  // from undefined to something). React warns about the same for <input>.
  const wasControlled = useRef(isControlled);
  useEffect(() => {
    if (import.meta.env.DEV && wasControlled.current !== isControlled) {
      console.error(`A component changed from ${wasControlled.current ? "controlled" : "uncontrolled"} to ${isControlled ? "controlled" : "uncontrolled"}. Pick one for its whole life.`);
    }
    wasControlled.current = isControlled;
  }, [isControlled]);

  const setValue = useCallback(
    (next: T) => {
      if (!isControlled) setInternal(next);
      onChange?.(next); // Controlled: this is only a request. The parent decides.
    },
    [isControlled, onChange],
  );

  return [current, setValue] as const;
}
