# Multi-step form / wizard with validation

> **The prompt:** "Build a sign-up wizard: details → account type → plan →
> review. Validate each step before moving on, and let the user go back."
>
> The steps are easy. The marks are for where the data lives, how validation
> is split per step, steps that appear conditionally, and what focus does
> when the screen changes under the user.

Runnable demo: [`index.tsx`](./index.tsx) · component:
[`MultiStepForm.tsx`](./MultiStepForm.tsx)

---

## 1. Clarify before you code

| Question | Why it changes your code |
| --- | --- |
| Can users jump to any step, or only forward one at a time? | Free jumping means validating every step on submit, not only the current one. |
| Do some steps depend on earlier answers? | Steps become a function of the data (section 3). |
| Should progress survive a reload? | Persist the data object to `sessionStorage` (section 7). |
| Validate on Next only, or as you type? | On Next, plus clearing a field's error once it's edited, is the calm default. |
| Server-side checks (email taken)? | An async step validation with a pending state on Next. |

---

## 2. One data object, owned by the wizard

```ts
const [data, setData] = useState<Data>(INITIAL);   // every field of every step
```

Each step only **renders** part of `data` and calls `update(name, value)`. Going
Back and forward never loses anything, because no step owns state.

The common first draft gives each step its own `useState`. Then the step
unmounts on Next and its values are gone; Back shows empty fields. Fixes like
"pass values up on Next" grow into two copies of the same data.

Analogy: a paper form on a clipboard. Each page of the wizard is a window
onto the same sheet of paper. Turning the page doesn't erase what you wrote.

### Validation lives with the step

```ts
{ id: "details", title: "Your details",
  validate: (data) => { …returns { name?: "…", email?: "…" } } }
```

Each step declares which fields it checks. Next runs only the current step's
`validate`. Submit runs **all** visible steps — the user may have jumped back
via "Edit" and changed something — and if one fails, jumps to that step and
focuses the bad field.

---

## 3. Conditional steps: store the id, not the index

```ts
const steps = STEPS.filter((step) => !step.when || step.when(data));
const index = steps.findIndex((step) => step.id === currentId);
```

"Company" only exists for business accounts. Steps are **derived** from the
data on every render, never stored.

If you store `stepIndex = 2`, then any change to the list before that point
moves you to a different step without you doing anything. Storing the
**id** keeps you on the same step whatever appears or disappears around it.

Same idea as keying an accordion by id rather than position (see
[Accordion](../Accordion/Accordion.md#2-one-state-shape-for-both-modes)).

**Data from hidden steps.** Switch to business, fill "Company", switch back to
personal: `data.company` is still set. Before sending, drop fields that belong
to hidden steps, or the server receives a company for a personal account.

---

## 4. One `<form>`, Enter means Next

The whole wizard is a single `<form onSubmit>`. Pressing Enter in a field
submits the form, and the handler decides: **Next** on every step but the
last, **Create account** on the last. With a form per step or `onClick`-only
buttons, Enter either does nothing or submits half the data.

- **Back is `type="button"`** — a plain `<button>` inside a form is a submit
  button by default, so Back would run validation.
- **`noValidate`** turns off the browser's own bubbles so our messages and
  focus handling are the only ones.
- **Double submit**: ignore submits while `status === "submitting"` and
  disable the button.

---

## 5. Focus and accessibility

- **On step change, focus the new step's heading** (`tabIndex={-1}`). The
  button you pressed may no longer exist; without this, focus falls to
  `<body>` and a screen reader announces nothing. Skip it on first render so
  the page doesn't jump on load.
- **On a failed Next, focus the first invalid field.** Its error is linked
  with `aria-describedby` and `aria-invalid`, so it's read out on focus.
- **Progress as an `<ol>`** with `aria-current="step"` on the current one,
  plus "Step 2 of 5" in the heading.
- **"Edit" buttons on the review page get unique labels** (`aria-label="Edit
  Plan"`), or a screen reader lists five identical "Edit" buttons.
- **Never define a field component inside the wizard.** A component declared
  inside another is a brand-new type every render, so React remounts the
  input on each keystroke and focus is lost. `TextField` sits at the top
  level.

---

## 6. Pitfalls

1. **State per step** — Back shows empty fields.
2. **Step index in state** with conditional steps — you silently land on the
   wrong step.
3. **Validating only the current step on submit** — edits made via "Edit"
   jumps skip validation.
4. **Back as a submit button** — it validates before letting you go back.
5. **Errors that never clear** — editing the field should clear its error,
   not wait for the next Next.
6. **Sending hidden-step data** (section 3).

---

## 7. Follow-ups to expect

| They ask | Short answer |
| --- | --- |
| "Survive a reload." | Store `data` and `currentId` in `sessionStorage` (same idea as this repo's `useLocalStorage` hook, with session storage so it ends with the tab). Never store passwords or card numbers there. Clear it on submit. |
| "URL per step, Back button works." | Step id in the URL (`?step=plan`). Browser Back then goes to the previous step. Guard direct links to a later step: send them to the first invalid step. |
| "Use a schema library." | One Zod schema per step (`detailsSchema.safeParse(data)`), and the full schema merged on submit. |
| "Use a form library." | React Hook Form: one `useForm` for all steps, `trigger(["name", "email"])` on Next. The [FormLibrary](../FormLibrary/FormLibrary.md) build in this repo has the same idea. |
| "Async validation (email already taken)." | Make `validate` async; show "Checking…" on Next and ignore the result if the user has already moved on. |
| "Warn before leaving with unsaved data." | `beforeunload` listener while `data` differs from `INITIAL` and isn't submitted yet. |

---

## 8. Scoring notes

- **Mid:** steps switched with an index, state per step or a big object
  without per-step validation, Back loses data or validates.
- **Senior:** one data object, validation declared per step, all steps
  rechecked on submit, conditional steps derived from data and tracked by id,
  one form with Enter = Next, focus moved on step change and to the first
  error, and drops data from hidden steps.
