# Portals beyond modals (tooltips, dropdowns)

> **The question:** "Your dropdown menu gets cut off inside a scrolling
> table / a card with `overflow: hidden`. Fix it." Then: "Clicking a menu
> item also triggers the row's click handler. Why?"
>
> Portals solve the first problem and *cause* the second. Positioning,
> following scroll, click-outside and accessibility are the rest of the job.

Runnable demo: [`index.tsx`](./index.tsx) · tooltip: [`Tooltip.tsx`](./Tooltip.tsx) ·
menu: [`Menu.tsx`](./Menu.tsx) · positioning: [`useAnchorPosition.ts`](./useAnchorPosition.ts)

Portal basics and the modal case: [Modal.md](../../MachineCoding/Modal/Modal.md#2-why-a-portal).

---

## 1. Why floating UI gets cut off

A tooltip or menu rendered next to its button lives inside the button's
ancestors. If any ancestor has:
- `overflow: hidden` / `auto` — the floating element is **clipped** to it;
- `transform`, `filter`, `will-change`, or its own `z-index` stacking context —
  `z-index: 9999` can't lift it above things outside that ancestor.

Tick and untick "Render the tooltip in a portal" in the demo: without it, the
tooltip is cut off by the card.

`createPortal(tip, document.body)` puts the element's DOM at the end of
`<body>`, outside every ancestor. Analogy (same as for modals): a notice
pinned inside a cupboard is hidden however big it is; pin it on the front
door instead.

---

## 2. The cost: you position it yourself

Once it's in `<body>`, CSS can't place it "under the button" any more. So:

```ts
const anchor = button.getBoundingClientRect();
const top = placement === "top" ? anchor.top - tip.height - GAP : anchor.bottom + GAP;
const left = clamp(anchor.left + anchor.width / 2 - tip.width / 2, 8, innerWidth - tip.width - 8);
// position: fixed; top; left
```

What [`useAnchorPosition`](./useAnchorPosition.ts) handles:
- **Measure in `useLayoutEffect`**, before paint — and render the element
  hidden (`visibility: hidden`) until placed — so it never flashes at 0,0.
- **Flip** to the other side when there isn't room (a tooltip near the top
  of the screen opens below).
- **Shift** to stay on screen sideways.
- **Follow the anchor**: listen to `scroll` with **`capture: true`** (catches
  scrolling in *any* container, which doesn't bubble) and `resize`. Scroll
  the demo's invoice list with a menu open — the menu follows its button.

In production, use **Floating UI** (`@floating-ui/react`) — it does all of
this plus arrows, `autoUpdate` with `ResizeObserver`, and collision rules.
Writing it once by hand is how you understand what it does.

---

## 3. The bubbling surprise

```tsx
<div onClick={openInvoice}>              {/* card */}
  <Menu>                                  {/* items portaled to <body> */}
    <button onClick={download}>Download</button>
```

In the **DOM**, the menu item is in `<body>`, nowhere near the card. In
**React**, it's still the card's child — and **React events bubble through
the React tree**. So clicking "Download" runs `download` *and then*
`openInvoice`. Untick "Stop clicks from bubbling" in the demo and watch the
log: every menu action also opens the card.

Fix: `e.stopPropagation()` on the menu (and on the trigger button), or check
`e.target` in the card's handler. This is the classic portal interview
question — it shows you know a portal moves the DOM, not the component tree.
Context also flows through portals for the same reason (a portaled menu can
read the card's theme).

### Click-outside, the other way round

A normal click-outside check is "is the target inside my element?". With a
portal, the menu isn't inside the trigger's DOM, so a click on a menu item
looks "outside". Check **both** elements:

```ts
if (!button.contains(target) && !menu.contains(target)) close();
```

---

## 4. Accessibility

**Tooltip:**
- Trigger gets `aria-describedby` → tooltip (`role="tooltip"`): screen readers
  read it as a description after the button's name.
- Show on **hover and on keyboard focus**; hide on blur.
- WCAG 1.4.13 (content on hover or focus): it must be **dismissable** (Escape
  without moving focus), **hoverable** (you can move the pointer onto it —
  hence the short hide delay), and **persistent** (stays until you leave).
- Never put interactive content (links, buttons) in a tooltip — use a
  popover or dialog.

**Menu:**
- Trigger: `aria-haspopup="menu"`, `aria-expanded`.
- Focus moves into the menu on open; arrows move between items; Escape closes
  and **returns focus to the trigger**.
- A portaled menu sits at the end of `<body>`, so Tab order goes from the
  trigger to… the end of the page. Moving focus in on open (and back on close)
  fixes the order for keyboard users.

---

## 5. The native future: popover and anchor positioning

```html
<button popovertarget="tip">Info</button>
<div id="tip" popover>…</div>
```

- **`popover`** (supported in current browsers) puts the element in the
  **top layer** — above all `overflow` and `z-index`, no portal needed — with
  light dismiss (click outside, Escape) built in. The demo's third card uses
  it.
- **CSS anchor positioning** (`anchor-name`, `position-anchor`,
  `position-try` for flipping) places it next to its button in pure CSS.
  Chromium has it; check support before relying on it.

Together they replace most of this page's JavaScript. Until anchor
positioning is everywhere: `popover` for layering + Floating UI for position
is a good middle ground.

---

## 6. Follow-ups to expect

| They ask | Short answer |
| --- | --- |
| "Server rendering?" | `document.body` doesn't exist on the server: render the portal only after mount. |
| "Portal into a specific container?" | `createPortal(node, container)` — any DOM node, e.g. a `#overlays` div, or a shadow root. |
| "Nested menus?" | Each submenu portals too; click-outside must treat the whole chain as "inside" (track open menus in a stack). |
| "Tooltip on a disabled button?" | Disabled buttons don't fire pointer events or get focus. Wrap it, or use `aria-disabled` instead of `disabled`. |
| "Performance with many tooltips?" | Render the floating part only while open (done here), so a table of 500 info icons mounts 500 small triggers, not 500 tooltips. |

---

## 7. Scoring notes

- **Mid:** portals the menu to fix clipping; positions it once on open.
- **Senior:** explains clipping and stacking contexts; positions before paint
  with flip, shift and scroll-following (capture listener); handles React-tree
  bubbling through portals and two-element click-outside; tooltip and menu
  ARIA with focus management and WCAG 1.4.13; and knows `popover` / anchor
  positioning and Floating UI.
