# Typing custom hooks (tuples, generics, overloads)

A well-typed hook means callers **never write a type** — everything is
inferred from what they pass in — and misuse fails to compile. Every example
was checked with this project's `tsc` (strict): ❌ lines are real errors.

---

## 1. Returning a tuple: `as const`

**Use case:** `useState`-style hooks where callers name the values
(`const [isOpen, toggleOpen] = useToggle()`).

```ts
function useToggle(initial = false) {
  const [on, setOn] = useState(initial);
  return [on, () => setOn((v) => !v)] as const;   // readonly [boolean, () => void]
}
```

Without `as const`, TypeScript infers an **array of either type**:
`(boolean | (() => void))[]`. Then `toggle()` is an error — "this might be a
boolean" (checked ❌). `as const` makes it a fixed tuple: position 0 is
`boolean`, position 1 is the function.

**Tuple or object?**
- **Tuple** — 2 values, and callers will want their own names (two toggles in
  one component: `[isMenuOpen, toggleMenu]`, `[isDark, toggleDark]`).
- **Object** — 3+ values, or values callers only sometimes need
  (`const { data, error } = useFetch(url)`). Order doesn't matter; easy to add
  fields later.

---

## 2. Generic hooks: the type comes from the arguments

**Use case:** `useLocalStorage`, `useDebounce`, `usePrevious` — hooks that
work for any value.

```ts
function useStoredValue<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => { … });
  const save = (next: T) => { localStorage.setItem(key, JSON.stringify(next)); setValue(next); };
  return [value, save] as const;
}

const [count, setCount] = useStoredValue("count", 0);        // T = number
const [theme, setTheme] = useStoredValue("theme", "light" as "light" | "dark");
setTheme("blue");                                             // ❌ not a theme
```

- **`T` is inferred from `initial`.** Pass a literal union with `as` (or a
  typed constant) when the starting value is narrower than what's allowed —
  otherwise `"light"` would be inferred as plain `string`.
- **`JSON.parse(raw) as T` is a lie TypeScript can't check** — storage could
  hold anything. For untrusted data, validate (Zod) instead of casting. The
  repo's [useLocalStorage](../Hooks/useLocalStorage/useLocalStorage.ts) is the
  full version.

### The `useState(null)` trap

```ts
const [user, setUser] = useState(null);
setUser({ id: 1, name: "A" });            // ❌ the type is `null` forever

const [user, setUser] = useState<User | null>(null);   // ✅ name it when the start value is empty
```

Rule: let TypeScript infer, **except** when the initial value doesn't show the
full type — `null`, `[]` (infers `never[]`), `{}`.

---

## 3. Constrained generics

**Use case:** a hook that accepts only certain keys, and returns the matching
type for each.

```ts
function useEventListener<K extends keyof WindowEventMap>(
  type: K,
  handler: (event: WindowEventMap[K]) => void,
) { … }

useEventListener("keydown", (e) => e.key);       // e: KeyboardEvent
useEventListener("resize", (e) => e.target);     // e: UIEvent
```

`K extends keyof WindowEventMap` limits `type` to real event names, and
`WindowEventMap[K]` gives the handler the right event type — no casts at the
call site. This repo's [useEventListener](../Hooks/useEventListener/useEventListener.ts)
does exactly this. Same idea: `useQuery<K extends keyof Endpoints>(key)`
returning `Endpoints[K]`.

---

## 4. Overloads: the return type depends on the arguments

**Use case:** "without a fallback it may be `null`; with one it never is".

```ts
function useSearchParam(name: string): string | null;
function useSearchParam(name: string, fallback: string): string;
function useSearchParam(name: string, fallback?: string) {        // implementation
  return new URLSearchParams(location.search).get(name) ?? fallback ?? null;
}

const q = useSearchParam("q");
q.toUpperCase();                                   // ❌ may be null
const tab = useSearchParam("tab", "overview");
tab.toUpperCase();                                 // ✅ string
```

- The first two lines are what callers see; the third (implementation) is
  hidden and must be compatible with both.
- Same pattern: `useQuery(key)` → `T | undefined`, `useQuery(key, {
  initialData })` → `T` (TanStack Query does this).
- Prefer overloads to a single signature returning `string | null` that
  forces every caller to check — or to a cast at the call site.

---

## 5. State and actions as discriminated unions

**Use case:** async state, and `useReducer` actions.

```ts
type FetchState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; error: Error };

state.data;                                         // ❌ only exists on success
if (state.status === "success") state.data.length;  // ✅
```

Three booleans (`isLoading`, `isError`, `data?`) allow impossible
combinations — loading *and* error, data *and* error. A union allows exactly
four states.

```ts
type Action = { type: "add"; text: string } | { type: "toggle"; id: number } | { type: "clear" };

function reducer(todos: Todo[], action: Action): Todo[] {
  switch (action.type) {
    case "add": …
    case "toggle": …
    case "clear": …
    default: {
      const unreachable: never = action;   // exhaustiveness check
      return unreachable;
    }
  }
}

dispatch({ type: "toggle" });   // ❌ toggle needs an id
dispatch({ type: "rename" });   // ❌ not an action
```

**The `never` check:** if someone adds `{ type: "remove" }` to `Action` and
forgets a `case`, `action` in `default` is no longer `never`, and the
assignment fails to compile (checked). The compiler finds every reducer that
needs updating.

---

## 6. Context hooks that can't return `null`

**Use case:** a context that only makes sense inside its provider.

```ts
const AuthContext = createContext<Auth | null>(null);

function useAuth(): Auth {
  const auth = use(AuthContext);
  if (!auth) throw new Error("useAuth must be used inside <AuthProvider>");
  return auth;                       // narrowed to Auth
}

const { user } = useAuth();          // no null checks for callers
use(AuthContext).user;               // ❌ the raw context may be null
```

The throw narrows the type *and* gives a clear runtime message — better than
`createContext<Auth>({} as Auth)`, which lies to TypeScript and crashes later
with "cannot read property of undefined".

---

## 7. Reusing a hook's types

**Use case:** passing a hook's result to a child, or wrapping a hook.

```ts
type ToggleApi = ReturnType<typeof useToggle>;                 // readonly [boolean, () => void]
type StoredArgs = Parameters<typeof useStoredValue<number>>;   // [key: string, initial: number]
```

Derive types from the hook instead of writing them twice — they can't drift.
(`typeof useStoredValue<number>` — an "instantiation expression" — fixes
`T` before reading the parameters.)

---

## 8. Mistakes interviewers look for

| Mistake | Better |
| --- | --- |
| Returning `[a, b]` without `as const` | `as const`, or an object |
| `useState(null)` / `useState([])` with no type | `useState<User \| null>(null)`, `useState<Todo[]>([])` |
| `any` in a generic hook | `<T>` inferred from an argument |
| Return type `T \| null` that every caller casts away | Overloads, or a required-context hook that throws |
| Booleans for async state | A discriminated union |
| A `switch` on actions with no `default` | The `never` exhaustiveness check |
| Hand-written types that copy a hook's return | `ReturnType<typeof useX>` |
