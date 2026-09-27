# Autocomplete / typeahead with keyboard navigation

> **The prompt:** "Build an autocomplete. Suggestions appear as you type, and
> the user can pick one with the keyboard."
>
> Most of the marks here are not in the fetching — that's the previous
> question, reused untouched. They are in the two things candidates
> consistently get wrong: where focus lives, and why clicking a suggestion
> doesn't work.

Runnable demo: [`Typeahead.tsx`](./Typeahead.tsx) · state machine:
[`useCombobox.ts`](./useCombobox.ts)

Reused as-is: [`useSearch`](../DebouncedSearch/useSearch.ts) (debounce +
`AbortController`), [`useDebounce`](../../Hooks/useDebounce/useDebounce.ts),
[`useOnClickOutside`](../../Hooks/useOnClickOutside/useOnClickOutside.ts).

---

## 1. Clarify before you code

| Question | Why it changes your code |
| --- | --- |
| Must the user pick from the list, or can they submit free text? | Decides whether Enter-with-nothing-highlighted submits or is swallowed. |
| Single select or multi (tags)? | Multi needs chips, backspace-to-remove, and a different `aria-multiselectable` story. |
| Should it filter locally or hit the server? | Local means no debounce and no race. Server means everything from the previous question. |
| Is there a "no results" state, or do we hide the list? | Affects `aria-expanded`, which must not claim a listbox exists when it doesn't. |
| Do we need to highlight the matched substring? | Cheap to add, but watch out for injecting HTML. |

---

## 2. Focus stays in the input. This is the whole trick.

The instinct is to move focus onto the highlighted `<li>` as the user arrows
down. That is how menus work, and it is wrong here — because the user has to
be able to keep **typing**. Move focus to a list item and the next keystroke
goes to the list, not the input.

So a combobox uses a different mechanism:

```tsx
<input
  role="combobox"
  aria-expanded={showList}
  aria-controls={listboxId}
  aria-autocomplete="list"
  aria-activedescendant={activeIndex >= 0 ? optionId(activeIndex) : undefined}
/>
```

`aria-activedescendant` tells assistive tech "the DOM focus is on this input,
but the *active* thing is the element with that id". Focus never moves; the
screen reader still announces each option as you arrow through them.

The analogy: it's a TV remote. Your hand stays on the remote the whole time —
the highlight moves around on the screen. Nobody expects to pick up the
television to change channel.

**Roving `tabindex` is the other pattern** — actually moving focus, used for
toolbars, tabs, and menus where there is nothing to type into. Knowing which
of the two applies, and why, is the a11y question being asked here.

Consequences worth stating out loud:

- Options need real, stable `id`s, because `aria-activedescendant` points at
  one. The demo derives them from `useId`, so they're unique per instance and
  SSR-safe.
- Options must **not** have `tabindex`. They are never focused.
- `scrollIntoView({ block: "nearest" })` keeps the highlighted option visible.
  `block: "nearest"` matters — the default `"start"` will jerk the whole page.

---

## 3. The blur-before-click bug

Nearly everyone writes this first:

```tsx
<input onBlur={() => setOpen(false)} />
```

Then clicking a suggestion does nothing, and the list just closes. The reason
is event order: `mousedown` → `blur` → `mouseup` → `click`. Blur fires *before*
the click, so the list unmounts and there is nothing left to receive the click.

Three ways out, in increasing order of how good they look in an interview:

1. `setTimeout(() => setOpen(false), 150)` in the blur handler. Works. It is a
   race dressed as a fix, and reviewers will say so.
2. `onMouseDown={(e) => e.preventDefault()}` on each option. Cancelling the
   default mousedown means the input never loses focus, so blur never fires
   and the click lands normally. Cheap and correct.
3. Don't use blur at all. Close on a **pointerdown outside the component**
   instead, which is what "dismiss this popup" actually means.

The demo does 2 and 3 together: `useOnClickOutside` (already a `pointerdown`
listener on `document`) handles dismissal, and `preventDefault` on the option's
mousedown keeps the caret in the input so the user can carry on typing after
picking.

---

## 4. The keyboard contract

From the WAI-ARIA Authoring Practices, and what an interviewer will actually
tab through:

| Key | Behaviour |
| --- | --- |
| `ArrowDown` | Closed → open the list. Open → move down, wrapping to the top. |
| `ArrowUp` | Closed → open. Open → move up, wrapping to the bottom. |
| `Home` / `End` | Jump to first / last option. |
| `Enter` | Pick the highlighted option. **Nothing highlighted → let it through**, so a surrounding form can still submit. |
| `Escape` | First press closes the list. Second press clears the input. |
| `Tab` | Close and move on. Never trap focus. |

Two that get missed:

**Two-stage Escape.** Close, then clear. It is in the spec and it is what users
expect from a browser address bar.

**`Enter` must not always be swallowed.** If the user typed free text and no
option is highlighted, calling `preventDefault()` breaks form submission. The
demo returns early in that case rather than blocking the key.

---

## 5. Reset the highlight when results change

```ts
useEffect(() => { setActiveIndex(-1); }, [items]);
```

Without this, the user arrows to item 3, types another character, and a new
result set arrives — but index 3 still looks highlighted, now pointing at
something completely unrelated. Press Enter and you select a thing you never
looked at.

This is the one genuine state bug in this question, and it is easy to miss
because it only shows up if you keep typing *after* arrowing.

---

## 6. IME composition

```ts
if (event.nativeEvent.isComposing) return;
```

When typing Japanese, Chinese or Korean, an IME candidate window is open and
`Enter` means "commit the word I am composing" — not "pick the highlighted
option". Without this guard, the component hijacks the keystroke and the user
cannot type their own language into your search box.

React exposes `isComposing` on the native event. Mentioning this unprompted is
a strong signal; it's the kind of bug that only surfaces in a support ticket
from a market you don't test in.

---

## 7. Follow-ups to expect

| They ask | Short answer |
| --- | --- |
| "How do you highlight the matched substring?" | Split the string on the match and render `<mark>` around the middle piece. Never `dangerouslySetInnerHTML` with a user-supplied query — that's an XSS hole. |
| "What if the list is thousands of items?" | Virtualise it. But `aria-activedescendant` needs the active option in the DOM, so the windowing must always render the highlighted index. |
| "Async results arriving out of order?" | Already handled — `useSearch` aborts the stale request. See the previous question. |
| "How would you make this reusable?" | Hand back state + prop getters (`getInputProps`, `getOptionProps`) instead of markup. That's the Downshift/headless approach, and it's the compound-components question in Phase 5. |
| "How do you test the keyboard?" | `user-event` for real key sequences, then assert on `aria-activedescendant` rather than on classnames — you're testing what a screen reader would read. |
| "Mobile?" | The virtual keyboard covers the list; anchor it above the input when there's no room. Arrow keys don't exist, so tap targets need to be big enough. |

---

## 8. Scoring notes

- **Mid:** renders suggestions, wires arrow keys and Enter, closes on blur.
  Ships the blur-before-click bug, moves focus to the list items, no
  `aria-activedescendant`.
- **Senior:** keeps focus in the input and explains why, uses the combobox
  ARIA triplet correctly, doesn't claim `aria-expanded` when there's no
  listbox, resets the highlight when results change, and lets Enter through
  when nothing is selected.
