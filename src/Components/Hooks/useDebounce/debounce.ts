export type DebounceOptions = {
  leading?: boolean;
  trailing?: boolean;
};

type DebouncedFn<Args extends unknown[]> = ((...args: Args) => void) & {
  cancel: () => void;
};

export function debounce<Args extends unknown[]>(
  cb: (...args: Args) => void,
  delay: number,
  { leading = false, trailing = true }: DebounceOptions = {},
): DebouncedFn<Args> {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  function debounced(this: unknown, ...args: Args) {
    // in JS it's equivalent to function debounced(...args) { ... },
    // this is a special TypeScript-only parameter.
    // It exists only for type checking and is erased when compiled to JavaScript.
    if (!leading && !trailing) return;

    const context = this;
    const shouldCallLeading = leading && !timeout;

    if (timeout) clearTimeout(timeout);

    if (shouldCallLeading) {
      cb.apply(context, args);
    }

    timeout = setTimeout(() => {
      if (trailing && !shouldCallLeading) {
        cb.apply(context, args);
      }
      timeout = null;
    }, delay);
  }

  debounced.cancel = () => {
    if (timeout) clearTimeout(timeout);
    timeout = null;
  };

  return debounced as DebouncedFn<Args>;
}
