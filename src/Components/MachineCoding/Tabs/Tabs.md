# Tabs (controlled + uncontrolled)

> **The prompt:** "Build a Tabs component. It should work on its own, and also
> let the parent control which tab is open."
>
> The interesting part isn't the tabs. It's the **controlled vs uncontrolled**
> contract — the same one `<input value>` and `<input defaultValue>` follow —
> plus the keyboard model, which is different from most widgets.

Runnable demo: [`index.tsx`](./index.tsx) · component: [`Tabs.tsx`](./Tabs.tsx)

---

## 1. Clarify before you code

| Question | Why it changes your code |
| --- | --- |
| Who owns the selected tab — the component, the parent, or either? | "Either" means supporting both modes (section 2). |
| Should the selected tab be in the URL? | Then the parent controls it from the router — a strong reason for controlled mode. |
| Keep inactive panels mounted? | Mounted keeps form state; unmounting saves work. |
| Do arrow keys select straight away, or only move focus? | Automatic vs manual activation (section 4). Manual if a panel is slow to load. |
| Many tabs — overflow? | Scroll the tab list, or collapse extras into a "More" menu. |

---

## 2. Controlled vs uncontrolled

```ts
const [internalValue, setInternalValue] = useState(defaultValue ?? tabs[0]?.id);
const isControlled = value !== undefined;
const selectedId = isControlled ? value : internalValue;

const select = (id: string) => {
  if (!isControlled) setInternalValue(id);
  onChange?.(id);
};
```

- **Uncontrolled** (`defaultValue`): the component keeps its own state. The
  parent sets the start and is told about changes.
- **Controlled** (`value`): the component keeps **no** state. Clicking a tab
  calls `onChange` — a *request*. Nothing changes until the parent passes a
  new `value`.

Analogy: a thermostat. Uncontrolled is a room with its own dial — you set it
once and walk away. Controlled is a room run by the building's system — the
dial on the wall only sends a request, and the building decides.

Why controlled matters, shown in the demo:
- **Change it from outside** ("Open Billing" button, a URL, a wizard's Next).
- **Refuse a change** — unsaved changes on Profile block leaving it. An
  uncontrolled component can't be stopped; it has already switched.

### Details that get marked

- **Decide the mode by `value !== undefined`**, not by truthiness — `""` or
  `0` are valid values.
- **Don't copy `value` into state** (`useState(value)` + an effect to sync).
  That's two sources of truth that drift. Read `value` directly when it's
  given.
- **Don't switch modes mid-life.** Going from `undefined` to a value is the
  "changing an uncontrolled input to be controlled" warning React gives for
  inputs. A real library would warn in development; worth saying.
- **`onChange` fires in both modes**, so analytics or URL syncing works either
  way.

---

## 3. The ARIA wiring

```html
<div role="tablist" aria-label="Settings">
  <button role="tab" aria-selected="true" aria-controls="p1" id="t1" tabindex="0">Profile</button>
  <button role="tab" aria-selected="false" aria-controls="p2" id="t2" tabindex="-1">Billing</button>
</div>
<div role="tabpanel" id="p1" aria-labelledby="t1" tabindex="0">…</div>
```

- **`aria-label` on the tablist** names the group ("Settings tabs").
- **`aria-selected`** on each tab, not a CSS class alone.
- **Panels link back** with `aria-labelledby`; ids from `useId()`.
- **`tabIndex={0}` on the panel** so keyboard users can reach a panel that has
  nothing focusable in it.

---

## 4. Keyboard: roving tabindex

Tabs are **one** stop in the Tab order, not one per tab:

- Only the selected tab has `tabIndex={0}`; the rest `-1`.
- **Left/Right** move between tabs (wrapping), **Home/End** jump to the ends.
- **Tab** leaves the tab list and goes into the panel.

Analogy: a TV remote. You don't Tab past every channel to reach the volume
button; the channel buttons are one group, and you move within it with the
arrows.

**Automatic activation** (built here): arrowing to a tab selects it. Right for
panels that are already rendered. **Manual activation**: arrows only move
focus, Enter/Space selects. Use it when switching is slow (a fetch per tab),
so arrowing past three tabs doesn't fire three requests.

One edge in the controlled demo: if the parent vetoes a change, focus has
moved to a tab that isn't selected. That's acceptable — and it's exactly the
case where manual activation reads better.

---

## 5. Pitfalls

1. **Every tab in the Tab order.** Keyboard users press Tab ten times to get
   past a tab bar. Roving tabindex.
2. **Tabs as links (`<a href>`) with `role="tab"`.** If each "tab" is really a
   page, it's navigation, not tabs — use a `<nav>` with links and
   `aria-current="page"`.
3. **`{selected && <Panel/>}`** unmounts the others — a half-filled form on
   another tab is lost. Keep them with `hidden` unless they're heavy.
4. **Selected tab stored by index.** Tabs that load from data get reordered;
   key by id.
5. **Syncing a prop into state with an effect.** One render late, and easy to
   loop. Derive instead.

---

## 6. Follow-ups to expect

| They ask | Short answer |
| --- | --- |
| "Sync the tab with the URL." | Controlled mode: `value` from `useSearchParams`, `onChange` sets it. Back/forward then switch tabs for free. |
| "Make a reusable hook for controlled/uncontrolled." | `useControllableState(value, defaultValue, onChange)` returning `[state, setState]` — the logic in section 2, extracted. Radix and MUI ship exactly this. |
| "Compound API: `<Tabs.List>`, `<Tabs.Tab>`, `<Tabs.Panel>`." | Context holds `selectedId` and `select`; children read it. Phase 5. |
| "Lazy panels." | Mount on first visit, keep after: a "visited" Set. |
| "Animated underline." | One absolutely positioned bar; measure the selected tab's `offsetLeft`/`offsetWidth` in a layout effect and transition `transform`. |
| "Vertical tabs." | `aria-orientation="vertical"`, and Up/Down instead of Left/Right. |

---

## 7. Scoring notes

- **Mid:** clickable tabs with `useState(index)`; may hard-code one mode.
- **Senior:** clean controlled/uncontrolled contract with no copied state,
  shows *why* controlled exists (outside changes, veto), full tablist ARIA,
  roving tabindex with arrows/Home/End, and can explain automatic vs manual
  activation.
