export type FieldValues = Record<string, unknown>;

export interface FieldError {
  type: string;
  message: string;
}

type WithMessage<V> = V | { value: V; message: string };

type ValidateResult = boolean | string | undefined;

/** Same shape as React Hook Form's rules, minus the rarely used ones. */
export interface Rules<T extends FieldValues = FieldValues> {
  /** `true`, or the message to show. */
  required?: boolean | string;
  pattern?: WithMessage<RegExp>;
  minLength?: WithMessage<number>;
  maxLength?: WithMessage<number>;
  min?: WithMessage<number>;
  max?: WithMessage<number>;
  /** Return `true` if fine, or an error message. Can be async (e.g. "is this username free?"). */
  validate?: (value: unknown, values: T) => ValidateResult | Promise<ValidateResult>;
  /** Read `<input type="number">` as a number instead of a string. */
  valueAsNumber?: boolean;
  /**
   * Fields to re-check when this one changes. "Confirm password" depends on
   * "password": change the password and the old match result is stale.
   */
  deps?: string[];
}

const unpack = <V>(rule: WithMessage<V>, fallback: string) =>
  typeof rule === "object" && rule !== null && "value" in rule
    ? rule
    : { value: rule as V, message: fallback };

// "Nothing entered". An unticked checkbox counts; the number 0 doesn't.
const isEmpty = (v: unknown) =>
  v === undefined ||
  v === null ||
  v === "" ||
  v === false ||
  (typeof v === "number" && Number.isNaN(v)) ||
  (Array.isArray(v) && v.length === 0);

/**
 * Checks one value against its rules, in a fixed order, and returns the first
 * problem found. Always async, because `validate` may be.
 */
export async function validateValue<T extends FieldValues>(
  value: unknown,
  rules: Rules<T>,
  values: T,
): Promise<FieldError | undefined> {
  if (isEmpty(value)) {
    if (!rules.required) return undefined; // Optional and empty: nothing else to check.
    return {
      type: "required",
      message: typeof rules.required === "string" ? rules.required : "This field is required.",
    };
  }

  const text = String(value);

  if (rules.pattern) {
    const { value: regex, message } = unpack(rules.pattern, "Invalid format.");
    // A regex with the `g` flag remembers where it stopped (lastIndex), so
    // testing it twice can give different answers. Reset it first.
    regex.lastIndex = 0;
    if (!regex.test(text)) return { type: "pattern", message };
  }
  if (rules.minLength !== undefined) {
    const { value: n, message } = unpack(rules.minLength, `Use at least ${String(rules.minLength)} characters.`);
    if (text.length < n) return { type: "minLength", message };
  }
  if (rules.maxLength !== undefined) {
    const { value: n, message } = unpack(rules.maxLength, `Use at most ${String(rules.maxLength)} characters.`);
    if (text.length > n) return { type: "maxLength", message };
  }
  if (rules.min !== undefined) {
    const { value: n, message } = unpack(rules.min, `Must be at least ${String(rules.min)}.`);
    if (Number(value) < n) return { type: "min", message };
  }
  if (rules.max !== undefined) {
    const { value: n, message } = unpack(rules.max, `Must be at most ${String(rules.max)}.`);
    if (Number(value) > n) return { type: "max", message };
  }
  if (rules.validate) {
    const result = await rules.validate(value, values);
    if (typeof result === "string") return { type: "validate", message: result };
    if (result === false) return { type: "validate", message: "Invalid value." };
  }
  return undefined;
}
