import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createFormControl } from "./createFormControl";
import type { Change, FormControl, FormOptions, FormState, FormStateKey } from "./createFormControl";
import type { FieldError, FieldValues, Rules } from "./validation";

const stateKeys: FormStateKey[] = [
  "errors", "isDirty", "dirtyFields", "touchedFields", "isSubmitting",
  "isSubmitted", "isSubmitSuccessful", "submitCount", "isValid",
];

/**
 * Re-render when `isRelevant(change)` says so. A version number is the
 * snapshot: it only moves when this component cares, so every other change
 * in the form costs one function call and no render.
 */
function useFormSubscription<T extends FieldValues>(
  control: FormControl<T>,
  isRelevant: (change: Change) => boolean,
) {
  const version = useRef(0);
  const relevant = useRef(isRelevant);
  useEffect(() => {
    relevant.current = isRelevant;
  });
  const subscribe = useCallback(
    (onStoreChange: () => void) =>
      control.subscribe((change) => {
        if (relevant.current(change)) {
          version.current++;
          onStoreChange();
        }
      }),
    [control],
  );
  useSyncExternalStore(subscribe, () => version.current);
}

/**
 * formState with a trap on every key: reading `errors` during render
 * subscribes this component to `errors`, and nothing else. A form that never
 * reads `isDirty` never re-renders when it changes.
 */
function useTrackedFormState<T extends FieldValues>(control: FormControl<T>, extraRelevant?: (c: Change) => boolean) {
  const readKeys = useRef(new Set<FormStateKey>());

  useFormSubscription(control, (change) =>
    change.kind === "state"
      ? change.keys.some((k) => readKeys.current.has(k))
      : (extraRelevant?.(change) ?? false),
  );

  // isValid needs a full validation after every change. Only start paying
  // for it once some component has actually read it.
  useEffect(() => {
    if (readKeys.current.has("isValid")) control.startTrackingIsValid();
  });

  const state = control.getState();
  const tracked = {} as FormState;
  for (const key of stateKeys) {
    Object.defineProperty(tracked, key, {
      enumerable: true,
      get() {
        readKeys.current.add(key);
        return state[key];
      },
    });
  }
  return tracked;
}

export function useForm<T extends FieldValues>(options: FormOptions<T>) {
  // Created once. Lazy init so it isn't rebuilt (and thrown away) each render.
  const [control] = useState(() => createFormControl(options));
  const watched = useRef<Set<string> | "all">(new Set());

  const formState = useTrackedFormState(control, (change) => {
    const w = watched.current;
    return change.kind === "value" && (w === "all" || change.name === undefined || w.has(change.name));
  });

  /**
   * Like getValues, but also subscribes: the component that calls watch()
   * re-renders when that field changes. Here that's the whole form — use
   * useWatch in a child to keep it small.
   */
  function watch(): T;
  function watch<K extends keyof T & string>(name: K): T[K];
  function watch(name?: string) {
    const w = watched.current;
    if (name === undefined) watched.current = "all";
    else if (w !== "all") w.add(name);
    const values = control.getValues();
    return name === undefined ? values : values[name];
  }

  return {
    control,
    register: control.register,
    handleSubmit: control.handleSubmit,
    setValue: control.setValue,
    getValues: control.getValues,
    reset: control.reset,
    trigger: control.trigger,
    watch,
    formState,
  };
}

/** formState, subscribed from a child so only the child re-renders. */
export const useFormState = <T extends FieldValues>({ control }: { control: FormControl<T> }) =>
  useTrackedFormState(control);

/** One field's value, re-rendering only this component when it changes. */
export function useWatch<T extends FieldValues, K extends keyof T & string>({
  control,
  name,
}: {
  control: FormControl<T>;
  name: K;
}): T[K] {
  useFormSubscription(control, (c) => c.kind === "value" && (c.name === undefined || c.name === name));
  return control.getValues()[name];
}

/**
 * For inputs that aren't native (custom pickers, UI-library components):
 * they get value / onChange / onBlur props like a controlled input, and
 * re-render only when *their* field's value, error or touched state changes.
 */
export function useController<T extends FieldValues, K extends keyof T & string>({
  control,
  name,
  rules,
}: {
  control: FormControl<T>;
  name: K;
  rules?: Rules<T>;
}) {
  // Same handler object every render; rules are refreshed each call, like register.
  const handlers = control.registerControlled(name, rules as Rules);
  useEffect(() => {
    control.setMounted(name, true);
    return () => control.setMounted(name, false);
  }, [control, name]);

  const lastSeen = useRef<{ error?: FieldError; touched?: true; dirty?: true }>({});
  useFormSubscription(control, (c) => {
    if (c.kind === "value") return c.name === undefined || c.name === name;
    const s = control.getState();
    const now = { error: s.errors[name], touched: s.touchedFields[name], dirty: s.dirtyFields[name] };
    const before = lastSeen.current;
    lastSeen.current = now;
    return now.error !== before.error || now.touched !== before.touched || now.dirty !== before.dirty;
  });

  const s = control.getState();
  return {
    field: { name, value: control.getValues()[name], ...handlers },
    fieldState: {
      error: s.errors[name],
      isTouched: Boolean(s.touchedFields[name]),
      isDirty: Boolean(s.dirtyFields[name]),
    },
  };
}
