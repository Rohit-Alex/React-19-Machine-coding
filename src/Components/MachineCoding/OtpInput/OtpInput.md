# OTP input (auto-advance, paste support)

> **The prompt:** "Build a 6-digit OTP input. Typing moves to the next box,
> Backspace goes back, and pasting the code fills every box."
>
> Moving focus forward takes five minutes. The rest is all the ways a code
> actually arrives: pasted with a dash, autofilled from an SMS into one box,
> typed over an existing digit, deleted with a held-down Backspace.

Runnable demo: [`index.tsx`](./index.tsx) · component:
[`OtpInput.tsx`](./OtpInput.tsx) · fill logic:
[`fillDigits.ts`](./fillDigits.ts)

---

## 1. Clarify before you code

| Question | Why it changes your code |
| --- | --- |
| Digits only, or letters too? | Decides the filter and `inputMode`. |
| Auto-submit when the last box is filled? | An `onComplete` callback, and disabling the boxes while it verifies. |
| What happens on a wrong code? | Clear the boxes and focus the first one, or leave them for editing? |
| Mobile SMS autofill? | Needs `autocomplete="one-time-code"` and handling the whole code arriving in one box. |
| Resend with a countdown? | A timer beside it — see [CountdownTimer](../CountdownTimer/CountdownTimer.md). |
| Mask the digits (like a PIN)? | `type="password"` breaks the number keypad on some phones; use a CSS mask or show dots instead. |

---

## 2. Two ways to build it

**A. One input per digit (built here).** What most interviewers expect,
and what most sites do. Each box is a real `<input>`, so focus, selection
and screen-reader navigation work per box. The cost is the code that moves
focus and spreads pasted text across boxes.

**B. One hidden input, six drawn boxes.** A single `<input maxLength={6}>`
that's visually hidden, with six `<div>`s showing its characters and a fake
cursor. Paste, autofill, Backspace and selection all come free because it's
one real input. The cost: you draw the caret and the "active box" yourself,
and clicking a box has to move the real input's cursor.

Say both. Build A, and mention B as the choice when you want native
behaviour for free.

---

## 3. State: one array, one function that fills it

```ts
const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
```

An array, not a string: a string can't have a hole in the middle, but a user
can clear box 3 and leave the rest.

Every way a value arrives goes through one pure function:

```ts
fillDigits(digits, start, text) → { digits, focus } | null
```

- **Keeps digits only.** `"123-456"` and `"123 456"` both become `123456`.
- **A full-length code starts at box 1**, wherever the cursor was. Pasting
  the whole code into box 4 shouldn't lose half of it.
- **A shorter paste fills from the current box**, and anything past the last
  box is dropped.
- **Returns where focus should go:** the box after the last one filled, or
  the last box.
- Returns `null` when nothing usable came in (a letter), so the caller just
  ignores it.

Typing one digit is the same call with a one-character `text`. One code
path for typing, pasting and autofill means one set of bugs, not three —
and it's a plain function, easy to test.

---

## 4. Every way a value arrives

### Typing into an empty box

`onChange` gets one character → `fillDigits` → focus moves on.

### Typing into a box that already has a digit

On focus, the box **selects its content** (`onFocus={(e) => e.target.select()}`),
so a typed digit replaces the old one. But clicking an already-focused box
places the cursor instead of selecting — and then the box briefly holds two
characters, like `"35"`. The new one is the character just before the cursor:

```ts
const text = el.value.length === 2 && digit
  ? el.value[el.selectionStart - 1]
  : el.value;
```

Why not `maxLength={1}`? It would block this case (the browser refuses the
second character, so typing over a digit does nothing) and it would cut
autofill down to one digit.

### Paste

`onPaste` → `preventDefault()` (otherwise the browser would put all six
characters into one box) → `fillDigits(digits, i, clipboardText)`.

### SMS autofill on phones

`autocomplete="one-time-code"` makes iOS and Android offer the code from an
incoming SMS above the keyboard. The browser puts the **whole code into one
box** as a normal change, not a paste. Because `onChange` sends anything
longer than one character through the same `fillDigits`, it spreads across
the boxes like a paste. Only the first box has the attribute, so there's one
obvious place for the suggestion.

(Chrome on Android also has the WebOTP API — `navigator.credentials.get({ otp: … })` —
which reads a specially formatted SMS without the user tapping anything.
Worth a mention; it needs the server to format the message for it.)

### Backspace

- **Box has a digit:** let the browser delete it. `onChange` sees `""` and
  clears that slot. Focus stays.
- **Box is empty:** `preventDefault()`, clear the *previous* box and move
  there. Holding Backspace then wipes the code right to left — which is what
  people expect. Without this, Backspace in an empty box does nothing and
  the user has to click back.

### Arrow keys

Left / Right move between boxes. `preventDefault()` stops the cursor moving
inside the one-character box instead.

The analogy: the boxes are one text field cut into pieces. Whatever a normal
text field does — type, paste, delete backwards, arrow along — the pieces
have to do too, and the code's job is to hide the cuts.

---

## 5. Completing and verifying

```ts
const update = (next, focusAt) => {
  setDigits(next);
  if (focusAt !== undefined) focus(focusAt);
  onComplete-if-all-filled(next.join(""));
};
```

- **`onComplete` is called from the event handler, not an Effect.** An
  Effect watching `digits` would also fire after unrelated re-renders
  (like the parent showing "Checking…") and could submit twice. The React
  docs' rule: if it happens because of a user action, put it in the handler.
- **Disable the boxes while verifying**, so the code can't change under the
  request.
- **Wrong code → clear and refocus.** The demo bumps a `key` on
  `<OtpInput>`, which gives React a fresh component with empty boxes — no
  "reset" method needed. `autoFocus` puts the cursor back in box 1, but only
  after a failed attempt: autofocusing on page load would scroll the page to
  the input.
- The error message is linked to every box with `aria-describedby` and
  announced with `role="alert"`. It clears as soon as the user edits.

---

## 6. Details that get noticed

- **`type="text"` with `inputMode="numeric"`, not `type="number"`.** Number
  inputs accept `e`, `+` and `-`, show spinner arrows, react to the mouse
  wheel, and treat the value as a number (a leading `0` can vanish).
  `inputMode="numeric"` still brings up the number keypad on phones.
- **Each box has a label** — "Digit 3 of 6" — and the row is a `role="group"`
  labelled by the visible instruction. A screen reader hears where it is.
- **Focus moves with `.focus()` straight away** in the handler. The target
  box already exists; it doesn't need to wait for a re-render.
- **Tabular numbers** so every digit is the same width.
- **Letters are ignored silently.** The input is controlled, so when the
  handler doesn't update state, React puts the old value back.

---

## 7. Follow-ups to expect

| They ask | Short answer |
| --- | --- |
| "Make the length configurable." | Already a prop. The state starts as `Array(length).fill("")`; changing `length` on a live input should remount it (`key={length}`). |
| "Allow letters (e.g. `AB12CD`)." | Swap the filter in `fillDigits` for `/[^A-Z0-9]/gi`, uppercase it, use `inputMode="text"` and `autoCapitalize="characters"`. |
| "Resend code in 30s." | A countdown next to it, disabled until zero; clear the boxes when a new code is sent. |
| "Controlled version (parent owns the value)?" | `value: string` + `onChange`. Represent holes with a placeholder character, or keep the array internal and only report complete codes. |
| "Mask it like a PIN." | Show `•` from state while keeping the real digit in state, or `-webkit-text-security: disc`. Avoid `type="password"` — some phones then drop the numeric keypad. |
| "Why not one input?" | Also valid (section 2B): native paste, autofill and deletion; you draw the boxes and caret yourself. |
| "How do you test it?" | Unit-test `fillDigits` (typing, paste with dashes, full paste into the middle, overflow, letters). Component tests: type six digits → `onComplete` once; Backspace on an empty box moves back. |

---

## 8. Scoring notes

- **Mid:** six inputs, `maxLength={1}`, focus moves forward on input,
  maybe Backspace back. Paste puts everything into one box or is ignored.
- **Senior:** one pure fill function for typing, paste and autofill;
  `one-time-code` + numeric keypad + `type="text"`; handles typing over a
  digit and Backspace in an empty box; `onComplete` from the handler, not an
  Effect; disables while verifying, clears and refocuses on error; labels
  for every box; and can explain the single-input alternative.
