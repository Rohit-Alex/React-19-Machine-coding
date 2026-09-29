import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { FormControl } from "./createFormControl";
import { useController, useForm, useFormState, useWatch } from "./useForm";

interface SignupValues extends Record<string, unknown> {
  username: string;
  email: string;
  age: number;
  password: string;
  confirmPassword: string;
  plan: string;
  newsletter: boolean;
  frequency: string;
  terms: boolean;
}

const defaultValues: SignupValues = {
  username: "",
  email: "",
  age: NaN,
  password: "",
  confirmPassword: "",
  plan: "",
  newsletter: false,
  frequency: "",
  terms: false,
};

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Counts commits and writes the number straight into the DOM, so showing it
 * doesn't cause renders of its own. Starts at 2 in development because
 * StrictMode mounts every component twice.
 */
function useCommitCounter() {
  const count = useRef(0);
  const el = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    count.current++;
    if (el.current) el.current.textContent = String(count.current);
  });
  return <small style={{ float: "right", opacity: 0.7 }}>renders: <span ref={el}>0</span></small>;
}

const Field = ({ label, error, children }: { label: string; error?: string; children: ReactNode }) => (
  <div style={{ margin: "8px 0" }}>
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {label}
      {children}
    </label>
    {error && (
      <small role="alert" style={{ color: "crimson" }}>
        {error}
      </small>
    )}
  </div>
);

// useWatch: only this box re-renders while the password is typed.
const PasswordStrength = ({ control }: { control: FormControl<SignupValues> }) => {
  const counter = useCommitCounter();
  const password = useWatch({ control, name: "password" });
  const score = [/.{8,}/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((r) => r.test(password)).length;
  return (
    <p aria-live="polite">
      {counter}
      Strength: <strong>{["—", "weak", "fair", "good", "strong"][score]}</strong>
    </p>
  );
};

// useController: a custom (non-input) component, controlled, re-rendering
// only when the plan's value, error or touched state changes.
const PlanPicker = ({ control }: { control: FormControl<SignupValues> }) => {
  const counter = useCommitCounter();
  const { field, fieldState } = useController({ control, name: "plan", rules: { required: "Pick a plan." } });
  return (
    <div style={{ margin: "8px 0" }}>
      {counter}
      <span id="plan-label">Plan</span>
      <div className="demo-actions" role="group"
        aria-labelledby="plan-label"
        // Blur bubbles from each button; only count leaving the whole group.
        onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && field.onBlur()}
      >
        {["Free", "Pro", "Team"].map((plan, i) => (
          <button
            key={plan}
            type="button"
            ref={i === 0 ? field.ref : undefined} // Focused if the plan is missing on submit.
            aria-pressed={field.value === plan}
            onClick={() => field.onChange(plan)}
          >
            {plan}
          </button>
        ))}
      </div>
      {fieldState.error && (
        <small role="alert" style={{ color: "crimson" }}>
          {fieldState.error.message}
        </small>
      )}
    </div>
  );
};

// useFormState: form-wide status, isolated in its own component.
const FormStatus = ({ control }: { control: FormControl<SignupValues> }) => {
  const counter = useCommitCounter();
  const { isDirty, isValid, isSubmitting, submitCount } = useFormState({ control });
  return (
    <p>
      {counter}
      dirty: {String(isDirty)} · valid: {String(isValid)} · submitting: {String(isSubmitting)} · submits:{" "}
      {submitCount}
    </p>
  );
};

export const SignupForm = () => {
  const counter = useCommitCounter();
  const [result, setResult] = useState<SignupValues | null>(null);
  const { control, register, handleSubmit, setValue, reset, watch, formState } = useForm<SignupValues>({
    defaultValues,
    mode: "onTouched",
  });
  // Reading `errors` subscribes this component to errors — and only errors.
  const { errors, isSubmitting } = formState;
  // watch() re-renders the whole form when the box is ticked. Fine here:
  // the form needs to re-render anyway to show or hide the extra field.
  const wantsNewsletter = watch("newsletter");

  return (
    <form
      noValidate // Our rules, our messages; turn off the browser's own bubbles.
      onSubmit={handleSubmit(async (values) => {
        await wait(800); // Pretend to call the server.
        setResult(values);
      })}
    >
      {counter}
      <Field label="Username" error={errors.username?.message}>
        <input
          {...register("username", {
            required: "Pick a username.",
            minLength: 3,
            // Async rule. Type "admin" then quickly "admin2": the slow
            // "taken" answer for "admin" is thrown away when it arrives late.
            validate: async (value) => {
              await wait(value === "admin" ? 900 : 300);
              return !["admin", "root", "test"].includes(String(value)) || "That username is taken.";
            },
          })}
          aria-invalid={Boolean(errors.username)}
          autoComplete="username"
        />
      </Field>
      <Field label="Email" error={errors.email?.message}>
        <input
          type="email"
          {...register("email", {
            required: "Email is required.",
            pattern: { value: /^\S+@\S+\.\S+$/, message: "That doesn't look like an email." },
          })}
          aria-invalid={Boolean(errors.email)}
          autoComplete="email"
        />
      </Field>
      <Field label="Age" error={errors.age?.message}>
        <input
          type="number"
          {...register("age", { valueAsNumber: true, min: { value: 18, message: "You must be 18 or over." }, max: 120 })}
          aria-invalid={Boolean(errors.age)}
        />
      </Field>
      <Field label="Password" error={errors.password?.message}>
        <input
          type="password"
          {...register("password", { required: "Choose a password.", minLength: 8, deps: ["confirmPassword"] })}
          aria-invalid={Boolean(errors.password)}
          autoComplete="new-password"
        />
      </Field>
      <PasswordStrength control={control} />
      <Field label="Confirm password" error={errors.confirmPassword?.message}>
        <input
          type="password"
          {...register("confirmPassword", {
            required: "Type the password again.",
            validate: (value, values) => value === values.password || "Passwords don't match.",
          })}
          aria-invalid={Boolean(errors.confirmPassword)}
          autoComplete="new-password"
        />
      </Field>
      <PlanPicker control={control} />
      <label style={{ display: "block", margin: "8px 0" }}>
        <input type="checkbox" {...register("newsletter")} /> Send me the newsletter
      </label>
      {wantsNewsletter && (
        // Hidden again → unmounted → no longer validated, so it can't block submit.
        <Field label="How often?" error={errors.frequency?.message}>
          <select {...register("frequency", { required: "Choose how often." })} aria-invalid={Boolean(errors.frequency)}>
            <option value="">Choose…</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </Field>
      )}
      <Field label="Terms" error={errors.terms?.message}>
        <span>
          <input type="checkbox" {...register("terms", { required: "You need to accept the terms." })} /> I accept
          the terms
        </span>
      </Field>

      <FormStatus control={control} />

      <div className="demo-actions">
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Submitting…" : "Sign up"}
        </button>
        <button
          type="button"
          onClick={() => {
            const sample: Partial<SignupValues> = {
              username: "sam_dev",
              email: "sam@example.com",
              age: 29,
              password: "Str0ng!pass",
              confirmPassword: "Str0ng!pass",
              plan: "Pro",
              terms: true,
            };
            for (const [name, value] of Object.entries(sample)) {
              setValue(name, value as SignupValues[keyof SignupValues], { shouldValidate: true });
            }
          }}
        >
          Fill sample data
        </button>
        <button
          type="button"
          onClick={() => {
            reset();
            setResult(null);
          }}
        >
          Reset
        </button>
      </div>
      {result && <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(result, null, 2)}</pre>}
    </form>
  );
};
