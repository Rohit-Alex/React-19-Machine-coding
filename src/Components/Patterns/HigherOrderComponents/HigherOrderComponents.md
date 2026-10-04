# Higher-order components (still asked in legacy codebases)

> **The question:** "What's a HOC? Write one. What are the problems with
> them?" You'll meet them in older code — `connect()` from Redux,
> `withRouter`, `withStyles` — and in code that wraps whole screens
> (`withAuth`, `withErrorBoundary`). Knowing the traps matters more than
> writing new ones.

Runnable demo: [`index.tsx`](./index.tsx) · HOCs: [`hocs.tsx`](./hocs.tsx)

---

## 1. What a HOC is

A function that takes a component and returns a new component that renders
it with something extra:

```tsx
function withFeatureFlag<P>(Component: ComponentType<P>, flag: string) {
  function WithFeatureFlag(props: P) {
    const flags = use(FlagsContext);
    return flags[flag] ? <Component {...props} /> : null;
  }
  WithFeatureFlag.displayName = `withFeatureFlag(${Component.displayName || Component.name})`;
  return WithFeatureFlag;
}

const NewSearch = withFeatureFlag(SearchBox, "newSearch");    // once, at module level
```

Analogy: a gift-wrapping service. You hand over the present (the component);
it comes back wrapped (a border, a flag check, a login check) — and the
present inside is unchanged.

HOCs compose: `withOutline(withFeatureFlag(SearchBox))`. Redux's
`connect(mapState)(Component)` is a HOC factory — a function returning a HOC.

---

## 2. The traps (the part interviews are about)

### 1. Applying a HOC inside render

```tsx
const Parent = () => {
  const Search = withOutline(SearchBox);   // ❌ new component type every render
  return <Search />;
};
```

Each render makes a **new component type**. React sees a different type at
the same spot, unmounts the old one and mounts a fresh one: state lost, focus
lost, effects re-run. Tick "apply the HOC inside render" in the demo, type,
then re-render the parent — the text is gone. **Always apply HOCs at module
level** (or `useMemo` with care).

### 2. Refs

Before React 19, `ref` was not a prop: a HOC swallowed it, and you needed
`forwardRef` in every wrapper. **In React 19, `ref` is a normal prop** for
function components, so `{...props}` passes it through. The demo's "Focus
via ref" goes through two HOCs. In older codebases, you'll still see
`forwardRef` everywhere for this reason.

### 3. Names in DevTools

Without `displayName`, the tree shows `WithFeatureFlag`, `WithOutline`,
`WithOutline`… with no clue what's inside. Convention:
`withFeatureFlag(SearchBox)`. The demo prints it.

### 4. Prop collisions

```tsx
withUser(Profile)  // injects a `user` prop
<WrappedProfile user={someoneElse} />   // which `user` wins?
```

Whichever is spread last silently overwrites the other. Hooks don't have this
problem: `const user = useUser()` is a variable you name.

### 5. Static methods and hidden props

Static properties on the inner component (`Component.someHelper`) don't exist
on the wrapper unless copied (`hoist-non-react-statics` was the fix). And a
reader of `<WrappedProfile />` can't see which props are being injected
without opening every wrapper.

### 6. "Wrapper hell"

Five HOCs means five extra layers in DevTools and the same "where did this
prop come from?" question as render-prop nesting
([RenderPropsVsHooks](../RenderPropsVsHooks/RenderPropsVsHooks.md#3-what-hooks-fixed)).

---

## 3. Hooks vs HOCs

```tsx
// HOC
export default withUser(withTheme(Profile));

// Hook
function Profile() {
  const user = useUser();
  const theme = useTheme();
}
```

Hooks give the component its data as named variables, no extra components, no
collisions, no ref issues. For *sharing logic*, prefer hooks.

**HOCs still fit** when you wrap a whole component **without changing its
code**:
- **Cross-cutting wrappers** applied to many screens: `withErrorBoundary`,
  `withAuth` (redirect if logged out), `withSuspense`, feature flags.
- **Libraries that must support class components**, which can't use hooks.
- **Route-level config** where a list of screens is wrapped in one place.

Even then, a wrapper *component* (`<RequireAuth><Profile /></RequireAuth>`)
often reads better than a HOC.

---

## 4. Typing a HOC

```tsx
function withX<P extends object>(Component: ComponentType<P>) {
  return function WithX(props: P) { return <Component {...props} />; };
}
```

When the HOC **injects** a prop the caller shouldn't pass:

```tsx
function withUser<P extends { user: User }>(Component: ComponentType<P>) {
  return function WithUser(props: Omit<P, "user">) {
    const user = useUser();
    return <Component {...(props as P)} user={user} />;   // cast: TS can't prove Omit + user = P
  };
}
```

That cast is a known TypeScript limitation, and a reason HOC typing gets
messy — another point for hooks.

---

## 5. Follow-ups to expect

| They ask | Short answer |
| --- | --- |
| "Convert a HOC to a hook." | Move the logic into `useX()` returning what the HOC injected; call it in the component; delete the wrapper. Keep a thin HOC around the hook for class components until they're gone. |
| "`connect` vs `useSelector`?" | Same store; `connect` is a HOC with `mapStateToProps` (and memo built in), `useSelector` is the hook. New code uses hooks. |
| "Error boundary as a HOC?" | `withErrorBoundary(Component, Fallback)` — a good HOC use, since boundaries must be classes ([ErrorBoundaries](../ErrorBoundaries/ErrorBoundaries.md)). |
| "Does the React Compiler handle HOCs?" | It compiles the wrapper function components like any other; class components inside aren't compiled. |

---

## 6. Scoring notes

- **Mid:** can write `withX` and use it.
- **Senior:** applies HOCs at module level and explains the remount bug,
  knows refs pass through as props in React 19 (and why `forwardRef` existed),
  sets `displayName`, names prop collisions and hidden injected props, types
  injected props with `Omit`, and picks hooks for logic but HOCs for
  wrapping whole screens or class components.
