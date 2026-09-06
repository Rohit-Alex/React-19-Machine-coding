import { useEffect, useMemo, useRef } from "react";
import { debounce, type DebounceOptions } from "./debounce";

/*
 *useDebounceCallback — debounce a callback
 *Input: A function
 *Output: A debounced version of that function
 */

export function useDebounceCallback<Args extends unknown[]>(
  callback: (...args: Args) => void,
  delay: number,
  options: DebounceOptions = {},
) {
  const callbackRef = useRef(callback);

  // Always point to the latest callback
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const debounced = useMemo(() => {
    const fn = debounce<Args>(
      (...args) => callbackRef.current(...args),
      delay,
      options,
    );

    return fn;
  }, [delay, options.leading, options.trailing]);

  // Cancel pending timeout on unmount
  useEffect(() => {
    return () => debounced.cancel();
  }, [debounced]);

  return debounced;
}

/*

*Common Questions*

1. Why do we need to use `useRef` to store the callback?

  *Answer:* 
  This is a common pattern in React hooks to avoid stale closures. 
  The `debounced` function is created only once (using `useMemo`), so if it directly captures `callback`, it will keep calling the version from the first render. 
  By using a ref, we can always point to the latest version of the callback, ensuring that when the debounced function executes, it calls the most recent callback.


2. Why are we passing callbackRef as wrapper i.e. (...args) => callbackRef.current(...args),
   instead of just passing callbackRef.current directly to debounce?

   *Answer:* 
   
   *callbackRef passed directly to debounce*
   const throttled = useMemo(() => {
      return throttle(callbackRef.current, interval, options);
    }, [interval]);

    When useMemo runs for the first time, callbackRef.current is evaluated immediately and its current value is passed to throttle.
    
    const callback0 = callbackRef.current;
    const throttled = throttle(callback0, 500);

    Later, when the component re-renders:
    
    callbackRef.current = callback5;

    but throttle still holds callback0. It never reads the ref again, so it calls the stale callback.

    *For Wrapper case i.e. (...args) => callbackRef.current(...args)

    Here, throttle receives a wrapper function, not the callback itself.

    When the throttled function finally executes, it runs:
    (...args) => callbackRef.current(...args)

    At that moment, it reads callbackRef.current, which has already been updated by the useEffect.
*/
