# Typing event handlers and refs correctly

Two places where people reach for `any`. Neither needs it. Every example was
checked with this project's `tsc` (strict, React 19 types): ❌ lines are real
errors.

---

## 1. Inline handlers: write no types at all

```tsx
<input value={name} onChange={(e) => setName(e.target.value)} />
//                              ^ e: ChangeEvent<HTMLInputElement> — inferred from where it's used
```

TypeScript knows `onChange` on an `<input>` receives a
`ChangeEvent<HTMLInputElement>`. Inline handlers are typed for free. Only
**extracted** handlers need annotations.

---

## 2. Extracted handlers: event type + element type

```tsx
const onChange = (e: ChangeEvent<HTMLInputElement>) => setName(e.target.value);
const onSubmit = (e: FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  const data = new FormData(e.currentTarget);   // currentTarget is HTMLFormElement
};
const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
  if (e.key === "Enter" && !e.nativeEvent.isComposing) e.currentTarget.blur();
};
const onClick = (e: MouseEvent<HTMLButtonElement>) => e.currentTarget.disabled;

const onChange = (e) => …;   // ❌ strict mode: implicitly `any`
```

| Event | Type | Use case |
| --- | --- | --- |
| `onChange` on input / select / textarea | `ChangeEvent<HTMLInputElement>` (etc.) | Reading `e.target.value` / `.checked` |
| `onSubmit` | `FormEvent<HTMLFormElement>` | `preventDefault`, `new FormData(e.currentTarget)` |
| `onKeyDown` | `KeyboardEvent<T>` | `e.key`, modifiers, `e.nativeEvent.isComposing` |
| `onClick`, `onPointerDown` | `MouseEvent<T>`, `PointerEvent<T>` | Coordinates, buttons |
| `onFocus` / `onBlur` | `FocusEvent<T>` | `e.relatedTarget` (where focus went) |
| `onDragOver` / `onDrop` | `DragEvent<T>` | `e.dataTransfer.files` |
| `onCopy` / `onPaste` | `ClipboardEvent<T>` | `e.clipboardData.getData("text")` |

**Handler-type shortcut:** `const onChange: ChangeEventHandler<HTMLInputElement> = (e) => …` — types the whole function, so `e` is inferred. Handy for props: `onChange?: ChangeEventHandler<HTMLInputElement>`.

**The element type matters.** A handler typed for `<select>` on an `<input>`
is an error (checked ❌) — it would read `.value` from the wrong element type.

---

## 3. `target` vs `currentTarget`

```tsx
const onClick = (e: MouseEvent<HTMLDivElement>) => {
  e.currentTarget.dataset.id;   // ✅ HTMLDivElement — the element with the handler
  e.target.dataset.id;          // ❌ EventTarget — could be any child that was clicked
  if (e.target instanceof HTMLElement) e.target.closest("[data-id]");   // ✅ narrowed
};
```

- **`currentTarget`** = the element the handler is on → TypeScript knows its type.
- **`target`** = whatever was actually clicked, maybe a child `<span>` → only
  `EventTarget`. Narrow with `instanceof` before using it.

Use case for `target`: **event delegation** — one handler on a list, find the
row with `closest(...)` (the [Spreadsheet](../MachineCoding/Spreadsheet/Spreadsheet.md)
build does this).

Exception: for `onChange` on inputs, React types `e.target` as the input
itself, which is why `e.target.value` works without narrowing.

---

## 4. React events vs DOM events — the name clash

`KeyboardEvent`, `MouseEvent`, `FocusEvent` exist twice: React's (generic,
from `"react"`) and the browser's (global, for `addEventListener`).

```ts
import type { KeyboardEvent } from "react";   // React's — now shadows the global one

useEffect(() => {
  const onKey = (e: globalThis.KeyboardEvent) => e.key;   // the DOM one, explicitly
  window.addEventListener("keydown", onKey);
  return () => window.removeEventListener("keydown", onKey);
}, []);
```

Or skip the annotation: `window.addEventListener("keydown", (e) => …)` infers
the DOM type from `WindowEventMap`. For a reusable listener hook, see
[TypingHooks → constrained generics](./TypingHooks.md#3-constrained-generics).

From a React event, the DOM event is `e.nativeEvent` (e.g.
`e.nativeEvent.isComposing` for IME input).

---

## 5. Refs to DOM elements

```tsx
const inputRef = useRef<HTMLInputElement>(null);   // RefObject<HTMLInputElement | null>

inputRef.current?.focus();   // ✅ null before mount and after unmount
inputRef.current.focus();    // ❌ may be null

<input ref={inputRef} />
<input ref={divRef} />       // ❌ a div ref on an input
```

- Pass **the element type** and **`null`** as the start value.
- `current` is `T | null` — use `?.` or check it. Don't silence it with `!`
  unless you're inside an effect or handler that can only run while mounted.
- **React 19 types: `useRef` needs an argument.** `useRef<number>()` is an
  error (checked ❌); write `useRef<number | undefined>(undefined)`.

## 6. Refs for values (not elements)

**Use case:** timer ids, previous values, "is mounted", counters — anything
that must survive re-renders without causing one.

```ts
const timer = useRef<number | undefined>(undefined);
timer.current = window.setTimeout(tick, 100);   // window.setTimeout returns number

const renders = useRef(0);                       // inferred: number
const previous = useRef<string | null>(null);
```

Timer gotcha: plain `setTimeout` may be typed as returning `NodeJS.Timeout` if
Node types are loaded. `window.setTimeout` is always `number`; or use
`ReturnType<typeof setTimeout>`.

---

## 7. Callback refs (with cleanup)

**Use case:** observe or measure an element the moment it mounts, and clean up
when it unmounts — even for items in a list.

```tsx
<div
  ref={(el) => {                       // el: HTMLDivElement | null — inferred
    if (!el) return;
    const observer = new ResizeObserver(…);
    observer.observe(el);
    return () => observer.disconnect();  // React 19: cleanup function
  }}
/>
```

Used for row measurement in the
[VirtualizationDeepDive](../Performance/VirtualizationDeepDive/VirtualizationDeepDive.md#3-measuring-one-resizeobserver).

---

## 8. Passing refs to your components (React 19)

```tsx
function TextInput({ ref, label }: { ref?: Ref<HTMLInputElement>; label: string }) {
  return <input ref={ref} aria-label={label} />;
}

<TextInput ref={inputRef} label="Name" />
<TextInput ref={divRef} label="Name" />   // ❌ wrong element type
```

`ref` is a normal prop now — type it as `Ref<T>` (accepts ref objects and
callback refs). No `forwardRef`. When extending native props,
`ComponentProps<"input">` already includes `ref`
([UtilityTypes](./UtilityTypes.md#2-componentprops--borrow-another-components-props)).

## 9. `useImperativeHandle`: expose methods, not the element

**Use case:** a video player that lets parents call `play()` / `pause()` but
not touch the `<video>` directly.

```tsx
export interface PlayerHandle { play: () => void; pause: () => void }

function Player({ ref }: { ref?: Ref<PlayerHandle> }) {
  const video = useRef<HTMLVideoElement>(null);
  useImperativeHandle(ref, () => ({
    play: () => void video.current?.play(),
    pause: () => video.current?.pause(),
  }));
  return <video ref={video} />;
}

const player = useRef<PlayerHandle>(null);
player.current?.play();          // ✅
player.current?.currentTime;     // ❌ only the handle's methods are exposed
```

Export the handle interface so parents can type their ref. More in the Phase 1
notes: [useImperativeHandle](../Hooks/useImperativeHandle/useImperativeHandle.md).

---

## 10. Mistakes interviewers look for

| Mistake | Better |
| --- | --- |
| `(e: any) =>` | Inline handlers (inferred), or `ChangeEvent<HTMLInputElement>` |
| `e.target.dataset` on a click | `e.currentTarget`, or narrow `e.target` with `instanceof` |
| `useRef<HTMLInputElement>()` | `useRef<HTMLInputElement>(null)` |
| `inputRef.current!.focus()` everywhere | `?.`, or `!` only where it's provably mounted |
| React's `KeyboardEvent` in `addEventListener` | `globalThis.KeyboardEvent`, or let it infer |
| `forwardRef` in new React 19 code | `ref` as a prop typed `Ref<T>` |
| Exposing the whole DOM node to parents | `useImperativeHandle` with a small typed handle |
