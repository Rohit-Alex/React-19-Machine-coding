# Typing props: unions, discriminated unions, generics

The goal of prop types isn't documentation — it's making **wrong usage fail
to compile**. Every example below was run through this project's `tsc`
(strict mode): lines marked ❌ really are errors, and the rest compile.

---

## 1. Literal unions — "one of these values"

**Use case:** variants, sizes, tones — any prop with a fixed set of values.

```tsx
interface BadgeProps {
  size?: "sm" | "md" | "lg";
  tone: "success" | "warning" | "danger";
}
const Badge = ({ size = "md", tone }: BadgeProps) => …;

<Badge tone="success" />
<Badge size="xl" tone="success" />   // ❌ "xl" isn't a size
```

- Prefer unions to `enum`s: no import needed at the call site, plain strings
  at runtime, and editors autocomplete them.
- Default values in the destructuring (`size = "md"`) make the prop optional
  for callers and always defined inside.

---

## 2. Discriminated unions — "these props only make sense together"

**Use case:** a component with modes, where each mode needs different props.
An error alert must have `onRetry`; a confirm needs two handlers; an info
alert needs neither.

```tsx
type AlertProps =
  | { kind: "info"; message: string }
  | { kind: "error"; message: string; onRetry: () => void }
  | { kind: "confirm"; message: string; onConfirm: () => void; onCancel: () => void };

function Alert(props: AlertProps) {
  return (
    <div>
      {props.message}
      {props.kind === "error" && <button onClick={props.onRetry}>Retry</button>}  {/* narrowed */}
    </div>
  );
}

<Alert kind="error" message="Upload failed" onRetry={retry} />
<Alert kind="error" message="Upload failed" />         // ❌ onRetry is missing
<Alert kind="info" message="Done" onRetry={retry} />   // ❌ info alerts don't take onRetry
```

The alternative — every prop optional (`onRetry?`, `onConfirm?`…) — compiles
for every wrong combination and pushes the checks into runtime `if`s.

Analogy: a form with sections that only appear after you tick a box. Tick
"business account" and the company fields appear *and are required*; untick
it and they're gone.

### Gotcha: don't destructure the rest too early

```tsx
function Alert({ kind, ...rest }: AlertProps) {
  if (kind === "error") rest.onRetry;   // ❌ `rest` isn't narrowed by checking `kind`
}
```

Narrowing works on the `props` object (or on all fields destructured
together). Splitting off `...rest` breaks the link. Check `props.kind`, then
destructure inside the branch.

The same pattern types **state** too: `{ status: "loading" } | { status:
"success"; data } | { status: "error"; error }` — see
[TypingHooks](./TypingHooks.md#5-state-and-actions-as-discriminated-unions).

---

## 3. "Exactly one of" — the `?: never` trick

**Use case:** an icon-only button *must* have an accessible label; a text
button must *not* have both.

```tsx
type IconButtonProps = { onClick: () => void } & (
  | { icon: ReactNode; label: string; text?: never }
  | { text: string; icon?: never; label?: never }
);

<IconButton icon="🗑" label="Delete" onClick={del} />
<IconButton text="Delete" onClick={del} />
<IconButton icon="🗑" onClick={del} />                          // ❌ icon-only needs a label
<IconButton icon="🗑" label="Delete" text="Delete" onClick={del} /> // ❌ not both
```

`text?: never` means "you may not pass `text` in this branch". Without it,
TypeScript allows the extra prop, because object types are open.

Other uses: `href` **or** `onClick` (link vs button), controlled `value`
**or** uncontrolled `defaultValue`.

---

## 4. `children`

| Type | Accepts | Use case |
| --- | --- | --- |
| `ReactNode` | anything renderable: text, numbers, elements, arrays, `null` | Almost always — cards, layouts, buttons |
| `ReactElement` | exactly one element | A component that clones or wraps its child (tooltips, `asChild`) |
| `(…) => ReactNode` | a function (render prop) | The component passes its state to the caller ([RenderPropsVsHooks](../Patterns/RenderPropsVsHooks/RenderPropsVsHooks.md)) |

```tsx
const OnlyOne = ({ children }: { children: ReactElement }) => children;
<OnlyOne><b /></OnlyOne>
<OnlyOne>hello</OnlyOne>        // ❌ text isn't an element

const Toggle = ({ children }: { children: (on: boolean, toggle: () => void) => ReactNode }) => …;
<Toggle>{(on, toggle) => <button onClick={toggle}>{on ? "On" : "Off"}</button>}</Toggle>
```

Note: `ReactElement` can't say *which* component the child is
(`ReactElement<typeof Tab>` isn't enforced in JSX). Check at runtime if it
matters.

---

## 5. Generic components — "works with any data, stays type-safe"

**Use case:** Select, List, Table, Autocomplete — components that take the
caller's data and hand it back.

```tsx
interface SelectProps<T> {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  getLabel: (option: T) => string;
}
function Select<T>(props: SelectProps<T>) { … }

<Select options={users} value={user} onChange={setUser} getLabel={(u) => u.name} />
//                                                       ^ u is User — inferred, never written
<Select options={[12, 14, 16] as const} value={14} onChange={setSize} getLabel={(n) => `${n}px`} />
<Select options={users} value="Asha" … />   // ❌ value must be a User, like the options
```

- **`T` is inferred** from the props. Callers never write `<Select<User>>`.
- With `any` instead, `onChange` would hand back `any` and every caller loses
  types — the most common mistake in shared components.
- **Arrow functions in `.tsx`** need `<T,>` (trailing comma), or the parser
  reads `<T>` as a JSX tag:

  ```tsx
  const List = <T,>({ items, render }: { items: T[]; render: (item: T) => ReactNode }) => …;
  ```

- **Constraints** say what the component needs from `T`:

  ```tsx
  function Table<T extends { id: string | number }>({ rows }: { rows: T[] }) {
    return rows.map((r) => <Row key={r.id} … />);   // r.id is allowed
  }
  <Table rows={[{ name: "x" }]} />   // ❌ rows need an id
  ```

---

## 6. `keyof` — columns that can only name real fields

**Use case:** a table whose column definitions must match the row type, with
each column's `render` getting *that field's* type.

```tsx
interface Column<T, K extends keyof T = keyof T> {
  key: K;
  header: string;
  render?: (value: T[K], row: T) => ReactNode;
}
const column = <T,>() => <K extends keyof T>(c: Column<T, K>) => c as unknown as Column<T>;

const col = column<User>();
col({ key: "joined", header: "Joined", render: (v) => v.toLocaleDateString() });  // v: Date
col({ key: "email", header: "Email" });                                          // ❌ not a field of User
```

Why the helper: in a plain array `Column<User>[]`, every column has
`K = keyof User`, so `value` is `number | string | Date` — `v.getFullYear()`
is an error (checked). Calling `col(…)` once per column lets TypeScript infer
`K` for each one. Table libraries (TanStack Table's `columnHelper`) use the
same trick.

---

## 7. Extending native elements

**Use case:** a `Button` that accepts everything a `<button>` does.

```tsx
type ButtonProps = ComponentProps<"button"> & { variant?: "primary" | "ghost" };
```

Covered with `ComponentProps`, `Omit` and friends in
[UtilityTypes](./UtilityTypes.md#2-componentprops--borrow-another-components-props).
For "render as any element", see [Polymorphic](../Patterns/Polymorphic/Polymorphic.md).

---

## 8. Mistakes interviewers look for

| Mistake | Better |
| --- | --- |
| Every prop optional, checked at runtime | Discriminated unions |
| `any` in a shared component's props | A generic `T` |
| `enum Size { Sm, Md }` | `"sm" \| "md"` |
| `React.FC<Props>` everywhere | Plain functions `(props: Props) =>`. `FC` adds nothing since React 18 (it no longer adds `children`), and it's awkward with generics. |
| `isLoading`, `error`, `data` as three independent props | One union: you can't have `data` *and* `error` |
| `children: JSX.Element` | `ReactNode` — `JSX.Element` rejects strings, numbers and `null` |
