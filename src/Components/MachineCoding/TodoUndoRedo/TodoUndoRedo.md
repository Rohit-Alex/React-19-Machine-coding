# Todo app with undo / redo (command pattern / history stack)

> **The prompt:** "Build a todo list with add, toggle, edit and delete. Add
> undo and redo."
>
> The todo list is filler. The question is: **what do you put on the undo
> stack?** Whole snapshots, or commands that know how to reverse themselves?
> Then: when does the redo stack get cleared, what counts as one step, and
> who owns Ctrl+Z.

Runnable demo: [`index.tsx`](./index.tsx) · UI: [`TodoUndoRedo.tsx`](./TodoUndoRedo.tsx) ·
history logic: [`commands.ts`](./commands.ts)

---

## 1. Clarify before you code

| Question | Why it changes your code |
| --- | --- |
| How many undo steps? | A limit keeps memory bounded (100 here). |
| Is typing in an edit one step per letter? | Usually one step per finished edit (section 5). |
| Does "Clear completed" undo as one step? | Yes — a batch command (section 3). |
| Keyboard shortcuts? | Ctrl/⌘+Z, Shift+Ctrl/⌘+Z, Ctrl+Y — and not inside text fields (section 5). |
| Shared with other users / synced to a server? | Commands, not snapshots (section 2). |

---

## 2. Snapshots or commands?

**Snapshots** — keep `past: State[]`, `present`, `future: State[]`. Undo moves
`present` into `future` and pops `past`. Five lines, works for any state, and
is the right first answer for small state. The
[Tic-tac-toe](../TicTacToe/TicTacToe.md) history is exactly this.

**Commands** (built here) — keep a list of *changes*, each with its exact
opposite:

```ts
{ label: "Delete “Buy milk”",
  redo: { type: "remove", id: "1" },
  undo: { type: "insert", todo: {…}, index: 0 } }
```

| | Snapshots | Commands |
| --- | --- | --- |
| Code | Tiny | An `apply` and an `invert` per change type |
| Memory | A whole copy per step | One small object per step |
| Labels ("Undo: Delete …") | Hard | Free |
| Two people editing the same list | Undo would wipe out the other person's changes | Undo reverses only *your* change |
| Send to a server | The whole state | Just the command |

The last two rows are why editors (Figma, Google Docs, VS Code) use commands.

Analogy: undoing a bank transfer. Snapshots are "restore the account to last
Tuesday's balance" — which also erases everyone else's payments since
Tuesday. Commands are "send the same amount back" — it reverses only that one
transfer.

---

## 3. How a command is undone

```ts
case "run":
  undo = invert(state.todos, command);   // BEFORE applying — needs the old state
  todos = apply(state.todos, command);
  past.push({ redo: command, undo }); future = [];
```

- **The opposite is worked out before the change runs.** Undoing a delete
  needs the deleted todo *and where it was*; undoing a rename needs the old
  text. After the change, that information is gone.
- **Toggle is its own opposite.** Insert ↔ remove. Rename ↔ rename back.
- **Batch:** "Clear completed" is one command made of several removes. Its
  opposite is the removes' opposites **in reverse order**, each worked out
  against the state it ran on. Reverse order matters: putting back items at
  their old indexes only lands right if the later removal is undone first.
  (Checked in Node: clear two items → undo → both back in their original
  places.)
- **Everything is plain data** — no functions in the stack. It can be logged,
  saved, or sent over the network.

### New action clears redo

Undo twice, then add a todo: the two undone steps can't be redone any more —
they were changes to a list that no longer exists. Every text editor works
this way.

---

## 4. Keep it pure

- The reducer and `apply`/`invert` are pure. `commands.ts` has no React, so it
  was checked in Node: undo all the way returns to the start; redo replays;
  a new action clears the future.
- **The id is made in the event handler** (`crypto.randomUUID()`), not in the
  reducer. Redo must re-insert the *same* todo; generating the id inside
  `apply` would give it a new id on every redo, and StrictMode's double call
  would make two different ids.

---

## 5. What counts as one step, and who owns Ctrl+Z

- **One rename = one step.** The row keeps a local draft while you type;
  only the finished edit (Enter or blur) becomes a command. Otherwise undo
  removes one letter at a time.
- **Escape cancels.** Removing the focused input can fire `blur` in some
  browsers, so all saves go through `blur` and Escape sets a "cancelled" flag
  first — otherwise Escape would save.
- **Inside a text field, Ctrl+Z belongs to the field** (undo typing). Only
  handle it when focus isn't in a text input.
- **Listen on the component, not `window`.** A page-wide Ctrl+Z listener
  steals undo from every other input and widget on the page.
- **Labels on the buttons** ("Undo: Delete “Buy milk”") tell the user what
  will happen — and the same label goes into a polite live region so screen
  readers hear what was done.

---

## 6. Follow-ups to expect

| They ask | Short answer |
| --- | --- |
| "Snapshot version, quickly." | `{ past, present, future }`; undo: `future = [present, ...future]; present = past.at(-1); past = past.slice(0, -1)`. A generic `useUndoable(reducer)` wraps any reducer this way. |
| "Merge rapid changes into one step." | If the new command has the same type and target as the last one and arrived within ~1s, replace the last entry's `redo` instead of pushing. Editors do this for typing. |
| "Persist across reloads." | Commands are JSON: save `todos` + `past` + `future` to `localStorage`. |
| "Collaborative / multiple users." | Undo only your own commands. If someone else changed the same item since, the inverse may no longer apply cleanly — that's where operational transforms / CRDTs come in. |
| "Optimistic server sync." | Send each command; on failure, apply its inverse and show an error. |
| "Memory limit." | `past.slice(-LIMIT)` (done). Snapshots of big state would also need structural sharing (immutable updates already share unchanged objects). |

---

## 7. Scoring notes

- **Mid:** snapshot stacks that work; may forget to clear redo on a new action,
  or bind Ctrl+Z on `window` and break text inputs.
- **Senior:** chooses commands vs snapshots with reasons, computes inverses
  before applying, batch commands undone in reverse order, pure reducer with
  ids created outside it, one step per finished edit, a history limit, and
  keyboard shortcuts that respect text fields.
