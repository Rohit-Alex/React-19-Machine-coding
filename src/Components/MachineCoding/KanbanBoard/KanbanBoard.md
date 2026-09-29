# Drag-and-drop list (reordering) / Kanban board

> **The prompt:** "Build a Kanban board. Cards can be dragged to reorder
> within a column and moved between columns."
>
> The drag itself is a few event handlers. What's being tested: a clean
> "move" function with no off-by-one, showing where the card will land, the
> browser's drag-and-drop quirks, and a way to do it all *without* dragging.

Runnable demo: [`KanbanBoard.tsx`](./KanbanBoard.tsx) · data and move logic:
[`board.ts`](./board.ts)

A single column on its own is the "drag to reorder a list" version of this
question. Everything below applies to it unchanged.

---

## 1. Clarify before you code

| Question | Why it changes your code |
| --- | --- |
| Must it work on phones? | Native HTML drag and drop is unreliable on touch screens. If touch matters, use pointer events or a library (section 7). |
| Keyboard / screen reader users? | Always yes in a senior round. You need a way to move cards without dragging (section 5). |
| Save the order to a server? | Then moves are optimistic, with rollback on failure. |
| Hundreds of cards per column? | Measuring positions on every drag event gets costly; may need virtualization. |
| Reorder the columns too? | Same technique one level up. Usually a follow-up. |
| Limits per column ("max 3 in Doing")? | A check inside `moveCard`, plus showing "can't drop here" while dragging. |

---

## 2. State shape

```ts
interface Board {
  cards: Record<string, Card>;                  // every card, by id
  columns: { id; title; cardIds: string[] }[];  // order lives here
}
```

Cards sit in one lookup table; columns only hold ordered lists of ids. A move
rewrites one or two `cardIds` arrays and never touches a card object. It's
the same "normalized" shape the React docs recommend for nested data (see the
[file explorer](../FileExplorer/FileExplorer.md) topic).

The analogy: a noticeboard with sticky notes. Moving a note doesn't rewrite
what's on it — you just change which column it's stuck in and where.

---

## 3. The move function, and the off-by-one everyone hits

```ts
moveCard(board, cardId, toColumnId, toIndex)
```

The classic bug: to move card A down one place in `[A, B, C]`, you find "the
slot after B" — index 2 — then insert A at 2 and remove the old A. Now the
indexes shift under you, and depending on the order you do it, A lands one
place too far, or nowhere at all.

The fix is to agree on one rule: **`toIndex` counts positions in the target
list with the moving card already taken out.** Then the steps are always
"remove, then insert", and they're the same whether it's the same column or
another one:

```ts
const ids = column.cardIds.filter((id) => id !== cardId);   // take it out
if (isTarget) ids.splice(toIndex, 0, cardId);               // put it back in
```

`[A, B, C]`, move A down one: take out → `[B, C]`, insert at 1 → `[B, A, C]`. ✓

Everything that computes a target index follows that rule: the drop position
skips the dragged card when measuring, and the Down button asks for
`index + 1`. [`board.ts`](./board.ts) also:

- returns **the same board object** when nothing moved (dropping a card back
  where it was), so there's no re-render and no "moved" announcement;
- keeps columns that weren't involved as the same objects;
- clamps an out-of-range index and ignores unknown card or column ids.

---

## 4. Native drag and drop: the parts that trip people up

The browser's drag-and-drop API (the `draggable` attribute plus `drag…`
events) needs no library. It has a handful of rules that aren't obvious:

**1. `dragover` must call `preventDefault()`, or drop never fires.** The
browser's default answer to "can I drop here?" is no. Calling
`preventDefault()` in `dragover` is how you say yes. This is the number-one
"why doesn't my drop work" bug.

**2. Put the id in `dataTransfer` on `dragstart`.**

```ts
e.dataTransfer.setData("text/plain", cardId);
e.dataTransfer.effectAllowed = "move";
```

Some browsers won't start a drag without some data set. It's read back in
`drop` with `getData`. Check that it's actually one of your cards: anything
can be dropped on the page, including text dragged in from another tab.

**3. Where will it land?** On each `dragover`, measure the cards in that
column (skipping the dragged one) and count how many have their middle above
the pointer. That count is the drop index, already in the "without the
moving card" form that `moveCard` expects. A thin line is drawn at that
position.

**4. `dragover` fires many times a second.** Only update state when the
target actually changes:

```ts
setDropTarget((prev) =>
  prev?.columnId === columnId && prev.index === index ? prev : { columnId, index });
```

Returning the same object from a state updater tells React nothing changed,
so it skips the re-render.

**5. `dragleave` fires when you move onto a child element.** Moving from the
column's padding onto a card inside it fires `dragleave` on the column. Only
clear the drop line when the pointer has really left:
`!e.currentTarget.contains(e.relatedTarget)`.

**6. Don't remove or hide the dragged element during the drag.** It's
tempting to take the card out of the list as soon as the drag starts. Some
browsers cancel the drag, or never fire `dragend`, when the element being
dragged leaves the page. The card stays where it is until the drop.

**7. Clear "dragging" state in both `drop` and `dragend`.** This is the bug
you'll actually hit. `dragend` fires on the *dragged* element. But dropping a
card into another column moves it to a different list, so React throws the
old element away and creates a new one. The browser then fires `dragend` on
the old, removed element, and React never hears about it — the "dragging"
state stays stuck. (In an earlier version of this demo, the dropped card
stayed greyed out for exactly this reason.)

So clear it in both places:

- **`drop`** fires on the column, *before* the move replaces anything. It
  covers every successful drop.
- **`dragend`** covers the drags that end without a drop on the board:
  dropped outside, or cancelled with Escape. In those cases nothing moved,
  so the element is still there to receive it.

The analogy: a relay race where the runner hands over the baton and then
leaves the track. If you wait for *that runner* to report "done", you'll
wait forever; the runner receiving the baton has to report it.

---

## 5. Moving without dragging

Dragging isn't possible for everyone: keyboard users, many screen reader
users, people using switch devices, and (with native drag and drop) often
touch screens. WCAG 2.5.7 asks for a way to do anything that needs dragging
with simple clicks or taps.

Here every card has ↑ ↓ ← → buttons. Up/Down reorder within the column;
Left/Right move to the next column at the same position (or the end, if it's
shorter). Buttons are disabled at the edges.

Two details make this work properly:

- **Focus follows the card.** Moving a card to another column creates a new
  element for it (it's in a different list now), so the button you just
  pressed no longer exists, and focus would drop to the top of the page. After
  the move, focus goes to the same button on the card's new copy — or to the
  card itself if that button is now disabled.

  To find that new element, the DOM must already be updated. That's what
  `flushSync` is for: it makes React apply the state change right away, so
  the next line can find and focus the element. The React docs use exactly
  this pattern for "scroll to / focus the item I just added".

- **Every move is announced.** A `role="status"` region reads out "Moved
  'Fix scroll bug' to Done, position 1 of 2." Drag and buttons share one
  `move` function, so both get the same announcement.

Analogy: a lift has stairs next to it. The stairs aren't a second-class
feature; they're how some people get to the same floor.

---

## 6. Details that get noticed

- **The whole column is the drop zone**, including its header and empty
  space, with a minimum height — so an empty column can still receive cards.
- **Column border highlights** while it's the drop target.
- **`cursor: grab`** on cards so they look draggable.
- **Column headers show a count**, and each column is a `<section>` labelled
  by its heading.
- **Keys are card ids**, so React moves the existing element when a card is
  reordered within a column (keeping focus) instead of rebuilding it.

---

## 7. Native API vs pointer events vs a library

| | Native drag and drop | Pointer events (build it yourself) | Library (e.g. dnd-kit, Pragmatic drag and drop) |
| --- | --- | --- | --- |
| Code to write | Least | Most: track pointer, move a copy of the card, find drop spot, auto-scroll | Least for rich behaviour |
| Touch screens | Unreliable | Yes | Yes |
| Custom drag preview, smooth animations | Limited | Full control | Built in |
| Dragging files in from the desktop | Yes | No | Depends |
| Good for an interview | Yes — fits in the time | Only if they ask for touch | Mention it; they usually want to see you build it |

The honest interview answer: "I'll use native drag and drop to show the
logic. In production, for touch support and animations, I'd use a library —
and the `moveCard` function and state shape stay the same either way."

(Atlassian's older `react-beautiful-dnd` is archived; its team now builds
Pragmatic drag and drop, which sits on top of the native API.)

---

## 8. Follow-ups to expect

| They ask | Short answer |
| --- | --- |
| "Save the order to the server." | Optimistic: apply `moveCard` locally, send `{ cardId, toColumnId, toIndex }`, undo on failure. See [`useOptimistic`](../../Hooks/useOptimistic/useOptimistic.md). For big lists, send a sort key (a number between the neighbours' keys) instead of a whole list. |
| "Make it work on touch." | Pointer events: on `pointerdown` capture the pointer, move a floating copy with `transform` on `pointermove`, compute the drop spot the same way, commit on `pointerup`. Add a short press-and-hold before starting so scrolling still works — see [`useClickOrHold`](../../Hooks/useClickOrHold/useClickOrHold.ts). |
| "Scroll when dragging near the edge." | On `dragover`, if the pointer is within ~40px of the column or page edge, scroll it a bit each frame. |
| "Reorder columns too." | Same pattern: `columnIds` order, a `moveColumn`, drop spot measured horizontally. Tell card drags and column drags apart with different `dataTransfer` types. |
| "Limit Doing to 3 cards." | Refuse in `moveCard` (return the same board), and while dragging don't call `preventDefault` in that column's `dragover` — the browser then shows the "no drop" cursor. |
| "Add / edit / delete cards." | Add: new entry in `cards`, id appended to a column. Delete: remove from both. Edit: replace one `cards` entry; columns are untouched. |
| "Animate cards sliding into place." | FLIP: measure positions before the move, apply the move, measure again, and animate the difference with `transform`. |
| "How do you test it?" | Unit-test `moveCard` (same column up and down, across columns, to the end, no-op). Drag events are awkward to simulate, which is one more reason the logic lives in a pure function. |

---

## 9. Scoring notes

- **Mid:** cards drag between columns with native drag and drop, state
  updates on drop, maybe off by one when moving down in the same column.
- **Senior:** normalized state, a pure `moveCard` with a clear index rule and
  a no-op check, a drop indicator computed from card midpoints, knows the
  `preventDefault` / `dragleave` / `dragend` quirks, keeps the dragged
  element in the page, provides button moves with focus management and
  announcements, and can say when to switch to pointer events or a library.
