# Nested comments / threaded replies

> **The prompt:** "Build a comment section where anyone can reply to any
> comment, to any depth. Add reply, delete, and collapse."
>
> Rendering the tree is the easy half. The real question is how you store it:
> the obvious nested shape makes every change deep in the thread awkward, and
> interviewers push on exactly that.

Runnable demo: [`RecursiveComments.tsx`](./RecursiveComments.tsx) ·
[`FlatMapComments.tsx`](./FlatMapComments.tsx) · helpers:
[`commentData.ts`](./commentData.ts)

---

## 1. Clarify before you code

| Question | Why it changes your code |
| --- | --- |
| What does the API send — a nested tree or a flat list with `parentId`? | Almost always flat. Then your first job is turning it into something you can render (section 3). |
| Unlimited depth, or capped? | Deep threads push text off the right edge. You need an indent cap or a "continue this thread" link. |
| Delete a comment that has replies: remove all of them, or leave `[deleted]`? | Hard delete removes a subtree. A placeholder keeps the replies and only blanks the text. |
| Collapse / expand threads? | Decides where UI state lives (section 6). |
| Thousands of comments? Load more replies on demand? | Pushes you toward the flat version: it virtualizes easily and a "load more" only touches one parent. |

---

## 2. Two ways to store the same thread

**Nested tree** — each comment holds its replies:

```ts
{ id: "1", text: "…", replies: [
  { id: "2", text: "…", replies: [ { id: "3", …, replies: [] } ] },
]}
```

**Flat map** — every comment in one lookup table, pointing at its children by
id:

```ts
byId: {
  "1": { id: "1", text: "…", childIds: ["2", "5"] },
  "2": { id: "2", text: "…", childIds: ["3"] },
  …
},
rootIds: ["1", "6"]
```

The analogy: the nested tree is a set of Russian dolls — to reach the smallest
one you open every doll around it. The flat map is a company phone list where
each entry says "reports to …": you can look anyone up in one step, and the
org chart is something you draw from the list when you need it.

---

## 3. Flat list → either shape, in one pass

The API sends `{ id, parentId }` rows. The slow way is, for each comment,
searching the whole list for its children — every comment checks every other
comment, so the work grows with the *square* of the count. The fast way makes
a lookup table first, then attaches each comment to its parent in one more
pass:

```ts
const nodes = new Map();
for (const c of flat) nodes.set(c.id, { ...c, replies: [] });

const roots = [];
for (const c of flat) {
  const parent = c.parentId === null ? undefined : nodes.get(c.parentId);
  (parent ? parent.replies : roots).push(nodes.get(c.id));
}
```

Two loops, so it doesn't matter whether a reply comes before its parent in the
list. A reply whose parent is missing (deleted, or not loaded yet) becomes a
top-level comment instead of silently vanishing. `buildIndex` does the same
thing but records `childIds` instead of nesting objects.

This "flat list to tree" function is often asked on its own. Worth knowing
cold.

---

## 4. Version 1 — recursive component

```tsx
const CommentItem = ({ comment }) => (
  <li>
    <p>{comment.text}</p>
    <CommentList comments={comment.replies} />   {/* renders CommentItem again */}
  </li>
);
```

The component has the same shape as the data. That's why this version is
quick to write, and why nested `<ul>`s give correct list semantics for free.

**The cost is updates.** State must not be changed in place, so replying to
comment 4, three levels down, means copying every comment on the path from
the root to it:

```ts
function updateTree(nodes, id, fn) {
  let changed = false;
  const next = [];
  for (const node of nodes) {
    if (node.id === id) { changed = true; const u = fn(node); if (u) next.push(u); continue; }
    const replies = updateTree(node.replies, id, fn);
    if (replies !== node.replies) { changed = true; next.push({ ...node, replies }); }
    else next.push(node);                        // untouched branch: same object
  }
  return changed ? next : nodes;
}
```

Two details make this the senior version rather than the mid one:

- **Branches that didn't change keep their old object.** The easy version,
  `nodes.map(n => ({ ...n, replies: update(n.replies) }))`, copies *every*
  comment on every change. Keeping untouched branches means `memo` could skip
  them, and it's the same idea as React's own state rules.
- **One function covers add, edit and delete.** `fn` returns the new node, or
  `null` to remove it.

Still, it has to *search* from the root every time, because nothing tells it
where comment 4 is.

---

## 5. Version 2 — flat map, iterative rendering

Updates touch only what changed:

```ts
// Reply to "5": add the new comment, and give "5" one more child id.
byId: { ...byId, [newId]: newComment, "5": { ...byId["5"], childIds: [...byId["5"].childIds, newId] } }
```

No searching and no path copying: the parent is one lookup away. Delete walks
the subtree with a stack to remove every descendant, then drops the id from
its parent's `childIds`.

To render, walk the tree with an explicit stack instead of recursion, and get
a flat list of rows in reading order:

```ts
const stack = rootIds.map((id) => ({ id, depth: 0 })).reverse();
while (stack.length) {
  const row = stack.pop();
  rows.push(row);
  if (collapsed.has(row.id)) continue;           // hide replies, keep the row
  const kids = byId[row.id].childIds;
  for (let i = kids.length - 1; i >= 0; i--) stack.push({ id: kids[i], depth: row.depth + 1 });
}
```

Why push in reverse: a stack gives back the *last* thing you put in. Push
children last-to-first, and the first child comes out first, so the order on
screen matches the order in the data.

The output is a plain array of `{ id, depth }`. Indentation is just
`marginLeft: depth * 16`, capped at a maximum depth. Because it's one flat
list, you can hand it straight to a virtualized list — see
[VirtualList](../VirtualList/VirtualList.md). You can't do that with nested
`<ul>`s.

Since the rows are no longer nested in the HTML, `aria-level` on each `<li>`
tells a screen reader how deep each comment is.

---

## 6. Where the UI state lives

This is the difference that's easiest to miss, and the demo shows it.

- **Recursive:** each `CommentItem` keeps its own `collapsed` and `replying`
  state. Neat — but collapsing a parent *unmounts* its replies, and React
  throws away the state of unmounted components. Open a reply box three levels
  down, collapse the top comment, expand it again: the box is gone, and every
  inner thread you'd collapsed is open again.
- **Flat:** no component owns a subtree, so UI state lives at the top, keyed
  by id: a `Set` of collapsed ids and one `replyingTo` id. Collapsing hides
  rows but loses nothing, and "only one reply box open at a time" comes free.

If you stay recursive and want to keep the state, render the collapsed replies
with the `hidden` attribute instead of removing them, or lift the collapsed set
up to the top as in version 2.

---

## 7. Which to pick

| | Recursive tree | Flat map |
| --- | --- | --- |
| Time to write in an interview | Fastest | A bit more setup |
| Reply / edit / delete deep down | Search from root, copy the path | One lookup, copy one or two entries |
| Collapse keeps inner state | No (unmounts) | Yes |
| Virtualize thousands of comments | Hard | Easy — it's already a flat list |
| "Load more replies" for one comment | Find it in the tree first | Append to one `childIds` |
| Semantic HTML | Nested `<ul>` for free | Needs `aria-level` |

A good interview path: say both options up front, build the recursive one
because it's quick, then explain what you'd switch to when the interviewer
adds "now make it handle 10,000 comments" or "now edit a reply deep down".
That's the same reason Redux's docs recommend storing data normalized (by id)
rather than nested.

Recursion depth is not a real concern here. Comment threads are a few dozen
levels at most, far from any stack limit; the screen runs out of width long
before that. The iterative version is about cheaper updates and flat rows, not
about avoiding a crash.

---

## 8. Details that get noticed

- **Keys are comment ids**, never array indexes — replies get inserted and
  deleted in the middle.
- **Indent cap.** Past about 6 levels, stop indenting further (or show
  "continue this thread"). Otherwise deep replies become a one-word-wide column
  on a phone.
- **Reply box: React 19 form action.** `<form action={fn}>` with an
  uncontrolled input. React resets the form after the action, so there's no
  `value` state to clear. `required` plus a `.trim()` check stops empty posts.
- **`aria-expanded`** on the Show / Hide replies button, and the label says how
  many replies are hidden.
- **Replying to a collapsed comment expands it**, so you can see what you just
  posted.
- **`crypto.randomUUID()`** for new ids — built into browsers, no library.

---

## 9. Follow-ups to expect

| They ask | Short answer |
| --- | --- |
| "Delete should keep the replies." | Don't remove the node; set `deleted: true` and render `[deleted]` in place of the text and author. Remove it for real only when it has no replies left. |
| "Load replies on demand." | Store `hasMore` / `replyCount` per comment. Clicking "load more" fetches by `parentId` and appends to that comment's `childIds`. Trivial in the flat version. |
| "Post optimistically." | Add the comment with a temporary id and a `pending` flag right away, swap in the server id on success, remove it on failure. See [`useOptimistic`](../../Hooks/useOptimistic/useOptimistic.md). |
| "Sort replies by votes." | Sort `childIds` (or `replies`) by score when rendering; don't reorder the stored data. |
| "Only re-render the comment that changed." | Wrap the row in `memo`. In the flat version pass the one comment object; in the tree version the unchanged branches keep their object, so `memo` skips them too. |
| "Edit a comment." | Tree: `updateTree(tree, id, (c) => ({ ...c, text }))`. Flat: replace `byId[id]`. |
| "New comments arrive in real time." | Flat version: `addToIndex` for each incoming comment, same as a local reply. If its parent hasn't loaded, keep it until the parent arrives. |
| "Count all replies under a comment, not just direct ones." | Walk the subtree (recursively or with a stack). If it's shown everywhere, compute it once per render pass rather than per comment. |

---

## 10. Scoring notes

- **Mid:** recursive component, replies stored nested, reply and delete work
  by mapping over the whole tree. Keys are ids.
- **Senior:** builds the tree from a flat list in one pass, copies only the
  path on update, can explain and build the normalized version, knows that
  collapsing by unmounting loses inner state, caps the indent, and can say
  when the flat version wins (deep edits, virtualization, load-more).
