# Accordion (single-open and multi-open)

> **The prompt:** "Build an accordion. Clicking a header opens its section.
> Support a mode where only one section can be open, and one where many can."
>
> The toggle is a two-minute job. What gets marked is the state shape (one
> model for both modes), the ARIA wiring, and knowing that the platform
> already has one.

Runnable demo: [`index.tsx`](./index.tsx) · component:
[`Accordion.tsx`](./Accordion.tsx)

---

## 1. Clarify before you code

| Question | Why it changes your code |
| --- | --- |
| Single-open, multi-open, or a prop for both? | Decides the state shape — see section 2. |
| In single-open, can you close the open one (all closed)? | Usually yes. If no, clicking the open header does nothing. |
| Should closed content stay in the DOM? | Hiding keeps form input and scroll; unmounting saves work for heavy content. |
| Controlled from outside (e.g. "open the section in the URL hash")? | Add `openIds` + `onChange` props. See the [Tabs](../Tabs/Tabs.md) writeup for the pattern. |
| Animate open and close? | Height animation is the hard part — section 6. |

---

## 2. One state shape for both modes

```ts
const [openIds, setOpenIds] = useState(() => new Set(defaultOpenIds));
```

- **Multi-open:** add or remove the id.
- **Single-open:** replace the whole Set with `new Set([id])`, or an empty Set
  to close.

A common first draft is `openIndex: number | null` for single mode and
`boolean[]` for multi mode — two models, two sets of bugs, and switching
modes needs a conversion. A Set of ids is both, and keys on **id**, not
position, so reordering or filtering the items doesn't open the wrong one.

Analogy: a radio group versus checkboxes. Same row of options, one rule
different: does picking one clear the others?

### Don't mutate the Set

```ts
prev.add(id);      // ❌ same object back — React compares with Object.is and skips the render
return prev;

const next = new Set(prev); next.add(id); return next;  // ✅
```

This is the classic bug when state is a Set or Map. Nothing errors; the
header just doesn't open.

---

## 3. The ARIA wiring

```html
<h3>
  <button id="h1" aria-expanded="true" aria-controls="p1">Refunds</button>
</h3>
<div id="p1" role="region" aria-labelledby="h1">…</div>
```

- **A real `<button>`** — Tab, Enter and Space work for free.
- **`aria-expanded`** tells a screen reader whether it's open. The `+`/`−`
  icon is `aria-hidden`; it's decoration.
- **Inside a heading**, so screen-reader users can jump between sections the
  same way they jump between headings anywhere else.
- **`aria-controls` / `aria-labelledby`** link header and panel both ways.
  Ids come from `useId()` so two accordions on one page don't clash.
- **The panel stays in the DOM with `hidden`.** `aria-controls` must point at
  an element that exists, and anything typed inside survives closing (the
  demo's second section shows this).

**Arrow keys** (Up/Down between headers, Home/End to the ends) are optional in
the ARIA pattern. Adding them takes a ref array and one key map, and it reads
well in an interview.

---

## 4. The native version: `<details name>`

```html
<details name="faq"><summary>Refunds</summary>…</details>
<details name="faq"><summary>Cancel</summary>…</details>
```

`<details>` is already an accordion section: keyboard, screen-reader state,
open/close, no JavaScript. Giving several the same **`name`** makes them
exclusive — opening one closes the others — supported in current Chrome,
Safari and Firefox. Chrome also opens a closed `<details>` when find-in-page
(Ctrl+F) matches text inside it, which a `hidden` div can't do.

When to still build it yourself: the interviewer asks you to (they usually
do — that's the exercise), you need the arrow keys, or you need to control
it from outside. Say the native option out loud first; it's the senior answer
to "what would you ship?"

---

## 5. Pitfalls

1. **Keying by index.** `openIndex = 2` breaks the moment the list is sorted
   or filtered. Key by id.
2. **A `<div onClick>` header.** No focus, no Enter/Space, no role. Use a
   button.
3. **`display: none` via a class, and forgetting `aria-expanded`.** It looks
   right; a screen reader hears a button with no state.
4. **Unmounting closed panels by default** (`{isOpen && <Panel/>}`). Loses
   anything typed, and `aria-controls` then points at nothing. Fine as an
   opt-in for heavy content.
5. **Two ids from a counter or `Math.random()`.** Breaks with SSR and with two
   accordions. `useId()`.

---

## 6. Follow-ups to expect

| They ask | Short answer |
| --- | --- |
| "Animate the height." | `height: auto` can't be transitioned. Old trick: grid rows `0fr` → `1fr` with `transition: grid-template-rows`. Newer: `interpolate-size: allow-keywords` (Chrome only so far). Or measure `scrollHeight` and set a pixel height. |
| "Lazy-render heavy panels." | Mount on first open, then keep it: track a "has ever opened" Set alongside `openIds`. |
| "Make it controlled." | `openIds` and `onOpenChange` props; use them when given, else internal state. Same pattern as [Tabs](../Tabs/Tabs.md). |
| "Compound API: `<Accordion.Item>`, `<Accordion.Header>`…" | Context holds `openIds` + `toggle`; each item reads it. Phase 5 covers compound components. |
| "Deep-link: open the section in `#hash`." | Read `location.hash` into the initial Set; `scrollIntoView` it after mount. |

---

## 7. Scoring notes

- **Mid:** works in one mode with `openIndex` state and div headers.
- **Senior:** one id-keyed Set for both modes, no mutation, button-in-heading
  with `aria-expanded`/`aria-controls`, `useId`, panels kept in the DOM with
  `hidden`, arrow keys, and mentions `<details name>` as the zero-JS option.
