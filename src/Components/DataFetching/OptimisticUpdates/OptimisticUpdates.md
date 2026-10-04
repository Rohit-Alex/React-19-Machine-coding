# Optimistic updates (manual, then via `useOptimistic`)

> **The question:** "Make ticking a todo feel instant, even though saving
> takes a second. What happens if the save fails?"
>
> Showing the change early is one line. The question is what you do when the
> server says no — especially when the user has made *other* changes in the
> meantime. The common answer ("put back the old list") is the bug.

Runnable demo: [`index.tsx`](./index.tsx) · manual version:
[`ManualOptimistic.tsx`](./ManualOptimistic.tsx) · hook version:
[`WithUseOptimistic.tsx`](./WithUseOptimistic.tsx) · shared rules + fake server:
[`todoServer.ts`](./todoServer.ts)

The hook itself — signature, rules, caveats — is in the Phase 1 notes:
[useOptimistic.md](../../Hooks/useOptimistic/useOptimistic.md). This page is
about the *pattern*.

---

## 1. When to be optimistic

| Good fit | Bad fit |
| --- | --- |
| Likes, ticks, renames, reordering, sending a chat message | Payments, bookings, anything with money or limited stock |
| Almost always succeeds | Fails often (validation the client can't predict) |
| Easy to undo visibly | Can't be taken back once seen ("Your order is confirmed!") |
| The result is predictable on the client | The server decides the result (an assigned seat, a price) |

Analogy: a waiter who says "coming right up" and writes your order down
before the kitchen confirms. Fine for coffee. Not fine for "your table for
eight is booked" — if that's wrong, you've told eight people the wrong thing.

---

## 2. The shape of any optimistic update

1. **Predict** the result with the same rule the server uses.
   `applyAction(todos, action)` is shared: the fake server saves with it,
   the client predicts with it.
2. **Show** the prediction now, marked as pending (dimmed, "saving…").
   Optimistic doesn't mean pretending it's certain.
3. **Confirm**: replace the prediction with what the server returned.
4. **Or reject**: remove the prediction and *tell the user*. A change that
   silently undoes itself is worse than a slow one.

---

## 3. Manual version, and the rollback bug

```ts
const snapshot = todos;                       // the whole list, now
setTodos(applyAction(todos, action));         // show it
try { await save(action); }
catch { setTodos(snapshot); }                 // ❌ put the whole list back
```

This works for one change at a time. With two:

```
t=0     tick "Call the bank"  (fails after 1.5s)   snapshot A = [☐ milk, ☐ bank]
t=0.1   tick "Buy milk"       (saves after 0.5s)   snapshot B = [☐ milk, ☑ bank]
t=0.6   milk saved ✅  — server: ☑ milk
t=1.5   bank fails ❌  → setTodos(snapshot A) → ☐ milk, ☐ bank
```

The rollback restored a list from **before** milk was ticked. Milk is saved
on the server and unticked on screen. Checked by simulation: screen `☐ Buy`,
server `☑ Buy`. The demo shows a warning when this happens.

Analogy: you and a colleague edit a shared document. Your change is rejected,
so you restore your copy from this morning — and delete everything your
colleague did since.

### The fix: undo only the failed change

```ts
catch { setTodos((current) => undoOne(current, action)); }
```

Reverse *this* action on top of the list **as it is now**: remove the added
row, set `done` back, put a deleted row back at its old index. Every other
change stays. The manual panel's second option does this.

It works, but every action type now needs an inverse — the same work as the
command pattern in [TodoUndoRedo](../../MachineCoding/TodoUndoRedo/TodoUndoRedo.md#3-how-a-command-is-undone).

---

## 4. The `useOptimistic` version: two layers, nothing to undo

```ts
const [todos, setTodos] = useState(server.getTodos);          // confirmed only
const [optimisticTodos, addOptimistic] = useOptimistic(todos, applyAction);

startTransition(async () => {
  addOptimistic(action);                  // drawn on top of `todos`
  try {
    const saved = await server.save(action);
    startTransition(() => setTodos(saved));
  } catch (e) {
    setError(e.message);                  // no rollback code
  }
});
```

- **`todos` only ever holds what the server confirmed.** It's never edited
  optimistically, so it's never wrong.
- **`optimisticTodos` is worked out on each render**: `todos` plus every
  action still in flight. When an action ends — success or failure — React
  stops applying it.
- **A failure needs no code.** The failed action stops being drawn; the
  confirmed list never had it. Other pending changes are still applied, on
  top of the latest confirmed list.

Analogy: tracing paper over a map. You sketch planned roads on the tracing
paper. A plan rejected? Rub out that line on the tracing paper — the map
underneath was never drawn on.

### Rules that bite

- **It only works inside a transition or Action** (`startTransition`, or a
  `<form action>`). Outside one, React warns and the optimistic value flashes
  and disappears.
- **After an `await`, wrap state updates in `startTransition` again**, so
  they stay part of the Action. React 19 can't track the transition across
  the `await`.
- **Make actions safe to apply twice.** The optimistic copy is laid over the
  confirmed list; if the confirmed list already contains the change while the
  optimistic copy is still applied, a "flip" (`toggle`) undoes itself and an
  "append" adds a duplicate row. So actions here are absolute and repeatable:
  `setDone: true`, not `toggle`; `add` skips an id that's already there.
  Checked: applying either twice gives the same result.
- **Client-made ids** (`crypto.randomUUID()`) mean the optimistic row and the
  saved row share a React `key` — no remount, no flicker, input focus kept.

---

## 5. Manual vs `useOptimistic`

| | Snapshot rollback | Undo only this change | `useOptimistic` |
| --- | --- | --- | --- |
| Correct with overlapping saves | ❌ | ✅ | ✅ |
| Code per action type | none | an inverse each | none |
| Works outside React actions (e.g. a Redux store) | ✅ | ✅ | ❌ |
| Confirmed data kept separate | ❌ | ❌ | ✅ |

The manual "undo one" version is what you'd write in a store outside React,
and what you should be able to explain. `useOptimistic` is what you'd use in
a component in React 19.

TanStack Query's `onMutate` / `onError` is the manual pattern with a
snapshot — its docs warn you to cancel outgoing refetches first
(`cancelQueries`) so a refetch doesn't overwrite the optimistic value. Its
newer "optimistic via the UI" approach (render `variables` of pending
mutations) is the two-layer idea again.

---

## 6. Follow-ups to expect

| They ask | Short answer |
| --- | --- |
| "Out-of-order responses?" | With full-list responses, a slow older save can overwrite a newer one's result. Return only the changed item and merge it, or send a version and ignore older ones ([RaceConditions](../RaceConditions/RaceConditions.md)). |
| "Show the error where it happened." | Keep failed actions in a list with their row id; show "Couldn't save — Retry" on that row instead of a global message. |
| "Retry failed saves." | Keep the action; retrying re-runs `run(action)`. Absolute actions make retries safe. |
| "Offline." | Queue actions in storage, show them as pending, replay in order when back online. Conflicts if the server changed meanwhile. |
| "Optimistic add, but the server assigns the id." | Use a temporary client id as the key; when the response comes, map temp → real id. Or let the server accept client ids (simplest, used here). |
| "Someone else changed the same item." | The server's answer wins; show it. For real collaboration, see CRDTs / operational transforms. |

---

## 7. Scoring notes

- **Mid:** updates state first and restores a snapshot on error; one action at
  a time works.
- **Senior:** names the overlapping-save bug in snapshot rollback, fixes it by
  undoing only the failed change or by layering pending changes over
  confirmed state, uses `useOptimistic` correctly (inside an Action,
  `startTransition` after `await`), makes actions repeatable, marks pending
  rows, reports failures clearly, and knows when *not* to be optimistic.
