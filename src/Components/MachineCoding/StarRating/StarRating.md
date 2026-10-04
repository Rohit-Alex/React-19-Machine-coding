# Star rating

> **The prompt:** "Build a 5-star rating. Hovering previews, clicking sets.
> Also show an average like 3.7."
>
> Everyone can colour five stars. The senior move is spotting what it *is* —
> a radio group — and getting keyboard and screen-reader support for free
> instead of rebuilding it.

Runnable demo: [`index.tsx`](./index.tsx) · components:
[`StarRating.tsx`](./StarRating.tsx) · styles: [`StarRating.css`](./StarRating.css)

---

## 1. Clarify before you code

| Question | Why it changes your code |
| --- | --- |
| Input, display, or both? | Two different components: an input you pick, and a read-only fractional display. |
| Half stars when picking? | Ten radios (0.5 steps) with each star split into two hit areas. |
| Can the user clear a rating? | Radios can't be unchecked by clicking; needs a "Clear" button or a click handler on the checked star. |
| Max other than 5? | A `max` prop; nothing else changes. |
| Part of a form? | Radios with a `name` submit with the form natively. |

---

## 2. It's a radio group

"Choose exactly one of five" is the definition of a radio group. So:

```tsx
<fieldset>
  <legend>Your rating</legend>
  <label>
    <input type="radio" name={name} value={1} className="visually-hidden" />
    <span aria-hidden="true">★</span>
    <span className="visually-hidden">1 star</span>
  </label>
  …
</fieldset>
```

What the browser does for you:
- **Tab** reaches the group as **one** stop; **arrow keys** move and select.
- A screen reader says "Your rating, group. 3 stars, radio button, checked,
  3 of 5".
- It works inside a `<form>` with no extra code.

The radios are visually hidden (not `display: none`, which would remove them
from keyboard and screen readers). The star glyph is `aria-hidden` — "black
star" five times helps no one — and a hidden "3 stars" text is the label.

Analogy: a dimmer switch with five notches. You could build it from scratch
with wires and springs, or use the standard switch and put a nice knob on it.
The stars are the knob.

The DIY alternative is `role="radiogroup"` on a div, `role="radio"` +
`aria-checked` on each star, roving `tabIndex`, and arrow-key handling — the
same keyboard model as [Tabs](../Tabs/Tabs.md#4-keyboard-roving-tabindex). It's fine
if they insist on divs; it's about 30 lines you didn't need.

---

## 3. Hover preview without touching the value

```ts
const [hoverValue, setHoverValue] = useState(0);
const shown = hoverValue || value;     // star n is gold if n <= shown
```

- `onMouseEnter` on each star sets `hoverValue`; `onMouseLeave` on the
  **group** (not each star) clears it, so moving between stars doesn't
  flicker through "no hover".
- The real `value` changes only on select.

Common bug: setting the value on hover and "restoring" on leave. Then a fast
mouse-out that skips `mouseleave`, or a touch screen (which fires
`mouseenter` on tap), leaves the wrong value saved.

---

## 4. Fractional display: two layers and a clip

```tsx
<span role="img" aria-label="3.7 out of 5 stars" style={{ position: "relative" }}>
  <span aria-hidden>★★★★★</span>                        {/* grey */}
  <span aria-hidden style={{ position: "absolute", inset: 0,
    width: "74%", overflow: "hidden", whiteSpace: "nowrap" }}>★★★★★</span>  {/* gold */}
</span>
```

The gold row sits on the grey row and is cut to `value / max` of the width.
No SVG maths, no per-star branches, any fraction works. `role="img"` with one
label replaces five meaningless glyphs.

Rounding the average to whole stars to reuse the input component is a common
shortcut — it turns 3.6 and 4.4 into the same picture.

---

## 5. Pitfalls

1. **Divs with `onClick`.** Mouse-only. No focus, no keys, no state for screen
   readers.
2. **`display: none` on the radios.** Removes them from Tab and from screen
   readers; the group becomes mouse-only again. Use a visually-hidden class.
3. **Hiding the input and losing the focus ring.** Draw it on the star next to
   the input: `input:focus-visible + .star { outline: … }`.
4. **A shared `name`.** Two ratings on one page with `name="rating"` become
   one group — picking in one clears the other. `useId()`.
5. **Storing the hover in the value** (section 3).

---

## 6. Follow-ups to expect

| They ask | Short answer |
| --- | --- |
| "Half stars for input." | Ten radios, values 0.5…5. Draw each star as two halves (left half = n − 0.5). Same group, same keys. |
| "Clear by clicking the selected star." | Radios don't fire `change` for the checked one; add `onClick` on its label that calls `onChange(0)` when `star === value`. Make sure keyboard users have a way too. |
| "Read-only mode." | Use `StarDisplay`, not a disabled input — a disabled control reads as "unavailable", not "this is the score". |
| "Custom icons (hearts, SVG)." | Pass a `renderIcon(filled)` prop; the radio structure doesn't change. |
| "Submit with a form." | Already works: the radios have a `name`. With React 19 form actions, read it from `FormData`. |
| "RTL languages." | Flex order flips with `dir="rtl"`; radio arrow keys already follow direction. The clip in the display needs `right: 0` instead of `left`. |

---

## 7. Scoring notes

- **Mid:** five clickable spans with hover colouring; mouse only.
- **Senior:** recognises a radio group (native or full ARIA), keeps hover
  separate from value, visible focus on hidden radios, unique `name`, a
  separate fractional display with one accessible label, and a clear-rating
  path.
