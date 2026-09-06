/*
  *Simple Throttle with leading and trailing true

  const throttle = (cb, delay = 10) => {
    let isWaiting = false;
    let waitingArgs = null;
    let waitingThis = null;

    const timeoutFunc = () => {
      if (waitingArgs) {
        cb.apply(waitingThis, waitingArgs);

        waitingArgs = null;
        waitingThis = null;

        setTimeout(timeoutFunc, delay);
      } else {
        isWaiting = false;
      }
    };

    return function (...args) {
      if (isWaiting) {
        waitingArgs = args;
        waitingThis = this;
        return;
      }

      cb.apply(this, args);

      isWaiting = true;
      setTimeout(timeoutFunc, delay);
    };
  };
*/

// Throttle with leading and trailing options
export type ThrottleOptions = {
  leading?: boolean;
  trailing?: boolean;
};

type ThrottledFn<Args extends unknown[]> = ((...args: Args) => void) & {
  cancel: () => void;
};

export function throttle<Args extends unknown[]>(
  cb: (...args: Args) => void,
  delay: number,
  { leading = true, trailing = true }: ThrottleOptions = {},
): ThrottledFn<Args> {
  let isWaiting = false;
  let waitingArgs: Args | null = null;
  let waitingThis: unknown = null;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const timeoutFunc = () => {
    timeoutId = null;

    if (trailing && waitingArgs) {
      cb.apply(waitingThis, waitingArgs);

      waitingArgs = null;
      waitingThis = null;

      timeoutId = setTimeout(timeoutFunc, delay);
    } else {
      isWaiting = false;
    }
  };

  function throttled(this: unknown, ...args: Args) {
    if (!leading && !trailing) return;

    if (isWaiting) {
      waitingArgs = args;
      waitingThis = this;
      return;
    }

    isWaiting = true;

    if (leading) {
      cb.apply(this, args);
    } else if (trailing) {
      // Queue the first call instead of executing immediately
      waitingArgs = args;
      waitingThis = this;
    }

    timeoutId = setTimeout(timeoutFunc, delay);
  }

  throttled.cancel = () => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = null;
    isWaiting = false;
    waitingArgs = null;
    waitingThis = null;
  };

  return throttled as ThrottledFn<Args>;
}
