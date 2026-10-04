# Render props vs custom hooks (why hooks mostly won)

> **The question:** "What's a render prop? Why don't we use them much any
> more? When would you still?" A good answer covers the history in one line,
> the concrete problems hooks solved, and the one job render props still do
> best.

Runnable demo: [`index.tsx`](./index.tsx) · the logic both ways:
[`pointer.tsx`](./pointer.tsx) · where render props still win:
[`HoverList.tsx`](./HoverList.tsx)

---

## 1. What a render prop is

A component that holds some logic and, instead of deciding what to show,
**calls a function you give it** with the result:

```tsx
<PointerTracker>
  {(pointer) => <p>{pointer.x}, {pointer.y}</p>}
</PointerTracker>
```

Before hooks (2019), components could only share *stateful logic* in two
ways: render props and [higher-order components](../HigherOrderComponents/HigherOrderComponents.md).
Hooks made both mostly unnecessary.

---

## 2. Same logic, both ways

```tsx
// Render props: each piece of logic adds a level.
<OnlineStatus>
  {(online) => (
    <PointerTracker>
      {(pointer) => <Box online={online} pointer={pointer} />}
    </PointerTracker>
  )}
</OnlineStatus>

// Hooks: flat.
const online = useIsOnline();
const pointer = usePointer(ref);
return <Box online={online} pointer={pointer} />;
```

Analogy: render props are asking a series of people to each pass you a note
through the next person's hands. Hooks are everyone handing their note
straight to you.

---

## 3. What hooks fixed

| Problem with render props | With hooks |
| --- | --- |
| **Nesting** — three pieces of logic, three levels of callbacks ("callback pyramid") | Three lines at the top of the component |
| **Values only exist inside the callback** — you can't use `pointer` in an effect or a handler outside the JSX without lifting it | Plain variables, usable anywhere in the component |
| **The logic component renders its own element** — `PointerTracker` must render a `<div>` to measure; you can't pick which element is tracked | The hook takes your `ref`; any element works |
| **Combining logic** — making one tracker depend on another's value means nesting in a specific order | `const b = useB(useA())` |
| **Extra components in the tree** — every render prop is another layer in DevTools | No extra components |

The demo's render-prop versions are built **on top of** the hooks — a render
prop is now just a thin wrapper around a hook, which shows which one is the
real unit of reuse.

---

## 4. Where render props still win

**When the component owns state *per item* and you draw each item:**

```tsx
<HoverList
  items={plans}
  renderItem={(plan, { isHovered }) => <Row plan={plan} highlighted={isHovered} />}
/>
```

`HoverList` tracks which row is hovered. The caller decides what a row looks
like, *given that state*. A hook can't easily do this: it would have to hand
back per-row event handlers ("prop getters" — `getItemProps(item)`), which
is a bigger API.

Real examples:
- **Virtual lists** — react-window's `rowComponent`, TanStack Virtual's items:
  the library decides *which* rows and *where*; you draw them.
- **Selects / comboboxes** — `renderOption(option, { isActive, isSelected })`.
- **Tables** — cell renderers.
- **Router / form libraries** — `<Field>{({ field, meta }) => …}</Field>` still
  appears, especially in Formik.

The rule: **share logic with a hook; let callers customise *rendering* of
your internals with a render prop.**

---

## 5. Pitfalls

1. **A new function every render** — `children={(x) => …}` is a new function
   each time, so a `memo`'d render-prop component always re-renders. Usually
   fine; if not, `useCallback` it.
2. **Hooks inside the render function** — the callback is not a component.
   `{(x) => { const [s] = useState() … }}` breaks the Rules of Hooks (it runs
   inside someone else's render, maybe conditionally). Make it a component.
3. **Hiding a slow render** — everything inside the callback re-renders with
   the logic component; keep the callback's output small.

---

## 6. Follow-ups to expect

| They ask | Short answer |
| --- | --- |
| "Render props vs `children` as a function?" | Same thing: `children` is just a prop. `render={…}` and `children={…}` are naming choices. |
| "Prop getters?" | A hook returning functions like `getInputProps()`, `getItemProps(item)` that return props to spread — Downshift's API. Hook-shaped, but gives per-item control like a render prop. |
| "Can a hook render UI?" | It can return JSX, but then it's a component in disguise and loses hooks' benefits. Return data and handlers; let components render. |
| "What about HOCs?" | The other pre-hooks pattern, with its own problems: [HigherOrderComponents](../HigherOrderComponents/HigherOrderComponents.md). |
| "Slots in other frameworks?" | Vue's scoped slots and Svelte's snippets are render props by another name. |

---

## 7. Scoring notes

- **Mid:** can define both; says "hooks are newer and cleaner".
- **Senior:** lists the concrete problems hooks solved (nesting, values
  trapped in callbacks, forced wrapper elements, composition), shows a render
  prop as a thin wrapper over a hook, keeps render props for per-item
  rendering (virtual lists, selects), and knows prop getters and the
  hooks-in-callback pitfall.
