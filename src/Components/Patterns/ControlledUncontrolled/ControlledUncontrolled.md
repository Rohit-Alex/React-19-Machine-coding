# Controlled vs uncontrolled components

> **The question:** "What's the difference between a controlled and an
> uncontrolled input? Which would you use?" — and for component authors:
> "How do you build one component that supports both?"
>
> The one-line answer: **who owns the value** — the parent (controlled) or
> the component / DOM itself (uncontrolled). Everything else follows from
> that.

Runnable demo: [`index.tsx`](./index.tsx) · the shared hook:
[`useControllableState.ts`](./useControllableState.ts) · a component using it:
[`Disclosure.tsx`](./Disclosure.tsx)

Also covered from the component side in the Phase 2 [Tabs](../../MachineCoding/Tabs/Tabs.md#2-controlled-vs-uncontrolled)
(with the "veto a change" example).

---

## 1. The difference

| | Controlled | Uncontrolled |
| --- | --- | --- |
| Value lives in | parent's state | the component (or the DOM, for inputs) |
| You pass | `value` + `onChange` | `defaultValue` (start only) |
| Read it | any time — it's your state | on submit (`FormData`) or with a ref |
| Change it from outside | ✅ set the state | ❌ only by remounting (`key`) |
| Re-renders while typing | the parent, every keystroke | none |

Analogy: a car you drive (controlled) vs a taxi (uncontrolled). Driving, you
control every turn — and you have to. In a taxi you say where you're going at
the start and find out at the end.

---

## 2. Inputs

**Controlled** — when the UI needs the value *while it changes*:
- format or filter as you type (the demo's card number: digits only, spaces
  every four);
- live validation, a character counter, enabling Save only when valid;
- one value driving another (country → states).

**Uncontrolled** — when you only need the value *at the end*:
- plain forms read on submit. In React 19, `<form action={fn}>` hands you
  `FormData` — no state per field — and resets uncontrolled fields after the
  action runs;
- large forms where re-rendering on each keystroke is noticeable;
- file inputs, which can only be uncontrolled.

### Gotchas

- **`value` without `onChange`** makes a read-only input (React warns).
- **Switching modes** — `value={user?.name}` is `undefined` until data loads,
  then a string: "A component is changing an uncontrolled input to be
  controlled". Use `value={user?.name ?? ""}`.
- **`defaultValue` is read once.** Loading a different user doesn't update it.
  Remount with a new `key` (the demo's "Load next user") — that also throws
  away half-typed edits, which is usually what you want.
- **Formatting moves the cursor.** Reformatting a controlled value puts the
  caret at the end. Editing the middle of "1234 5678" jumps the cursor.
  Production inputs save `selectionStart` and restore it after formatting.

---

## 3. Building a component that supports both

```ts
function useControllableState<T>(value: T | undefined, defaultValue: T, onChange?: (v: T) => void) {
  const [internal, setInternal] = useState(defaultValue);
  const isControlled = value !== undefined;
  const current = isControlled ? value : internal;
  const setValue = (next: T) => {
    if (!isControlled) setInternal(next);
    onChange?.(next);
  };
  return [current, setValue] as const;
}
```

The `Disclosure` component uses it and never checks which mode it's in. The
demo uses it both ways: three uncontrolled ones with `defaultOpen`, three
controlled ones with "Expand all" / "Collapse all" — impossible in the
uncontrolled version, since the page doesn't own their state.

The rules inside the hook are the ones interviewers look for:
- **`value !== undefined`, not truthiness** — `false`, `0` and `""` are real
  controlled values. (`open={false}` must mean "closed, controlled".)
- **Never copy `value` into state with an effect.** Read it directly when
  given. A copy is a second source of truth, one render late.
- **`onChange` fires in both modes** — for analytics, URL sync, etc.
- **In controlled mode, `onChange` is a request.** Nothing changes until the
  parent passes a new value — which is how a parent can refuse a change.
- **Warn on mode switching** in development, like React does for inputs.

Radix, MUI and others ship this exact hook (`useControllableState`,
`useControlled`).

---

## 4. Choosing for your own components

- **Default to supporting both.** Uncontrolled for the simple case (`<Tabs
  defaultValue>`), controlled when the page needs to drive it.
- **Controlled-only** when the state is meaningless without the parent (a
  page's selected row that other panels read).
- **Uncontrolled-only** for purely visual state no one else needs (a
  tooltip's hover state).

---

## 5. Follow-ups to expect

| They ask | Short answer |
| --- | --- |
| "Performance of controlled forms?" | Each keystroke re-renders the owner. Keep form state in the form component (not the page), use uncontrolled fields + `FormData`, or a library like React Hook Form that's uncontrolled underneath ([FormLibrary](../../MachineCoding/FormLibrary/FormLibrary.md)). |
| "Reset an uncontrolled form?" | `form.reset()` (back to `defaultValue`s), a new `key`, or React 19 form actions' automatic reset. |
| "Read an uncontrolled value without submitting?" | A ref (`inputRef.current.value`) or `new FormData(formRef.current)`. |
| "Partly controlled?" | Some libraries let you control one prop (e.g. `open`) and leave others uncontrolled. Each prop is its own controlled/uncontrolled pair. |
| "Server state as `value`?" | Controlled from a query cache: show the cached value, `onChange` sends a mutation ([OptimisticUpdates](../../DataFetching/OptimisticUpdates/OptimisticUpdates.md)). |

---

## 6. Scoring notes

- **Mid:** knows `value`+`onChange` vs `defaultValue`; picks controlled for
  everything.
- **Senior:** chooses by when the value is needed; knows the mode-switch
  warning and its `?? ""` fix, `defaultValue` + `key` resets, React 19
  `FormData` actions, and the cursor-jump problem; builds dual-mode
  components with `value !== undefined`, no copied state, and `onChange` as a
  request.
