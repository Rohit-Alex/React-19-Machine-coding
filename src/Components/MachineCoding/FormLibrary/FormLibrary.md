# Design a form library like Formik / React Hook Form (LLD)

> **The prompt:** "Design a lightweight form library similar to React Hook
> Form: `useForm()` returning `register`, `handleSubmit`, `setValue`,
> `getValues`, `watch`, `reset`, `formState`. Support validation, errors,
> controlled components, and minimal re-renders."
>
> Building a form is easy. Building the thing that builds forms tests API
> design, where state should live, subscriptions, async validation races, and
> how React decides to re-render. That's why it's a senior LLD question.

Runnable demo: [`SignupForm.tsx`](./SignupForm.tsx) · the library:
[`createFormControl.ts`](./createFormControl.ts) (the store, no React) ·
[`useForm.ts`](./useForm.ts) (the hooks) ·
[`validation.ts`](./validation.ts) (the rules)

---

## 1. Clarify before you design

| Question | Why it changes the design |
| --- | --- |
| Is re-render performance a hard requirement? | Decides where values live: React state (simple, re-renders a lot) or outside React (section 3). |
| Native inputs only, or custom components too (date pickers, UI kits)? | Custom ones need a controlled API: `useController` (section 8). |
| Built-in rules, a schema (Zod/Yup), or both? | Rules first; a schema plugs in as one function later (section 12). |
| Async validation ("username taken")? | Needs protection against slow, stale answers (section 6). |
| Nested values (`address.city`) and lists (`items[3].qty`)? | Path-based get/set and field arrays. Big scope — agree to leave out (section 12). |
| When should errors appear — on submit, on blur, as you type? | The validation `mode` option (section 6). |

Agreed scope for the build: flat field names; native inputs plus a
controlled API; built-in rules plus custom (async) `validate`; all five
modes; `watch` / `useWatch`, `formState` / `useFormState`, `useController`.

---

## 2. The API

| API | Does | Re-renders? |
| --- | --- | --- |
| `register(name, rules)` | Returns `{ name, ref, onChange, onBlur }` to spread on a native input. | Never by itself. |
| `handleSubmit(onValid, onInvalid?)` | Returns the submit handler: prevent default, validate all, call one of the two, focus the first error. | Only components reading `isSubmitting`, `errors`, etc. |
| `formState` | `errors`, `isDirty`, `dirtyFields`, `touchedFields`, `isSubmitting`, `isSubmitted`, `isSubmitSuccessful`, `submitCount`, `isValid`. | Only for the keys you **read**. |
| `watch(name?)` | Current value, **and** subscribes the calling component. | The `useForm` component, when that field changes. |
| `getValues()` | Current values. | Never — it's a read, not a subscription. |
| `setValue(name, value, opts)` | Change a value from code (also updates the DOM input). Options: `shouldValidate`, `shouldTouch`. | Only subscribers to that field. |
| `reset(values?)` | Back to defaults (or new defaults); clears errors, dirty, touched, submit count. | Subscribers to what changed. |
| `trigger(name?)` | Validate now. | Error subscribers. |
| `useWatch({ control, name })` | Like `watch`, but only this child re-renders. | Only this component. |
| `useFormState({ control })` | Like `formState`, but only this child re-renders. | Only this component. |
| `useController({ control, name, rules })` | `{ field: { value, onChange, onBlur, ref }, fieldState }` for custom components. | Only when this field's value, error, touched or dirty changes. |

Two design rules run through the whole table: **reading is free, subscribing
is explicit**, and **every re-render is opt-in.**

---

## 3. The big decision: where do the values live?

**Formik's way — values in React state.** Every keystroke updates state at
the top of the form, so the whole form re-renders and every field re-renders
with it. (Formik offers `FastField` to limit this.) Easy to reason about;
slow for big forms.

**React Hook Form's way — values outside React.** Inputs are *uncontrolled*:
the browser's input element holds what the user typed, and the library keeps
a copy in a plain object. React state is only used for what the screen shows
*about* the form: errors, dirty flags, submitting. Typing a character runs
the library's `onChange`, updates the plain object, and re-renders
**nothing** unless someone asked to be told.

That's what the demo's counters show: type into Username and no counter
moves.

The analogy: a shop with a live sales board in the window. Formik repaints
the whole board every time anyone buys anything. React Hook Form keeps the
till in the back room and only changes the board when something shown on it
actually changes — "sold out", not every single sale.

---

## 4. Architecture: a store with no React, plus thin hooks

```
createFormControl(options)          ← plain JS, testable without React
  values        { name: value }       the copy of what's in the inputs
  defaults      for dirty checks and reset
  fields        Map name → { rules, el, mounted, cached props }
  state         errors, dirty, touched, submit flags
  listeners     Set of (change) => void

  register / registerControlled / setValue / getValues
  handleSubmit / reset / trigger / subscribe / getState

useForm(options)                    ← React glue
  const [control] = useState(() => createFormControl(options))
  formState  = a "tracked" view: reading a key subscribes to it
  watch      = getValues + subscribe
useWatch / useFormState / useController   ← same subscription, smaller scope
```

Why split it: the form logic (validation, dirty tracking, submit flow) has
nothing to do with React. Keeping it in a plain object means it can be
tested with plain assertions, and React's job shrinks to "re-render these
components when this changes".

`useState(() => createFormControl(options))` — lazy initial state — creates
the store **once**. `useRef(createFormControl(options))` would also keep one,
but it would call `createFormControl` on every render and throw the result
away.

---

## 5. `register`: wiring a native input

```ts
<input {...register("email", { required: true, pattern: /@/ })} />
```

Returns `{ name, ref, onChange, onBlur }`:

- **`ref`** gets the DOM element when the input mounts. The library writes the
  current value into it (`el.value = values.email`) — that's how
  `defaultValues` show up without the input being controlled. On unmount,
  React calls it with `null`, and the field is marked as not mounted.
- **`onChange`** reads the value from the element (checkbox → `checked`;
  `valueAsNumber` → a number), updates the store, updates dirty flags, maybe
  validates.
- **`onBlur`** marks the field touched, maybe validates.

**The returned object is cached per field** and the same object comes back
every render. That matters: a new `ref` function each render makes React
call the old one with `null` and the new one with the element on *every*
render — the field would unmount and remount itself constantly. Stable props
also let `memo` skip inputs. The rules, though, are updated on every
`register` call, so rules can depend on props.

---

## 6. Validation

### Rules and their order

`required`, `pattern`, `minLength`, `maxLength`, `min`, `max`, then
`validate` (sync or async, gets all values for cross-field checks). The
first failure wins and becomes `{ type, message }`. Each rule takes a value
or `{ value, message }`.

Details that are easy to get wrong
([`validation.ts`](./validation.ts)):

- **What counts as empty:** `""`, `null`, `undefined`, an unticked checkbox
  (`false`), a cleared number input (`NaN`), an empty array. The number `0`
  is **not** empty.
- **Optional and empty → stop.** An empty optional email shouldn't fail
  "invalid email".
- **Regex with the `g` flag remembers where it stopped** (`lastIndex`), so
  the same regex can say yes, then no, to the same text. Reset `lastIndex`
  before testing.

### When to validate: modes

| `mode` (before first submit) | Validates on |
| --- | --- |
| `onSubmit` (default) | Submit only. |
| `onBlur` | Leaving a field. |
| `onChange` | Every change — most re-renders. |
| `onTouched` | First on leaving a field, then on every change. Used in the demo: no errors while you're still typing the first time, instant feedback while fixing one. |
| `all` | Blur and change. |

After the first submit, `reValidateMode` takes over (default `onChange`):
once you've been shown errors, they update as you fix them.

### Async validation and the stale-answer race

"Is this username free?" takes time. Type `admin` (slow: *taken*), then
quickly `admin2` (fast: *free*). The `admin2` answer arrives first, then the
old `admin` answer lands and shows "taken" for `admin2`.

The fix is a **ticket per field**: each check takes the next number; when it
finishes, it only writes its result if its ticket is still the latest.
`reset()` bumps a separate counter so checks started before a reset are
ignored too. It's the same idea as ignoring stale fetch responses in the
[debounced search](../DebouncedSearch/DebouncedSearch.md).

The analogy: a deli counter with numbered tickets. If someone with an older
ticket wanders back after their number was skipped, they don't get served
ahead of whoever is being served now.

### Cross-field: `deps`

"Confirm password" is checked against "password". Change the password
*after* confirming, and the old "match" result is now wrong. `deps:
["confirmPassword"]` on the password field re-checks the confirm field when
the password changes — but only if the user has already touched it, so an
untouched box doesn't light up red.

### `isValid` is expensive — only compute it if read

Knowing "is the whole form valid?" means running every rule, including async
ones, after every change. So the store only does that once some component
has read `formState.isValid` (the demo's status line does). Pay for what you
use.

---

## 7. Re-render control: subscriptions

### The event stream

Every change is broadcast as a small description:

```ts
{ kind: "value", name: "email" }          // a value changed (no name = all, e.g. reset)
{ kind: "state", keys: ["errors"] }       // these formState keys changed
```

Nothing is broadcast when nothing changed: setting the same error again
keeps the same `errors` object and emits nothing.

### Hooking into React: `useSyncExternalStore`

```ts
function useFormSubscription(control, isRelevant) {
  const version = useRef(0);
  const subscribe = useCallback(
    (onStoreChange) => control.subscribe((change) => {
      if (isRelevant(change)) { version.current++; onStoreChange(); }
    }),
    [control],
  );
  useSyncExternalStore(subscribe, () => version.current);
}
```

Each component asks one question per change — "do I care?" — and only if
yes does its version number move, which is what makes React re-render it.
`useSyncExternalStore` is React's built-in way to read from a store that
lives outside React without screens showing half-old, half-new data during
concurrent rendering (see the
[`useSyncExternalStore`](../../Hooks/useSyncExternalStore/useSyncExternalStore.md)
notes).

### `formState` as a tracked object

```ts
const { errors, isSubmitting } = formState;   // subscribes to exactly these two
```

`formState` is a fresh object each render whose properties are **getters**.
Reading `errors` records "this component uses errors"; the subscription then
only re-renders it when `errors` changes. React Hook Form does the same with
a `Proxy`.

The catch, straight from React Hook Form's docs: **read what you need at the
top of the component**, not inside a condition. In
`disabled={!isDirty || !isValid}`, if `isDirty` is false the `||` never
reads `isValid`, so the component isn't subscribed to it. Destructure first.

### `watch` vs `useWatch`

`watch("newsletter")` subscribes the component that called `useForm` — the
whole form re-renders. That's right in the demo: ticking "newsletter" has to
show or hide a field *in the form*. The password strength meter uses
`useWatch` in a small child, so typing a password re-renders only that child.

Rule of thumb: `watch` when the form itself changes shape; `useWatch` for
display that depends on a value.

---

## 8. Controlled components: `useController`

Native inputs hold their own value. A custom component — the demo's plan
picker made of buttons, a date picker, a UI-kit select — doesn't, so it must
be controlled:

```ts
const { field, fieldState } = useController({ control, name: "plan", rules: { required: "Pick a plan." } });
<PlanButtons value={field.value} onChange={field.onChange} onBlur={field.onBlur} ref={field.ref} />
```

- `field.onChange(value)` takes the **value**, not an event.
- `field.ref` is any focusable thing, so submit can focus it when it's
  invalid.
- It re-renders only when **this field's** value, error, touched or dirty
  flag changes. Another field's error doesn't touch it.
- Mount / unmount is reported with an effect, since there's no DOM ref the
  library owns.

React Hook Form's `<Controller render={…} />` is the same hook in component
form.

---

## 9. `handleSubmit`

1. `preventDefault()`.
2. `isSubmitting = true`.
3. Validate every **mounted** field (async ones in parallel).
4. Valid → `await onValid(values)`. Invalid → focus the first field with an
   error (in screen order — the order fields registered), call `onInvalid`.
5. In `finally`: `isSubmitting = false`, `isSubmitted = true`,
   `submitCount + 1`, `isSubmitSuccessful` = whether `onValid` finished.

The `finally` matters: if `onValid` throws (the server is down), the button
must not stay stuck on "Submitting…". The error is re-thrown so the caller
can show it.

### Only mounted fields count

A field that's hidden by a condition (the demo's "How often?" appears only
when the newsletter box is ticked) keeps its value but must not be validated
— otherwise a hidden required field makes the form impossible to submit.
Each field has a `mounted` flag, set by its ref (or by `useController`'s
effect), and validation skips unmounted fields.

---

## 10. `setValue`, `getValues`, `reset`

- **`setValue`** updates the store **and** the DOM element (for an
  uncontrolled input, the DOM is what the user sees). Controlled fields
  update through their subscription. Validation is opt-in
  (`shouldValidate`), because code setting a value isn't the user making a
  mistake.
- **`getValues`** returns the values object without subscribing. Each change
  creates a new values object, so a snapshot you took earlier never changes
  under you.
- **`reset(newDefaults?)`** sets values (and optionally new defaults, so
  "dirty" is measured against the saved version — used after loading a record
  or a successful save), writes them into every mounted input, clears errors,
  dirty, touched and submit counts, and cancels in-flight checks.

---

## 11. React internals worth saying out loud

- **Uncontrolled inputs and `ref` callbacks** are what make "no re-render on
  typing" possible.
- **Stable callback identity** — cached register props — avoids ref
  detach/attach on every render.
- **Lazy `useState` initializer** for a store created once.
- **`useSyncExternalStore`** for subscribing to an outside store safely.
- **StrictMode** mounts, unmounts and mounts again in development: refs get
  `null` then the element again; `useController`'s effect reports unmounted
  then mounted. Everything has to survive that — and it does, because
  mount state is just a flag. (It's also why the demo's counters start at 2.)
- **React 19 ref callbacks can return a cleanup function**, an alternative to
  handling the `null` call.
- **React 19 form actions** (`<form action={fn}>`) are a different model:
  the browser's `FormData` at submit time, no per-field state. Good for
  simple server-submitted forms; a library like this is for rich
  client-side validation and feedback. They can work together —
  `handleSubmit` can call a server action once validation passes.

---

## 12. What's simplified compared to React Hook Form

| Left out | What it would take |
| --- | --- |
| Nested names `address.city`, arrays `items.0.qty` | `get` / `set` by path over nested values; dirty and errors become nested too. |
| Field arrays (add / remove / reorder rows) | A `useFieldArray` with stable row ids (not indexes) as keys. |
| Radio groups (many inputs, one name) | Store a list of elements per name; read the checked one. |
| Schema validation (Zod, Yup) | A `resolver(values) → { values, errors }` option that replaces per-field rules. |
| `isValidating`, `delayError`, `criteriaMode: "all"` | Counter of running checks; a timer before showing errors; collect all failures instead of the first. |
| `shouldUnregister` | On unmount, also delete the value (here it's kept). |
| Async `defaultValues` | `isLoading` state; `reset(loaded)` when they arrive. |
| Deep dirty check | `Object.is` is used, so arrays and objects compare by reference. |

---

## 13. Follow-ups to expect

| They ask | Short answer |
| --- | --- |
| "Why not keep values in useState?" | Every keystroke would re-render the form and every field. Outside-React storage plus opt-in subscriptions re-renders only what shows the change (section 3). |
| "How does `formState` know what I use?" | Getters (or a Proxy) record which keys were read during render; the subscription filters on them (section 7). |
| "Two async checks race." | Tickets per field; only the newest result writes (section 6). |
| "Add Zod support." | A resolver option: on validate, run the schema over all values and map its issues to `errors[name]`. |
| "Show errors only after submit, then live." | `mode: "onSubmit"` with `reValidateMode: "onChange"` — the defaults. |
| "A field depends on another." | `deps` to re-validate; `watch` / `useWatch` to show or hide. |
| "Test it." | The store is plain JS: create it, call `registerControlled(...).onChange(...)`, assert on `getState()`. React-level: render, type, and assert render counts with a profiler or a counter. |
| "Why a Map for fields?" | Keeps registration order, which is screen order — used to focus the first error. |

---

## 14. Scoring notes

- **Mid:** `useForm` with values in `useState`, `register` returning
  `value`/`onChange`, rules checked on submit, errors in state. Works; every
  keystroke re-renders the whole form.
- **Senior:** values outside React with uncontrolled inputs; a store plus
  subscriptions with `useSyncExternalStore`; `formState` that subscribes
  only to what's read; `watch` vs `useWatch`; `useController` for custom
  inputs; stable register props; validation modes; async race handling;
  mounted-only validation; `handleSubmit` that always clears
  `isSubmitting`; and a clear list of what was left out and why.
