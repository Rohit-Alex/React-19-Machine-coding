import { validateValue } from "./validation";
import type { FieldError, FieldValues, Rules } from "./validation";

export type Mode = "onSubmit" | "onBlur" | "onChange" | "onTouched" | "all";

export interface FormOptions<T extends FieldValues> {
  defaultValues: T;
  /** When to validate before the first submit. */
  mode?: Mode;
  /** When to re-validate after a submit. */
  reValidateMode?: "onChange" | "onBlur" | "onSubmit";
}

export type Errors = Partial<Record<string, FieldError>>;

export interface FormState {
  errors: Errors;
  isDirty: boolean;
  dirtyFields: Partial<Record<string, true>>;
  touchedFields: Partial<Record<string, true>>;
  isSubmitting: boolean;
  isSubmitted: boolean;
  isSubmitSuccessful: boolean;
  submitCount: number;
  isValid: boolean;
}

export type FormStateKey = keyof FormState;

/** What changed, so each subscriber can decide whether it cares. */
export type Change =
  | { kind: "value"; name?: string } // no name = every value (reset)
  | { kind: "state"; keys: FormStateKey[] };

type FieldElement = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

interface FieldEntry {
  rules: Rules;
  /** Uncontrolled fields: the DOM element that holds the value. */
  el?: FieldElement;
  /** Controlled fields: anything we can focus when it has an error. */
  focusTarget?: { focus(): void } | null;
  controlled: boolean;
  /**
   * On screen right now. Only mounted fields are validated: a field hidden
   * by a condition keeps its value but must not block the submit.
   */
  mounted: boolean;
  props?: RegisterProps;
  controlledProps?: ControlledProps;
}

export interface ControlledProps {
  onChange: (value: unknown) => void;
  onBlur: () => void;
  ref: (target: { focus(): void } | null) => void;
}

export interface RegisterProps {
  name: string;
  ref: (el: FieldElement | null) => void;
  onChange: (e: { target: FieldElement }) => void;
  onBlur: () => void;
}

const initialState = (): FormState => ({
  errors: {},
  isDirty: false,
  dirtyFields: {},
  touchedFields: {},
  isSubmitting: false,
  isSubmitted: false,
  isSubmitSuccessful: false,
  submitCount: 0,
  isValid: false,
});

function readFromDom(el: FieldElement, rules: Rules): unknown {
  if (el instanceof HTMLInputElement && el.type === "checkbox") return el.checked;
  if (rules.valueAsNumber) return el.value === "" ? NaN : Number(el.value);
  return el.value;
}

function writeToDom(el: FieldElement, value: unknown) {
  if (el instanceof HTMLInputElement && el.type === "checkbox") el.checked = Boolean(value);
  else el.value = value == null || Number.isNaN(value) ? "" : String(value);
}

/**
 * The form's brain, with no React in it. Values live here and in the DOM
 * inputs, not in React state, so typing doesn't re-render anything by
 * itself. React components subscribe to the parts they show.
 */
export function createFormControl<T extends FieldValues>(options: FormOptions<T>) {
  let defaults: T = { ...options.defaultValues };
  let values: T = { ...defaults };
  let state = initialState();
  // Insertion order = render order, which decides which error gets focus.
  const fields = new Map<string, FieldEntry>();
  const listeners = new Set<(change: Change) => void>();

  // Each validation gets a ticket number. A slow async check only writes its
  // result if no newer check for that field started meanwhile — otherwise
  // "username taken" for an old value could land after the answer for the new one.
  const tickets = new Map<string, number>();
  let resetCount = 0; // A reset makes every in-flight check stale.

  let trackIsValid = false; // isValid costs a full validation per change; only pay when someone reads it.
  let isValidTicket = 0;

  const emit = (change: Change) => listeners.forEach((l) => l(change));

  function setState(patch: Partial<FormState>) {
    const keys = (Object.keys(patch) as FormStateKey[]).filter((k) => !Object.is(state[k], patch[k]));
    if (keys.length === 0) return;
    state = { ...state, ...patch };
    emit({ kind: "state", keys });
  }

  function setError(name: string, error: FieldError | undefined) {
    const current = state.errors[name];
    if (current?.type === error?.type && current?.message === error?.message) return; // Same error: keep the object, no re-render.
    const errors = { ...state.errors };
    if (error) errors[name] = error;
    else delete errors[name];
    setState({ errors });
  }

  const entry = (name: string) => {
    let e = fields.get(name);
    if (!e) fields.set(name, (e = { rules: {}, controlled: false, mounted: false }));
    return e;
  };

  const mountedFields = () => [...fields].filter(([, f]) => f.mounted);

  async function validateField(name: string) {
    const ticket = (tickets.get(name) ?? 0) + 1;
    tickets.set(name, ticket);
    const startedAt = resetCount;
    const error = await validateValue(values[name], entry(name).rules, values);
    if (tickets.get(name) !== ticket || startedAt !== resetCount) return undefined; // Stale: a newer check owns this field.
    setError(name, error);
    return error;
  }

  async function refreshIsValid() {
    if (!trackIsValid) return;
    const ticket = ++isValidTicket;
    const results = await Promise.all(
      mountedFields().map(([name, f]) => validateValue(values[name], f.rules, values)),
    );
    if (ticket === isValidTicket) setState({ isValid: results.every((r) => !r) });
  }

  function shouldValidate(name: string, event: "change" | "blur") {
    if (state.isSubmitted) {
      const re = options.reValidateMode ?? "onChange";
      return re === (event === "change" ? "onChange" : "onBlur");
    }
    switch (options.mode ?? "onSubmit") {
      case "onChange": return event === "change";
      case "onBlur": return event === "blur";
      case "all": return true;
      // First on blur; after that, on every change.
      case "onTouched": return event === "blur" || Boolean(state.touchedFields[name]);
      case "onSubmit": return false;
    }
  }

  function setFieldValue(name: string, value: unknown) {
    values = { ...values, [name]: value }; // New object, so getValues() snapshots never change under you.
    const dirtyFields = { ...state.dirtyFields };
    if (Object.is(value, defaults[name])) delete dirtyFields[name];
    else dirtyFields[name] = true;
    emit({ kind: "value", name });
    setState({ dirtyFields, isDirty: Object.keys(dirtyFields).length > 0 });
  }

  function markTouched(name: string) {
    if (!state.touchedFields[name]) setState({ touchedFields: { ...state.touchedFields, [name]: true } });
  }

  function handleChange(name: string, value: unknown) {
    setFieldValue(name, value);
    if (shouldValidate(name, "change")) void validateField(name);
    // Only re-check dependents the user has already been shown feedback on,
    // so typing a password doesn't flag an untouched "confirm" box.
    for (const dep of entry(name).rules.deps ?? []) {
      if (state.touchedFields[dep] || state.isSubmitted) void validateField(dep);
    }
    void refreshIsValid();
  }

  function handleBlur(name: string) {
    markTouched(name);
    if (shouldValidate(name, "blur")) void validateField(name);
  }

  async function validateAll() {
    const names = mountedFields().map(([name]) => name);
    await Promise.all(names.map(validateField));
    // Hidden fields' old errors don't count.
    return Object.fromEntries(names.filter((n) => state.errors[n]).map((n) => [n, state.errors[n]])) as Errors;
  }

  return {
    /** Spread onto a native input: `<input {...register("email", rules)} />`. */
    register(name: keyof T & string, rules: Rules<T> = {}): RegisterProps {
      const e = entry(name);
      e.rules = rules as Rules; // Updated every render, so rules can depend on props.
      // Same props object every render: a stable ref callback means React
      // only calls it on mount and unmount, not on every render.
      e.props ??= {
        name,
        ref: (el) => {
          e.el = el ?? undefined;
          e.mounted = el !== null;
          if (el) writeToDom(el, values[name]); // Show the current value when the input mounts.
        },
        onChange: (event) => handleChange(name, readFromDom(event.target, e.rules)),
        onBlur: () => handleBlur(name),
      };
      return e.props;
    },

    /** Used by useController: the component owns rendering, we own the value. */
    registerControlled(name: string, rules: Rules = {}): ControlledProps {
      const e = entry(name);
      e.rules = rules;
      e.controlled = true;
      e.controlledProps ??= {
        onChange: (value) => handleChange(name, value),
        onBlur: () => handleBlur(name),
        ref: (target) => {
          e.focusTarget = target;
        },
      };
      return e.controlledProps;
    },

    /** Controlled fields have no DOM ref we manage, so useController reports mount/unmount. */
    setMounted(name: string, mounted: boolean) {
      entry(name).mounted = mounted;
      void refreshIsValid();
    },

    handleSubmit(
      onValid: (values: T) => unknown,
      onInvalid?: (errors: Errors) => unknown,
    ) {
      return async (event?: { preventDefault(): void }) => {
        event?.preventDefault();
        setState({ isSubmitting: true });
        let success = false;
        try {
          const errors = await validateAll();
          if (Object.keys(errors).length === 0) {
            await onValid(values);
            success = true;
          } else {
            // Focus the first broken field, in the order they appear on screen.
            const first = mountedFields().find(([name]) => errors[name])?.[1];
            (first?.el ?? first?.focusTarget)?.focus();
            await onInvalid?.(errors);
          }
        } finally {
          // Runs even if onValid throws, so the button never stays stuck on "Submitting…".
          setState({
            isSubmitting: false,
            isSubmitted: true,
            isSubmitSuccessful: success,
            submitCount: state.submitCount + 1,
          });
        }
      };
    },

    setValue(
      name: keyof T & string,
      value: T[keyof T],
      opts: { shouldValidate?: boolean; shouldTouch?: boolean } = {},
    ) {
      setFieldValue(name, value);
      const el = fields.get(name)?.el;
      if (el) writeToDom(el, value); // Uncontrolled: the DOM holds the value, so update it too.
      if (opts.shouldTouch) markTouched(name);
      if (opts.shouldValidate) void validateField(name);
      void refreshIsValid();
    },

    /** Reads without subscribing: never causes a re-render. */
    getValues: () => values,

    reset(nextDefaults?: T) {
      if (nextDefaults) defaults = { ...nextDefaults };
      values = { ...defaults };
      resetCount++;
      for (const [name, f] of fields) if (f.el) writeToDom(f.el, values[name]);
      const fresh = initialState();
      emit({ kind: "value" });
      setState({ ...fresh, isValid: state.isValid });
      void refreshIsValid();
    },

    trigger: (name?: keyof T & string) => (name ? validateField(name) : validateAll()),

    subscribe(listener: (change: Change) => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getState: () => state,
    startTrackingIsValid() {
      if (trackIsValid) return;
      trackIsValid = true;
      void refreshIsValid();
    },
  };
}

export type FormControl<T extends FieldValues> = ReturnType<typeof createFormControl<T>>;
