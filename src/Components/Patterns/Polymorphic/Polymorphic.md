# Polymorphic components (`as` prop) in TypeScript

> **The question:** "Our `<Button>` sometimes needs to be a link. And
> `<Text>` needs to be an `h1`, a `p`, a `label`… How do you build that, and
> how do you type it so `<Text as="label" htmlFor>` is allowed but
> `<Text href>` isn't?"

Runnable demo: [`index.tsx`](./index.tsx) · components and the type:
[`polymorphic.tsx`](./polymorphic.tsx)

---

## 1. Why

Design systems style things once and use them everywhere. But the **element**
must match the meaning:
- a "button" that navigates should be an `<a href>` — so middle-click,
  "copy link", and screen readers ("link") work;
- a heading styled small is still an `<h2>` for the page outline;
- a router's `<Link>` needs to be the element, not wrapped in a button.

Without `as`, people nest (`<Button><a/></Button>` — a link inside a button,
invalid HTML) or reach for `<div onClick>`. With `as`, one component, the
right element.

Analogy: a uniform. The same uniform (styles) on whoever does the job — a
doctor or a nurse (button or link). The uniform doesn't change what the
person can do.

---

## 2. The type

```ts
type PolymorphicProps<C extends ElementType, Own = object> =
  Own                                              // our props: size, tone, variant
  & { as?: C }                                     // the element / component to render
  & Omit<ComponentPropsWithRef<C>, keyof Own | "as">;  // everything C accepts, minus our names

function Text<C extends ElementType = "span">({ as, size, ...rest }: PolymorphicProps<C, TextOwnProps>) {
  const Component: ElementType = as ?? "span";
  return <Component {...rest} … />;
}
```

- **`C` is inferred from `as`.** `<Text as="label">` makes `C = "label"`, so
  `htmlFor` is allowed; with no `as`, `C` defaults to `"span"`.
- **`ComponentPropsWithRef<C>`** — every prop that element or component
  accepts. For a custom component (`as={Link}`), that includes its required
  props, so `to` becomes required.
- **`Omit<…, keyof Own | "as">`** — if our prop names clash with the
  element's (`size` exists on `<input>` as a number!), ours win, instead of
  an impossible intersection.
- **`WithRef`** — in React 19 `ref` is a normal prop, so it's included and
  typed for the element: an `HTMLInputElement` ref for `as="input"`. No
  `forwardRef`. (Before React 19, polymorphic + `forwardRef` typing was
  famously painful.)

### Checked

A throwaway file (deleted afterwards) ran through the project's `tsc`. These
compile:

```tsx
<Text as="label" htmlFor="x" />   <Text as="a" href="/" />   <Text as="input" ref={inputRef} />
<Button as="a" href="/x" />       <Button as={Link} to="/x" />   <Button disabled />
```

And each of these is an error (every `@ts-expect-error` was needed):

```tsx
<Text href="/" />                  // a span has no href
<Text as="p" htmlFor="x" />        // htmlFor isn't a <p> prop
<Button as="a" href="/" disabled /> // links have no `disabled`
<Button as={Link} />               // Link requires `to`
<Text size="xl" />                 // size is sm | md | lg
<Text as="input" ref={divRef} />   // a div ref on an input
```

---

## 3. The one cast inside

```ts
const Component: ElementType = as ?? "span";
```

Inside the component, `C` is generic, and TypeScript can't check `{...rest}`
against "the props of some unknown `C`". Widening to `ElementType` inside is
the standard, safe trade-off: **callers** are fully checked (above); the
implementation trusts that `rest` came from those checked props.

---

## 4. Behaviour to get right

- **`type="button"` only on real buttons.** A `<button>` in a form defaults
  to `type="submit"`, so a generic Button should set `type="button"` — but not
  on an `<a>`, where `type` means a MIME type.
- **Don't allow meaningless elements** for interactive components:
  `<Button as="div">` loses keyboard and role. Narrow `C` if needed:
  `C extends "button" | "a" | typeof Link`.
- **Merge, don't overwrite, `style` / `className`** — the caller's should be
  added to yours.
- **`disabled` on links** doesn't exist. If a disabled link-button is needed:
  `aria-disabled="true"`, remove `href`, and block the click.

---

## 5. The alternative: `asChild` (Slot)

```tsx
<Button asChild>
  <Link to="/settings">Settings</Link>
</Button>
```

Radix's approach: instead of choosing an element by prop, the component
**merges its props onto its single child** (`cloneElement` with merged
`className`, `style`, handlers and refs).

| | `as` prop | `asChild` |
| --- | --- | --- |
| Types | Generic gymnastics (above) | Simple: the child is just JSX |
| Child's own props | Mixed into the parent's props | Stay on the child, where they belong |
| Prop clashes | Possible (`size`, `color`) | Fewer — each element keeps its own |
| Reading the JSX | One element | Two, nested |

Both are fine; know both. `asChild` is winning in newer libraries mostly
because of the TypeScript cost of `as`.

---

## 6. Follow-ups to expect

| They ask | Short answer |
| --- | --- |
| "Why not just `<Button href>` and switch inside?" | Works for button-or-link. Doesn't scale to "any element or router link" and still needs a union of prop types. |
| "Performance of the generic types?" | Large `ComponentPropsWithRef` unions on big design systems slow down the editor. A common fix: limit `C` to a few allowed elements. |
| "Styled-components / Emotion?" | They have their own `as` prop with the same idea. |
| "Typing `ref` before React 19?" | `forwardRef` loses generics, so libraries re-declared the component type with a cast. React 19's ref-as-prop removes that. |

---

## 7. Scoring notes

- **Mid:** `as` that works at runtime, typed as `any` or `ElementType` with
  loose props.
- **Senior:** a generic `PolymorphicProps` with inference from `as`, own props
  winning via `Omit`, `ComponentPropsWithRef` for React 19 refs, the one inner
  cast explained, correct `type="button"` handling, limits on allowed elements
  for interactive components, and can compare with `asChild`.
