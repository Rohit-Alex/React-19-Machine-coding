# `satisfies` and utility types in real components

The tools for **deriving** types instead of writing them twice, and for
**checking** a value without losing what TypeScript knows about it. Every
example was checked with this project's `tsc` (strict): ❌ lines are real
errors.

---

## 1. `satisfies` — check the shape, keep the details

**Use case:** config objects — status → style maps, route tables, theme
tokens, feature flags — where you want both a **check** (no missing or
misspelled keys) and **exact types** afterwards.

```ts
type Status = "draft" | "published" | "archived";

const STATUS_STYLE = {
  draft:     { label: "Draft",    color: "#999" },
  published: { label: "Live",     color: "#2f7d1f" },
  archived:  { label: "Archived", color: "#666" },
} satisfies Record<Status, { label: string; color: string }>;
```

- **Missing a status** → ❌ error. Add `"scheduled"` to `Status` and every map
  like this fails until it's handled.
- **Misspelled key** (`archvied`) → ❌ error.

### Why not just annotate?

```ts
const routes = { home: "/", user: "/users/:id" } as const satisfies Record<string, `/${string}`>;
type RouteName = keyof typeof routes;      // "home" | "user"  ✅ exact
routes.user;                                // "/users/:id"     ✅ exact

const routes2: Record<string, `/${string}`> = { home: "/" };
type RouteName2 = keyof typeof routes2;    // string           ❌ the names are lost
```

| | `const x: Type = …` | `const x = … satisfies Type` |
| --- | --- | --- |
| Checks the value | ✅ | ✅ |
| Type of `x` afterwards | `Type` (widened) | the value's own, exact type |
| Keys usable as a union | ❌ becomes `string` | ✅ `"home" \| "user"` |

Analogy: an inspector who checks your luggage meets the rules but hands it
back with everything still inside — versus one who swaps it for a standard
empty case of the allowed size.

- `as const` makes values readonly literals (`"/users/:id"`, not `string`).
- `as const satisfies T` — the common pair: exact literals *and* checked.
- **`satisfies` never changes the runtime value**, and unlike `as`, it can't
  lie: `` { home: "home" } satisfies Record<string, `/${string}`> `` is ❌
  (no leading slash), where `as` would let it through.

### `as const` arrays → unions

```ts
const SIZES = ["sm", "md", "lg"] as const;
type Size = (typeof SIZES)[number];   // "sm" | "md" | "lg"
```

One list for both the runtime options (render a `<select>`) and the type.
They can't drift.

---

## 2. `ComponentProps` — borrow another component's props

**Use case 1:** your `Button` should accept everything a `<button>` does.

```tsx
type ButtonProps = ComponentProps<"button"> & { variant?: "primary" | "ghost" };

function Button({ variant = "primary", className, ...rest }: ButtonProps) {
  return <button {...rest} className={`btn btn-${variant} ${className ?? ""}`} />;
}

<Button type="submit" disabled aria-label="Save" onClick={(e) => …} />   // ✅ all native props
<Button href="/" />                                                      // ❌ not a button attribute
```

Merge `className`/`style` with yours rather than overwriting the caller's.

**Use case 2:** your prop name clashes with a native one. `<input>` already has
`size` (a number):

```tsx
type InputProps = Omit<ComponentProps<"input">, "size"> & { size?: "sm" | "lg" };
```

Without the `Omit`, `size` becomes `number & ("sm" | "lg")` — impossible, so
`size="lg"` is ❌. `Omit` first, then add yours.

**Use case 3:** a third-party component doesn't export its props type.

```tsx
type SelectProps = ComponentProps<typeof ThirdPartySelect>;
const ClearableSelect = (props: Omit<SelectProps, "clearable">) => <ThirdPartySelect {...props} clearable />;
<ClearableSelect … clearable={false} />   // ❌ the wrapper fixes it
```

| Type | Includes `ref`? | Use when |
| --- | --- | --- |
| `ComponentProps<"input">` | yes (React 19: `ref` is a prop) | Default choice |
| `ComponentPropsWithRef<T>` | yes, explicitly | Polymorphic components ([Polymorphic](../Patterns/Polymorphic/Polymorphic.md)) |
| `ComponentPropsWithoutRef<T>` | no | Your component handles `ref` separately, or must not take one |

---

## 3. `PropsWithChildren`

```tsx
type CardProps = PropsWithChildren<{ title: string }>;   // adds children?: ReactNode
```

Note the `?`: **`children` becomes optional** — `<Card title="x" />` compiles
(checked). If children are required, write `children: ReactNode` yourself.

---

## 4. `Omit`, `Pick`, `Partial`, `Required` — one model, many shapes

**Use case:** the same entity in a create form, an edit form, and a settings
object.

```ts
interface User { id: number; name: string; email: string; role: "admin" | "member"; createdAt: Date }

type UserDraft = Omit<User, "id" | "createdAt">;          // create form: the server sets those
type UserPatch = Partial<Pick<User, "name" | "email">>;   // PATCH body: any subset of these two
type ResolvedConfig = Required<Config>;                   // after defaults are filled in

const draft: UserDraft = { id: 1, … };   // ❌ id is set by the server
```

Derive from one source so a new field on `User` shows up everywhere — or
fails to compile where it's missing.

---

## 5. `Extract`, `Exclude`, `NonNullable` — work with unions

**Use case:** one action from a reducer's union, for a typed action creator
or a handler.

```ts
type Action = { type: "add"; text: string } | { type: "toggle"; id: number } | { type: "clear" };

type AddAction = Extract<Action, { type: "add" }>;     // { type: "add"; text: string }
type NotClear  = Exclude<Action, { type: "clear" }>;   // the other two
type DefinitelyUser = NonNullable<User | null | undefined>;   // User
```

---

## 6. `ReturnType`, `Parameters`, `Awaited` — types from functions

**Use case:** the API client already knows its return types; don't copy them.

```ts
async function fetchUser(id: number) { return { id, name: "A" }; }

type FetchedUser = Awaited<ReturnType<typeof fetchUser>>;   // { id: number; name: string }
type FetchArgs   = Parameters<typeof fetchUser>;            // [id: number]
```

`ReturnType` of an async function is a `Promise<…>`; `Awaited` unwraps it.
Same trick for hooks: `ReturnType<typeof useToggle>`
([TypingHooks](./TypingHooks.md#7-reusing-a-hooks-types)).

---

## 7. Quick reference: which tool for which job

| Job | Tool |
| --- | --- |
| Check a config object, keep its exact keys | `satisfies` (+ `as const`) |
| One list for runtime options and the type | `as const` array + `(typeof X)[number]` |
| Accept every native prop | `ComponentProps<"button">` |
| Props of a component that doesn't export them | `ComponentProps<typeof Comp>` |
| Replace a native prop with your own | `Omit<…, "size"> & { size: … }` |
| Create / edit / patch shapes from one model | `Omit`, `Pick`, `Partial`, `Required` |
| One member of a union | `Extract` / `Exclude` |
| Types from an API function | `Awaited<ReturnType<typeof fn>>`, `Parameters` |
| Optional children | `PropsWithChildren` (required: write `children: ReactNode`) |

---

## 8. Mistakes interviewers look for

| Mistake | Better |
| --- | --- |
| `const config: Config = {…}` then `keyof typeof config` is `string` | `satisfies Config` |
| `{…} as Config` to "check" a value | `satisfies` — `as` silences errors instead of finding them |
| Copying `<button>`'s props by hand | `ComponentProps<"button">` |
| Intersecting a prop that already exists natively | `Omit` it first |
| Duplicating the API's response type | `Awaited<ReturnType<typeof fetchX>>` (or generate it from the API schema) |
| A second `type UserForm = { name; email; role }` | `Omit<User, "id" \| "createdAt">` |
