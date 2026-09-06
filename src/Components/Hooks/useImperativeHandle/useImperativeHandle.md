# `useImperativeHandle`

> Source: [react.dev/reference/react/useImperativeHandle](https://react.dev/reference/react/useImperativeHandle) — verified against React 19 docs.

By default, a `ref` a parent passes into a component is just a prop the
component can do whatever it wants with — usually forward straight to a DOM
node so the parent ends up holding that raw node (see
[`useRef.md`](./useRef.md)'s ref-as-prop section for that base mechanic;
this writeup doesn't re-cover it). `useImperativeHandle` lets the component
**intercept that ref** and decide exactly what the parent receives instead —
a custom object with only the methods it chooses to expose, not the DOM node
itself.

```tsx
useImperativeHandle(ref, createHandle, dependencies?);
```

Two live demos: [`RestrictedHandle.tsx`](./useImperativeHandle/RestrictedHandle.tsx)
(the core case — exposing `{ focus, scrollIntoView }` instead of the
`<input>` node) and [`NestedHandles.tsx`](./useImperativeHandle/NestedHandles.tsx)
(a handle whose method reaches through other components' own handles). A
third, [`PreferPropsOverRefs.tsx`](./useImperativeHandle/PreferPropsOverRefs.tsx),
demonstrates the docs' central caveat by comparing an imperative handle
against the props-based alternative for the same UI. Everything else below
is conceptual.

---

## Signature

```tsx
useImperativeHandle(ref, createHandle, dependencies?);
```

### Parameters

| Parameter      | Description                                                                                                                                        |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ref`          | The `ref` your component received as a prop (React 19 ref-as-prop — no `forwardRef` needed).                                                        |
| `createHandle` | A function that takes no arguments and returns the handle you want to expose — usually a plain object of methods.                                    |
| `dependencies` _(optional)_ | The list of reactive values `createHandle` reads. If any change between renders, `createHandle` re-runs and the exposed handle is rebuilt. |

### Returns

`undefined`.

---

## Rules / caveats

- **Top-level only** — same Hook rule as everywhere else.
- **Pairs with `ref`-as-prop, not `forwardRef`.** `forwardRef` still works
  but React 19 no longer requires it — declare `ref` as an ordinary prop on
  the function component that calls `useImperativeHandle`, as in both demos
  here.
- **Do not overuse refs.** The docs are explicit: refs are an escape hatch
  for imperative behavior that has no prop-based equivalent — focusing a
  node, scrolling to it, triggering a one-off animation, selecting text.
  **If you can express something as a prop, you should not use a ref.**
  Exposing `{ open, close }` from a `Modal` via an imperative handle is
  usually the wrong call when a plain `isOpen` prop does the same job with
  less indirection — see [`PreferPropsOverRefs.tsx`](./useImperativeHandle/PreferPropsOverRefs.tsx)
  for both versions side by side.
- **The exposed handle doesn't have to be, or contain, a DOM node at all.**
  It's just whatever object `createHandle` returns — methods that close
  over internal refs/state, computed values, anything. The parent has no
  way to reach past it to the real DOM node.
- **Omit `dependencies` and `createHandle` re-runs every render**, same as
  `useMemo`/`useEffect` without a deps array. Pass `[]` when the handle's
  methods don't need to see fresh props/state on every call (both demos
  here do this); include a value when a method's closure needs to stay
  current with it.

---

## Usage scenarios worth knowing

### 1. Restricting what a parent can do with a ref

The textbook case: a component owns a DOM node internally (via its own
`useRef`) but only wants to grant the parent a couple of imperative
capabilities, not full access to `style`, `value`, or arbitrary DOM
mutation. See [`RestrictedHandle.tsx`](./useImperativeHandle/RestrictedHandle.tsx) —
the parent's ref is typed as `{ focus, scrollIntoView }`, full stop.

### 2. A handle built from other components' handles

Nothing stops a `createHandle` method from calling into refs the component
holds on its own children. `Post` exposes a single
`scrollAndFocusAddComment()` that internally calls `CommentList`'s
`scrollToBottom()` and `AddComment`'s `focus()` — the parent triggers one
action without knowing two child components were involved. See
[`NestedHandles.tsx`](./useImperativeHandle/NestedHandles.tsx).

### 3. Recognizing when a prop should have been used instead

Given a component that exposes `open()`/`close()` via a ref, ask whether
its visibility could instead be driven by a boolean prop the parent already
has in state. If yes, the ref version is added indirection for no benefit —
the prop version re-renders declaratively whenever `isOpen` changes, with
no imperative call to keep in sync with render state. See
[`PreferPropsOverRefs.tsx`](./useImperativeHandle/PreferPropsOverRefs.tsx).

---

## `useImperativeHandle` vs. a raw forwarded ref

|                                          | Raw ref (no `useImperativeHandle`) | `useImperativeHandle`                     |
| ---------------------------------------- | ----------------------------------- | ------------------------------------------ |
| What the parent's `ref.current` holds     | The actual DOM node / instance      | Whatever object `createHandle` returns     |
| Surface area exposed to the parent        | Everything the node supports        | Only the methods you choose                |
| Needs `forwardRef` in React 19            | No — `ref` is a plain prop          | No — `ref` is a plain prop                 |
| Right tool when...                        | The parent genuinely needs the node | The parent needs a few specific actions, not the node itself |
| Even better tool, when applicable         | —                                    | A prop (e.g. `isOpen`), if the behavior can be expressed declaratively |
