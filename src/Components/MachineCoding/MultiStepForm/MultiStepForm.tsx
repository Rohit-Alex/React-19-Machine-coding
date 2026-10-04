import { useEffect, useId, useRef, useState, type FormEvent } from "react";

interface Data {
  name: string;
  email: string;
  accountType: "personal" | "business";
  company: string;
  plan: "free" | "pro";
}
type Errors = Partial<Record<keyof Data, string>>;

interface Step {
  id: string;
  title: string;
  /** Returns errors for this step's fields, in the order the fields appear. */
  validate: (data: Data) => Errors;
  /** Optional steps: shown only when this returns true. */
  when?: (data: Data) => boolean;
}

const EMAIL = /^\S+@\S+\.\S+$/;

const STEPS: Step[] = [
  {
    id: "details",
    title: "Your details",
    validate: (data) => {
      const errors: Errors = {};
      if (!data.name.trim()) errors.name = "Enter your name.";
      if (!EMAIL.test(data.email)) errors.email = "Enter an email like name@example.com.";
      return errors;
    },
  },
  { id: "type", title: "Account type", validate: () => ({}) },
  {
    id: "company",
    title: "Company",
    when: (data) => data.accountType === "business",
    validate: (data) => (data.company.trim() ? {} : { company: "Enter your company name." }),
  },
  { id: "plan", title: "Plan", validate: () => ({}) },
  { id: "review", title: "Review", validate: () => ({}) },
];

const INITIAL: Data = { name: "", email: "", accountType: "personal", company: "", plan: "free" };
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const MultiStepForm = () => {
  // All steps share one object, owned here. Steps only render it, so going
  // Back never loses what was typed.
  const [data, setData] = useState(INITIAL);
  const [errors, setErrors] = useState<Errors>({});
  // The current step's id, not its index: steps appear and disappear
  // ("Company" only for business), and an index would then point elsewhere.
  const [currentId, setCurrentId] = useState(STEPS[0].id);
  const [status, setStatus] = useState<"editing" | "submitting" | "done">("editing");

  const steps = STEPS.filter((step) => !step.when || step.when(data));
  const index = Math.max(0, steps.findIndex((step) => step.id === currentId));
  const step = steps[index];
  const isLast = index === steps.length - 1;

  const formRef = useRef<HTMLFormElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const movedStep = useRef(false);

  // After a step change, put focus on the new heading. Otherwise focus is on
  // a button that no longer exists, and a screen reader hears nothing.
  // Skipped on first render so the page doesn't jump here on load.
  useEffect(() => {
    if (!movedStep.current) return;
    headingRef.current?.focus();
  }, [currentId]);

  const goTo = (id: string) => {
    movedStep.current = true;
    setErrors({});
    setCurrentId(id);
  };

  const update = <K extends keyof Data>(name: K, value: Data[K]) => {
    setData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined })); // Fixing a field clears its error.
  };

  // Returns false and focuses the first bad field if the step has errors.
  const checkStep = (target: Step) => {
    const stepErrors = target.validate(data);
    const firstInvalid = Object.keys(stepErrors)[0];
    if (!firstInvalid) return true;
    if (target.id !== step.id) goTo(target.id); // Found while submitting: go back to it.
    setErrors(stepErrors);
    // Wait a frame in case we just switched step and the field isn't there yet.
    requestAnimationFrame(() => {
      (formRef.current?.elements.namedItem(firstInvalid) as HTMLElement | null)?.focus();
    });
    return false;
  };

  // One <form> for the whole wizard: pressing Enter in a field means "Next",
  // and only means "Submit" on the last step.
  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (status !== "editing") return; // No double submit.
    if (!isLast) {
      if (checkStep(step)) goTo(steps[index + 1].id);
      return;
    }
    // Check every step again before sending: a value may have changed since.
    if (!steps.every(checkStep)) return;
    setStatus("submitting");
    await wait(800); // Pretend to send.
    setStatus("done");
  };

  if (status === "done") {
    return (
      <div role="status">
        <p>
          ✅ Account created for <strong>{data.name}</strong>.
        </p>
        <button
          onClick={() => {
            setData(INITIAL);
            setCurrentId(STEPS[0].id);
            setStatus("editing");
          }}
        >
          Start again
        </button>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate>
      <ol aria-label="Progress" style={{ display: "flex", flexWrap: "wrap", gap: 12, listStyle: "none", padding: 0 }}>
        {steps.map((s, i) => (
          <li
            key={s.id}
            aria-current={s.id === step.id ? "step" : undefined}
            style={{ fontWeight: s.id === step.id ? 700 : 400, opacity: i > index ? 0.5 : 1 }}
          >
            {i + 1}. {s.title}
          </li>
        ))}
      </ol>

      <h3 ref={headingRef} tabIndex={-1} style={{ outline: "none" }}>
        Step {index + 1} of {steps.length}: {step.title}
      </h3>

      {step.id === "details" && (
        <>
          <TextField label="Name" name="name" value={data.name} error={errors.name} onChange={(v) => update("name", v)} />
          <TextField label="Email" name="email" type="email" value={data.email} error={errors.email} onChange={(v) => update("email", v)} />
        </>
      )}

      {step.id === "type" && (
        <fieldset>
          <legend>Who is this account for?</legend>
          {(["personal", "business"] as const).map((type) => (
            <label key={type} style={{ display: "block" }}>
              <input
                type="radio"
                name="accountType"
                checked={data.accountType === type}
                onChange={() => update("accountType", type)}
              />{" "}
              {type === "personal" ? "Just me" : "A business (adds a Company step)"}
            </label>
          ))}
        </fieldset>
      )}

      {step.id === "company" && (
        <TextField label="Company name" name="company" value={data.company} error={errors.company} onChange={(v) => update("company", v)} />
      )}

      {step.id === "plan" && (
        <label>
          Plan{" "}
          <select value={data.plan} onChange={(event) => update("plan", event.target.value as Data["plan"])}>
            <option value="free">Free</option>
            <option value="pro">Pro — ₹499/month</option>
          </select>
        </label>
      )}

      {step.id === "review" && (
        <dl>
          {steps
            .filter((s) => s.id !== "review")
            .map((s) => (
              <div key={s.id} style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                <dt style={{ fontWeight: 600 }}>{s.title}:</dt>
                <dd style={{ margin: 0 }}>
                  {s.id === "details" && `${data.name} · ${data.email}`}
                  {s.id === "type" && data.accountType}
                  {s.id === "company" && data.company}
                  {s.id === "plan" && data.plan}{" "}
                  <button type="button" onClick={() => goTo(s.id)} aria-label={`Edit ${s.title}`}>
                    Edit
                  </button>
                </dd>
              </div>
            ))}
        </dl>
      )}

      <div className="demo-actions" style={{ marginTop: 16 }}>
        <button type="button" onClick={() => goTo(steps[index - 1].id)} disabled={index === 0}>
          Back
        </button>
        <button type="submit" disabled={status === "submitting"}>
          {!isLast ? "Next" : status === "submitting" ? "Creating…" : "Create account"}
        </button>
      </div>
    </form>
  );
};

// Top-level, never defined inside the form: a component declared inside
// another is a new type every render, so the input remounts and loses focus
// on each keystroke.
const TextField = ({
  label,
  name,
  value,
  error,
  onChange,
  type = "text",
}: {
  label: string;
  name: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
  type?: string;
}) => {
  const id = useId();
  return (
    <div style={{ marginBottom: 12 }}>
      <label htmlFor={id} style={{ display: "block" }}>
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error && (
        <p id={`${id}-error`} style={{ color: "#c4321c", margin: "4px 0 0" }}>
          {error}
        </p>
      )}
    </div>
  );
};
