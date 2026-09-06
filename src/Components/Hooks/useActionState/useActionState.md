# `useActionState`

Source: https://react.dev/reference/react/useActionState — verified against React 19.

`useActionState` is a Hook that lets you update state based on the result of
a form action (or any Action). It hands you back the latest state, a
dispatch function to pass as the Action, and a pending flag — so you stop
hand-rolling `isLoading`/`error` state around async submissions. This page
covers two demos: `UpdateNameForm.tsx` (the basic `<form action={...}>`
pattern) and `KnownVsUnknownErrors.tsx` (dispatching from a plain `onClick`
via `startTransition`, plus known-vs-unknown error handling).

## Signature

```ts
const [state, dispatchAction, isPending] = useActionState(
  reducerAction,
  initialState,
  permalink?,
);
```

### Parameters

| Parameter      | Type                                                   | Notes                                                                                                     |
| -------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `reducerAction` | `(previousState, action) => newState` (may be async)    | Receives the current state and the dispatched payload (e.g. `formData`); returns the next state.        |
| `initialState`  | any (must be serializable if used with a Server Function) | Value `state` starts as. Ignored by React after the first `dispatchAction` call.                        |
| `permalink`     | `string` (optional)                                       | Unique page URL for forms with progressive enhancement in Server Components — used for navigation if the JS bundle hasn't loaded yet. |

### Returns

| Return         | Type       | Notes                                                                                     |
| -------------- | ---------- | ------------------------------------------------------------------------------------------ |
| `state`        | same as `initialState`/`reducerAction`'s return | Initially `initialState`, then the last value returned by `reducerAction`.                 |
| `dispatchAction` | function | Pass this as a `<form action={...}>`, or call it from inside another Action. Stable identity across re-renders. |
| `isPending`    | `boolean`  | `true` while an Action dispatched via `dispatchAction` is in flight.                        |

## Rules & caveats

- `useActionState` must be called at the top level of a component or custom Hook, same as any other Hook — not in loops or conditionals.
- `dispatchAction` **must be called from an Action** (a `<form action={...}>`, or wrapped in `startTransition`). Calling it directly from a plain event handler outside a transition is not supported.
- React queues `dispatchAction` calls and runs them sequentially, one at a time.
- `dispatchAction` has a stable identity, so it's safe to omit from dependency arrays.
- If `reducerAction` **throws**, React skips all subsequently queued `dispatchAction` calls for that queue — nothing after the throw runs. The docs' recommended pattern: catch *expected/known* errors inside `reducerAction` and return them as part of state; only let genuinely unexpected errors propagate, so an Error Boundary can catch them.
- Errors thrown by `reducerAction` (that aren't caught) are caught by the nearest Error Boundary.
- When using `permalink`, the form component rendered on the destination page must render the same form (consistent markup) so progressive enhancement works.
- `initialState` must be serializable if the action is a Server Function.
- Multiple Actions dispatched in quick succession may be batched by React.

## Usage scenarios

### `UpdateNameForm.tsx` — basic form action

Passes `submitAction` straight to `<form action={submitAction}>`. React
automatically wires up dispatch and `isPending` for a real form submit — no
manual `startTransition` required. `reducerAction` reads the submitted
`formData`, "saves" the name after a fake delay, and returns an error string
(or `null`) as the new state.

### `KnownVsUnknownErrors.tsx` — manual dispatch + known vs. unknown errors

Dispatches from a plain `onClick` (not a `<form>`), so the call is wrapped in
`startTransition` to satisfy "`dispatchAction` must be called from an
Action." Typing `"error"` throws a `KnownError` that `reducerAction` catches
and returns as part of state (rendered inline). Typing `"crash"` throws a
plain `Error` that `reducerAction` deliberately re-throws — per the docs,
React then skips any further queued `dispatchAction` calls, and the nearest
Error Boundary catches it instead. Since this repo has no
`react-error-boundary` dependency, the boundary is a small hand-written class
component (`getDerivedStateFromError`), the same pattern used in `use.md`'s
`ReadPromiseWithSuspense.tsx`.

## `useActionState` vs. manual `useState` + try/catch

| Concern                          | Manual `useState`/`useTransition`                          | `useActionState`                                                    |
| --------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------- |
| Pending flag                     | You track `isPending` yourself (or use `useTransition`)      | Returned for you, wired automatically for `<form action>`         |
| Result/error state               | Separate `useState` calls, manually updated in try/catch    | Single `state` value, updated by `reducerAction`'s return value    |
| Form integration                 | Must manually call `preventDefault`, read `FormData`, call setters | `<form action={dispatchAction}>` — React reads `FormData` and dispatches for you |
| Progressive enhancement (Server Components) | Not supported without extra plumbing                | Supported via `permalink`                                          |
| Sequencing rapid dispatches       | You must guard against races yourself                        | React queues and runs `dispatchAction` calls sequentially           |
