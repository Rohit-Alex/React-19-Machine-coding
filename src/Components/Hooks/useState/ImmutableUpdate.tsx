import { useState } from "react";

interface IForm {
  firstName: string;
  lastName: string;
}

/**
 * Scenario 2: Immutable updates.
 * The "mutate" button mutates `form` in place and calls setForm(form) with
 * the SAME reference — Object.is sees no change, so React skips the
 * re-render and the UI silently doesn't update. The "replace" button
 * spreads into a new object, which does update.
 */
export const ImmutableUpdate = () => {
  const [form, setForm] = useState<IForm>({
    firstName: "Taylor",
    lastName: "Swift",
  });

  const mutateInPlace = () => {
    form.firstName = form.firstName === "Taylor" ? "Robin" : "Taylor";
    setForm(form); // same reference -> Object.is bails out, no re-render
  };

  const replaceImmutably = () => {
    setForm({
      ...form,
      firstName: form.firstName === "Taylor" ? "Robin" : "Taylor",
    });
  };

  return (
    <div className="demo-card">
      <h4>2. Immutable updates</h4>
      <p>
        "Mutate in place" changes the object but keeps its reference —
        nothing re-renders. "Replace immutably" creates a new object and
        works.
      </p>
      <div className="demo-actions">
        <button onClick={mutateInPlace}>mutate in place (no-op)</button>
        <button onClick={replaceImmutably}>replace immutably</button>
      </div>
      <p>
        {form.firstName} {form.lastName}
      </p>
    </div>
  );
};
