# Modal / Dialog via `createPortal`

> **The prompt:** "Build a reusable modal. It should close on Escape and on a
> backdrop click, keep keyboard focus inside, and stop the page scrolling."
>
> Showing a box over the page is easy. The question is a checklist of six
> behaviours, and interviewers tick them off one by one: portal, focus in,
> focus trap, focus back, Escape, scroll lock.

Runnable demo: [`index.tsx`](./index.tsx) · component: [`Modal.tsx`](./Modal.tsx)

---

## 1. Clarify before you code

| Question | Why it changes your code |
| --- | --- |
| Can it be nested (a confirm inside a modal)? | Escape and scroll lock must handle a stack (section 5). |
| Does a backdrop click close it? | Usually yes; never for "you have unsaved changes" or payment steps. |
| Which element gets focus on open? | First field for forms; the safe button ("Cancel") for destructive confirms. |
| Can we use `<dialog>`? | It does most of this list for free — section 6. |
| Animate in and out? | Out-animation means staying mounted after `isOpen` goes false. |

---

## 2. Why a portal

```tsx
isOpen ? createPortal(<ModalContent … />, document.body) : null
```

A modal rendered where it's used sits inside its parent's box. Any ancestor
with `overflow: hidden` clips it, and any ancestor with `transform`, `filter`
or its own `z-index` stacking context traps it — `z-index: 9999` can't climb
out. Portaling to `body` takes it out of that DOM tree.

Analogy: a notice pinned inside a cupboard can't be seen however big you make
it. Pin it on the front door instead. The portal moves *where it's pinned*,
not *who wrote it*.

That last part matters: **in React, a portal stays in its parent's tree.**
Context still flows in, and **events still bubble to React parents** — through
the portal. That's the root of the nested-modal bug in section 5.

### Mount only while open

The content is a separate `ModalContent` that mounts when `isOpen` turns true.
Every effect is then "on open" and its cleanup is "on close" — no
`if (!isOpen) return` inside each effect.

---

## 3. Focus: in, trapped, and back

1. **In.** On open, focus the first focusable element (or the dialog itself,
   with `tabIndex={-1}`). Otherwise focus stays on the button behind the
   overlay and a screen reader doesn't know a dialog appeared.
2. **Trapped.** On Tab from the last element, go to the first; Shift+Tab from
   the first goes to the last. Without this, Tab walks into the page behind.
3. **Back.** Save `document.activeElement` on open and `.focus()` it in the
   cleanup. Keyboard users land back on "Rename project", not at the top of
   the page.

Analogy: a receptionist taking you into a meeting room. They walk you in,
the door is shut while you're there, and they walk you back to where you
were sitting — not to the building entrance.

The stronger version of the trap is **`inert`** on everything outside the
dialog (`appRoot.inert = true`): the browser then blocks focus, clicks and
screen-reader access behind the dialog. The Tab-wrap code is what
interviewers expect you to write; mention `inert` as what you'd add.

---

## 4. Escape, backdrop, scroll lock

- **Escape** on the dialog's `onKeyDown` → `onClose()`.
- **Backdrop click uses `onMouseDown`**, and only when the press starts on the
  backdrop itself (`target === currentTarget`). With `onClick`, selecting text
  in an input and releasing the mouse outside the dialog fires a click on the
  backdrop — and the modal closes in the user's face.
- **Scroll lock**: `body.style.overflow = "hidden"`, then:
  - **Restore the old value**, not `""`. With two modals open, closing the
    top one must leave `hidden` in place for the one below.
  - **Pad by the scrollbar width.** Hiding the scrollbar widens the page and
    everything jumps sideways. `innerWidth - documentElement.clientWidth` is
    the scrollbar's width. (CSS `scrollbar-gutter: stable` on `html` is the
    no-JS fix.)
  - iOS Safari historically ignored `overflow: hidden` on body; libraries use
    `position: fixed` on body plus saving `scrollY`. Worth one sentence.

---

## 5. The nested-modal bug

The confirm dialog is rendered inside the edit modal's JSX and portaled to
`body`. In the DOM they're siblings. In React, the confirm is a **child** of
the edit modal. So Escape in the confirm:

1. fires the confirm's `onKeyDown` → closes the confirm, then
2. **bubbles to the edit modal's `onKeyDown`** → closes that too.

One Escape, both gone. Same for Tab: the outer modal's trap would run on the
inner modal's keys. Fix: `event.stopPropagation()` once a modal has handled
the key. The demo shows it working — Escape twice closes them one at a time.

This is a good one to bring up unprompted: it shows you know portals move the
DOM, not the React tree.

---

## 6. The native option: `<dialog>.showModal()`

`showModal()` gives you, with no code:

- the **top layer** — above everything, no portal or `z-index` needed;
- the rest of the page made **inert** — a real focus trap, including for
  screen readers;
- **Escape** closes it; `<form method="dialog">` buttons close it;
- focus moves in, and returns on close;
- a `::backdrop` pseudo-element to style.

Not included: scroll lock (CSS: `body:has(dialog[open]) { overflow: hidden }`)
and backdrop-click-to-close (a click on the `<dialog>` element itself whose
coordinates fall outside its box). In React you also call `showModal()` from
an effect or handler, and sync `open` state from its `close` event.

Senior answer: "In production I'd use `<dialog>`; here's the portal version
so you can see each piece." Build what they ask, name the better tool.

---

## 7. Follow-ups to expect

| They ask | Short answer |
| --- | --- |
| "Make it a `useModal()` / imperative `modal.open()` API." | A provider renders a stack of modals from context state; `open()` pushes, `close()` pops. Same pieces inside. |
| "Animate open and close." | Open: CSS keyframes. Close: keep it mounted while animating out — `isClosing` state, unmount on `animationend`. Native `<dialog>`: `@starting-style` and `transition-behavior: allow-discrete`. |
| "Return focus to something else (the deleted row is gone)." | Accept a `returnFocusRef` prop; fall back to the opener if it's still in the document (`isConnected`). |
| "Screen-reader text for the dialog." | `aria-labelledby` the title (done) and `aria-describedby` the body text for confirms. |
| "Server-side rendering." | `document.body` doesn't exist on the server. Only portal after mount, or render nothing while `typeof document === "undefined"`. |
| "Many modals: why not one `z-index`?" | A stack rendered in order, or native top layer, which orders by open time. |

---

## 8. Scoring notes

- **Mid:** an overlay with a close button and Escape; often no portal, no focus
  handling, scroll still works behind it.
- **Senior:** portal with the reason, focus in / trap / back, Escape with
  `stopPropagation` for nesting, `onMouseDown` backdrop, scroll lock that
  restores and pads, `role="dialog"` + `aria-modal` + `aria-labelledby`, and
  names `<dialog>` and `inert` as the native answers.
