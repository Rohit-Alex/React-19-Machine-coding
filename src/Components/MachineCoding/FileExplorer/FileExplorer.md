# File explorer / tree view with lazy loading

> **The prompt:** "Build a VS Code-style file explorer. Folders load their
> contents from the server when opened. Users can add files and folders, and
> delete them."
>
> It's the [nested comments](../NestedComments/NestedComments.md) question
> plus async data: every folder can be *not loaded*, *loading*, *failed*, or
> *loaded*. Most of the bugs live in the gaps between those.

Runnable demo: [`RecursiveExplorer.tsx`](./RecursiveExplorer.tsx) ·
[`FlatMapExplorer.tsx`](./FlatMapExplorer.tsx) · helpers:
[`fileTree.ts`](./fileTree.ts) · loading:
[`useChildLoader.ts`](./useChildLoader.ts) · fake server: [`api.ts`](./api.ts)

---

## 1. Clarify before you code

| Question | Why it changes your code |
| --- | --- |
| Does the API return one folder at a time, or the whole tree? | One folder at a time is the lazy-loading case; that's what this build assumes. |
| Should added files be saved to the server? | Here they're local only. Saving means optimistic adds and rollback on failure (section 9). |
| Deleting a non-empty folder: confirm first? | A real explorer asks. Easy to add; decide up front. |
| Sort order? | Folders first, then by name, is what every explorer does. Derive it when rendering. |
| Keyboard navigation (arrow keys like VS Code)? | Pushes you toward a flat list of visible rows (section 9). |
| Rename, drag-and-drop to move? | Moving is much easier with the flat table (section 9). |

---

## 2. The one idea that makes lazy loading work: "not loaded" ≠ "empty"

```ts
interface TreeNode {
  id: string; name: string; kind: "file" | "folder";
  children?: TreeNode[];   // undefined = never fetched,  [] = fetched, and empty
}
```

Two different facts need two different values:

- **`undefined`** — we haven't asked the server yet. Opening the folder should
  fetch.
- **`[]`** — we asked, and it's empty. There's nothing to open, so it loses
  its arrow, stops being clickable, and is *never* fetched again.

Use `[]` for both and one of two bugs follows: either unopened folders look
empty and never load, or empty folders refetch every time you open them.

The analogy: a box you haven't opened and a box you opened and found empty.
Both have nothing in your hands, but only one is worth opening again.

A **new folder the user creates** starts as `[]`: we know it's empty, so
opening it doesn't call the server. Folders the server sends start as
`undefined`.

---

## 3. Loading: where to fetch, and the traps

Only version 1 loads lazily; version 2 starts with the whole tree in memory
(section 5). [`useChildLoader.ts`](./useChildLoader.ts)'s
`load(folderId)` fetches that folder's contents and passes them to a callback
that stores them.

**Fetch from the click, not from an Effect.** The fetch happens *because* the
user opened a folder, so it goes in the open handler:

```ts
const openFolder = () => {
  setOpen(true);
  if (!node.children) api.load(node.id);
};
```

The Effect version — "whenever a folder is open and has no children, load
it" — reads fine but has a trap: if the fetch fails, the folder is still open
and still has no children, so the Effect fires again, fails again, and loops
forever. You'd need an extra "unless it errored" rule to stop it. React's docs
say the same thing in general: if code runs because of a specific
interaction, it belongs in that event handler. The only Effect here loads the
root on mount, because nothing was clicked.

**Stop duplicate requests with a ref.** Double-click a folder and `load`
runs twice before React re-renders. Both calls would read the same old
`status` state and both would fetch. A ref updates immediately:

```ts
const inFlight = useRef(new Set<string>());
if (inFlight.current.has(folderId)) return;
inFlight.current.add(folderId);
```

StrictMode runs the mount Effect twice in development; this is also what
stops the root being fetched twice.

**Show loading and errors per folder.** `status` is a map of
`folderId → "loading" | "error"`. A failed folder shows a Retry button. The
"network-drive" folder in the demo fails half the time on purpose.

**Deleted while loading.** Open a folder, delete it before the response
arrives. The response still comes back and tries to store children for a
folder that's gone. Handle it by doing nothing when the folder isn't found:
`updateNode` finds no match and returns the tree unchanged. Say this in
the interview — it's the race condition they're checking for.

**Loaded data lives at the top, not in the folder component.** If each folder
component fetched and kept its own children in `useState`, collapsing its
parent would unmount it and throw the data away — reopening would refetch.
Here the data lives in the top-level tree, so a folder loads once.

---

## 4. Version 1 — nested tree, recursive component

This is the shape in the React docs' first travel-plan example: every item
holds its children, and a component renders itself for each child.

```tsx
const Node = ({ node }) => (
  <li>
    <EntryRow entry={node} … />
    {open && node.children && (
      <ul>{sortEntries(node.children).map((c) => <Node key={c.id} node={c} />)}</ul>
    )}
  </li>
);
```

Every change — storing loaded children, adding a file, deleting — goes
through one helper that walks down from the root and copies only the folders
on the path:

```ts
function updateNode(node, id, fn) {
  if (node.id === id) return fn(node);          // fn returns new node, or null to delete
  if (!node.children) return node;
  let changed = false;
  const children = [];
  for (const child of node.children) {
    const next = updateNode(child, id, fn);
    if (next !== child) changed = true;
    if (next) children.push(next);
  }
  return changed ? { ...node, children } : node; // untouched folders keep their object
}
```

- Store children: `updateNode(tree, folderId, n => ({ ...n, children }))`
- Add: `updateNode(tree, parentId, p => ({ ...p, children: [...p.children, item] }))`
- Delete: `updateNode(tree, id, () => null)` — the whole subtree goes with it,
  because it was inside the deleted object.

Open/closed and "creating a file here" are local `useState` in each `Node`.
Simple, but collapsing a folder unmounts everything inside, so inner folders
forget they were open. (The data isn't lost — it's in the top-level tree —
so nothing refetches.)

---

## 5. Version 2 — flat table (the React docs' "normalized" shape)

The React docs' fix for deeply nested state, from *Choosing the State
Structure → Avoid deeply nested state*: keep every item in one table by id,
and have each item list its children's ids. The root lives in the table too.

To keep the focus on the shape, this version skips the server: the whole
tree is in the table from the start, like the docs' `initialTravelPlan`. To
add lazy loading back, use `childIds: undefined` for "not loaded yet" and
store a response by setting the folder's `childIds` and adding each child to
the table.

```ts
{
  root: { id: "root", name: "project", kind: "folder", childIds: ["src", "pkg"] },
  src:  { id: "src",  name: "src",     kind: "folder", childIds: ["app"] },
  app:  { id: "app",  name: "App.tsx", kind: "file" },
  pkg:  { id: "pkg",  name: "package.json", kind: "file" },
}
```

Rendering is still recursive, exactly like the docs' `PlaceTree`: the
component takes an **id**, not an object, and looks itself up:

```tsx
const FolderTree = ({ id, parentId, table, onDelete, … }) => {
  const node = table[id];
  …
  {children.map((c) => <FolderTree key={c.id} {...props} id={c.id} parentId={id} />)}
};
```

Updates touch only what changed, with no walk from the root:

- **Add:** put the new item in the table, append its id to the parent's
  `childIds`.
- **Delete:** the docs' two steps. First remove the id from the parent's
  `childIds` — that alone makes it vanish from the screen. Then forget the
  item *and its whole subtree* from the table. Skip the second step and
  deleted folders stay in memory forever, unreachable. The docs do this with
  a recursive `deleteAllChildren`; [`removeFromTable`](./fileTree.ts) does the
  same with a stack.

Because delete needs the parent, `FolderTree` receives `parentId` as a prop,
the same as in the docs.

The table and its update functions live at the top and go down as props,
like the docs' `placesById` and `onComplete`. Which folders are open lives
there too, as a `Set` of ids, so collapsing a folder no longer loses anything
inside it. Typing a new name or a rename only matters to one row, so that
stays as local state in the row, same as version 1.

(The [nested comments](../NestedComments/NestedComments.md) topic uses the
same flat table but renders it with a loop instead of recursion. Both work;
recursion by id is what the React docs show.)

---

## 6. Adding and renaming

One form, [`NameForm.tsx`](./NameForm.tsx), does both. For **create** it
appears as the first row inside the folder. Clicking "+ file" on a folder that hasn't loaded yet opens it, which
starts the fetch; the form appears once the contents are in. That way the
duplicate-name check runs against the real contents, not an empty guess.

Validation ([`validateName`](./fileTree.ts)):

- Not empty after trimming spaces.
- No `/` or `\`.
- Not already used in this folder, **ignoring case** — `README.md` and
  `readme.md` clash on the default macOS and Windows file systems.

The error shows under the input with `role="alert"`, and the input gets
`aria-invalid` and `aria-describedby` pointing at it. Escape cancels.

**Rename** swaps the row for the same form, filled with the current name:

- **The name check leaves the item itself out.** Otherwise renaming
  `notes.md` to `Notes.md` would clash with… itself. Each version needs the
  item's *siblings* for this: version 1 passes the parent's `children` down
  as a prop (a node can't see its parent); version 2 looks the parent up in
  the table by `parentId` — one lookup.
- **Submitting the unchanged name just closes the form** — no update, no
  error.
- **Only the name is selected when the box opens**, not the extension:
  `App` in `App.tsx`. Typing replaces the name and keeps the file type, like
  Finder, VS Code and Drive.
- **Updating:** version 1 is `updateNode(tree, id, n => ({ ...n, name }))`;
  version 2 replaces one table entry. Neither touches the children, so an
  open folder stays open and its contents stay loaded.
- The root has no Rename button.

**Why not a React 19 form action here?** React resets the form after an
action runs. On a validation error that would wipe what the user typed. A
controlled input with `onSubmit` keeps it. (The comments topic *does* use an
action, because there's nothing to validate beyond "not empty".)

---

## 7. Which to pick

| | Nested tree | Flat table |
| --- | --- | --- |
| Time to write | Fastest | A bit more setup |
| Add / delete / store children deep down | Walk from root, copy the path | Change one or two entries |
| Delete a subtree | Free — it was inside the object | Must also clean up the table (docs' step 2) |
| Collapse keeps inner open/closed state | No (unmounts) | Yes |
| Move a file to another folder | Remove from one path, insert into another path | Edit two `childIds` arrays |
| Arrow-key navigation, virtualization | Hard | Easy to turn into a flat list of rows |

Interview path: say both, build the nested one if time is short, and switch
to the flat table when they add "move", "rename deep down", or "thousands of
files". That's exactly the progression the React docs walk through.

---

## 8. Details that get noticed

- **Folders first, then names in natural order** — `localeCompare` with
  `numeric: true` puts `file2` before `file10`. Sorted when rendering; the
  stored order is left alone.
- **A chevron (▸ / ▾) shows what can be opened.** Unloaded folders get one —
  they *might* have contents, which is exactly why VS Code shows an arrow on
  every folder it hasn't opened. Once a folder loads empty, the arrow goes.
  Files and empty folders get a blank space the same width, so names line up.
- **Only rows that can open are clickable.** A file or a known-empty folder
  is plain text, not a button — a click that does nothing, or opens onto
  nothing, just confuses. "+ file" on an empty folder still works: its list
  is drawn only while it has items *or* a new-file form is open, so
  cancelling leaves nothing behind.
- **Folder rows that can open are buttons with `aria-expanded`.** The chevron
  is `aria-hidden`, since `aria-expanded` already tells screen readers the
  same thing. The icons are
  `aria-hidden`; the name is the label. The "+ file", "+ folder" and Delete
  buttons have labels naming the folder, so a screen reader doesn't hear
  "Delete, Delete, Delete".
- **Actions are always visible**, not only on hover — hover doesn't exist on
  touch screens or for keyboard users.
- **The root can't be deleted** — no Delete button on it.
- **`crypto.randomUUID()`** for new ids.
- **`role="status"`** on "Loading…" and **`role="alert"`** on failures, so
  screen readers hear them.

---

## 9. Follow-ups to expect

| They ask | Short answer |
| --- | --- |
| "Arrow-key navigation, like VS Code." | Use the ARIA tree pattern: `role="tree"` / `treeitem`, one focusable row at a time (roving `tabIndex`). Up/Down move through the *visible* rows, Right opens / goes to the first child, Left closes / goes to the parent. Walk the table into a flat list of visible rows (as in the comments topic) and Up/Down become "index ± 1". |
| "Drag a file into another folder." | Flat table: remove its id from the old parent's `childIds`, add it to the new one. **Block dropping a folder into itself or its own descendants** — walk up from the target through the parents; if you meet the dragged folder, refuse. Store `parentId` on each item to make that walk easy. |
| "Save adds and deletes to the server." | Optimistic: update the table right away, send the request, undo on failure and show an error. See [`useOptimistic`](../../Hooks/useOptimistic/useOptimistic.md). |
| "Folders can change on the server." | Treat loaded children as a cache: refetch on reopen after some time, or on a "refresh" button, and merge by id so open subfolders keep their state. |
| "A folder has 10,000 files." | Virtualize the flat list of visible rows — see [VirtualList](../VirtualList/VirtualList.md). Or page the folder: load the first 200, add "Load more". |
| "Search all files." | Unloaded folders aren't on the client, so search has to be a server call. Client-side filtering only covers what's been loaded. |
| "Confirm before deleting a non-empty folder." | Check `childIds?.length` (or `children?.length`) before removing; a folder that was never loaded should be treated as possibly non-empty. |
| "Remember which folders were open after a reload." | Save the expanded id set to `localStorage`; on load, reopen and fetch them from the top down. |

---

## 10. Scoring notes

- **Mid:** recursive component, nested state, folders fetch when opened,
  add and delete work by walking the tree.
- **Senior:** separates "not loaded" from "empty", fetches from the click
  rather than an Effect (and can explain the retry loop), stops duplicate
  requests, handles "deleted while loading", shows per-folder loading and
  error with retry, validates names against siblings, copies only the changed
  path, knows the React docs' normalized table and its two-step delete, and
  can explain when the flat table wins (move, keyboard navigation, big
  folders).
