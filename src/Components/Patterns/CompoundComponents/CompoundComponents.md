# Compound components (`Tabs.Root`, `Tabs.List`, `Tabs.Panel`)

> **The question:** "Design the API for a reusable Tabs component." Most
> first answers take an array: `<Tabs items={[{ label, content }]} />`. It
> works until someone needs a badge in a tab, a button next to the tab list,
> or a tab that only admins see. Compound components are the answer to
> "how do I give callers control of the layout without a prop for
> everything?"

Runnable demo: [`index.tsx`](./index.tsx) · component: [`Tabs.tsx`](./Tabs.tsx)

The behaviour (ARIA, roving tabindex, controlled/uncontrolled) is the same as
the Phase 2 build: [Tabs.md](../../MachineCoding/Tabs/Tabs.md). This page is
about the *API shape*.

---

## 1. Two APIs for the same component

```tsx
// Config API: the component decides the layout.
<Tabs items={[{ id: "inbox", label: "Inbox", content: … }, …]} />

// Compound API: the caller writes the layout; the parts cooperate.
<Tabs.Root defaultValue="inbox">
  <Tabs.List label="Mail">
    <Tabs.Tab value="inbox">Inbox <Badge>3</Badge></Tabs.Tab>
    {isAdmin && <Tabs.Tab value="audit">Audit</Tabs.Tab>}
  </Tabs.List>
  <MarkAllRead />                         {/* anything, anywhere */}
  <Tabs.Panel value="inbox">…</Tabs.Panel>
</Tabs.Root>
```

Analogy: a set menu versus a buffet. The set menu (config) is quick when it's
what you want. The buffet (compound) lets everyone build their own plate —
you just provide the dishes and the rules.

What the compound version gives the demo for free:
- **Any content in a tab** — a live unread badge.
- **Conditional tabs** — `{isAdmin && <Tabs.Tab …/>}`, no `hidden` flag in a
  config object.
- **Other elements in between** — the "Mark all read" button beside the list.
- **Styling and wrappers per part** without `tabClassName`, `panelStyle`,
  `renderTab`… props.

---

## 2. How it works: context, not cloning

```tsx
const TabsContext = createContext<{ selected; select; baseId } | null>(null);

function Root({ children, … }) { … return <TabsContext value={…}>{children}</TabsContext>; }
function Tab({ value }) { const { selected, select } = useTabs("Tab"); … }
```

- **Root owns the state** (controlled or uncontrolled) and puts it in context.
- **Each part reads the context** and works out its own state: a `Tab` is
  selected if `selected === value`; a `Panel` is hidden otherwise.
- **Matching is by `value`**, not position. Tabs and panels can be in any
  order, any depth, wrapped in anything.
- **`useTabs("Tab")` throws a clear error** outside a `Root`, instead of a
  null crash deep inside.
- **Exported as one object** (`Tabs.Root`, `Tabs.List`…), so the parts read as
  a family and import together. Radix and other libraries also export parts
  separately (`Root`, `List`) for tree-shaking.

### The old way: `React.Children` + `cloneElement`

Older compound components looped over direct children and injected props
(`cloneElement(child, { isSelected, onSelect })`). It breaks as soon as a
child is wrapped in a `<div>`, a fragment, or a custom component — the
parent can only see its direct children. Context reaches any depth. Mention
it as legacy; don't build it.

---

## 3. Keyboard order without knowing the children

Arrow keys need "the next tab". With compound parts, the `List` doesn't know
its tabs — they could be wrapped, conditional, or in another component. So
it asks the DOM at key-press time:

```ts
const tabs = [...listElement.querySelectorAll('[role="tab"]:not([disabled])')];
```

That's the order the user sees, skipping disabled tabs, and it updates itself
when the admin tab appears. Libraries do the same with a small "collection"
that each part registers into; querying the DOM is the short version.

---

## 4. Edge cases

- **The selected tab disappears** (untick Admin while on "Audit log"): every
  panel is hidden. Decide a rule: fall back to the first tab, or keep the
  value and show nothing. The demo leaves it, so you can see the problem.
- **A `Panel` with no matching `Tab`** (or the reverse) — no error by default.
  A dev-only warning would help.
- **Nested Tabs** — each `Root` provides its own context, so inner parts read
  the nearest one. Works naturally.
- **Re-renders** — the context value is a new object each render, so every
  part re-renders when `Root` does. For tabs, that's a handful of buttons;
  fine. For big compound components, `useMemo` the value or split it.

---

## 5. When not to use it

- **Simple, fixed layouts** used in one way — a config prop is shorter to
  call and harder to misuse.
- **Data-driven lists** (tabs from an API) — callers will `.map` anyway; a
  compound API still works, but a config API is equally clear.
- **Strict designs** where you *don't* want callers rearranging parts.

Many libraries offer both: compound parts, plus a convenience component built
from them.

---

## 6. Follow-ups to expect

| They ask | Short answer |
| --- | --- |
| "Other examples?" | `<select>`/`<option>` (the native one), Accordion, Menu, Select, Dialog (`Trigger`, `Content`, `Close`), Card (`Header`, `Body`). |
| "TypeScript for `Tabs.Tab`?" | An object of components (as here) types itself. For `Object.assign(Root, { List, Tab })`, the result is typed as the intersection. |
| "Controlled?" | `value` + `onValueChange` on `Root`, like any controlled component ([ControlledUncontrolled](../ControlledUncontrolled/ControlledUncontrolled.md)). |
| "How does Radix handle ids and ARIA?" | Same idea: `Root` creates ids, parts link themselves with `aria-controls` / `aria-labelledby`. |
| "`asChild`?" | Lets a part render *your* element instead of its own (`<Tabs.Tab asChild><Link/></Tabs.Tab>`) by merging props onto the child. Alternative to the `as` prop ([Polymorphic](../Polymorphic/Polymorphic.md)). |

---

## 7. Scoring notes

- **Mid:** config-array Tabs; adds props for each new layout request.
- **Senior:** compound parts sharing state through context, matched by value,
  with a helpful error outside the root; knows why `cloneElement` was
  replaced; handles keyboard order without owning the children; names edge
  cases (vanished selection, mismatched parts); and knows when the simpler
  config API is better.
