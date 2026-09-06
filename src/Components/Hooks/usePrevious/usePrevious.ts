import { useEffect, useRef } from "react";

/*
 * usePrevious — get the previous value of a prop or state
 * Input: A value
 * Output: The previous value of that value
 * Example: const prevCount = usePrevious(count);
 *
 * Internal Working:
 * 1. We create a ref using useRef, which will hold the previous value.
 * 2. In a useEffect hook, we update the ref's current value to the latest value after each render.
 * 3. The ref's current value is returned, which represents the previous value during the next render.
 */

export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

/*
const previous = usePrevious(0);
Inside the hook:
  value = 0
  ref.current = undefined
The hook returns:
  return ref.current; // returns undefined

So the UI shows:
  current: 0, previous: undefined

After React commits this render, useEffect runs:
  ref.current = value; // ref.current is now 0
  
Now the ref has been updated, but no re-render happens.
State becomes: ref.current = 0
The component is not rendered again, so this new value is not returned yet.

On the next render, if the value changes to 1:
  value = 1
  ref.current = 0 (from the previous render)
The hook returns:
  return ref.current; // returns 0

So the UI shows:
  current: 1, previous: 0

After React commits this render, useEffect runs again:
  ref.current = value; // ref.current is now 1
Now the ref has been updated again, but no re-render happens.
State becomes: ref.current = 1
The component is not rendered again, so this new value is not returned yet.
*/
