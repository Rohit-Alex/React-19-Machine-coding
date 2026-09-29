// What an API usually sends: one flat list, each row pointing at its parent.
export interface Comment {
  id: string;
  parentId: string | null;
  author: string;
  text: string;
}

export const seedComments: Comment[] = [
  { id: "1", parentId: null, author: "asha", text: "Does anyone use scroll-snap for carousels?" },
  { id: "2", parentId: "1", author: "ben", text: "Yes, swipe comes for free." },
  { id: "3", parentId: "2", author: "asha", text: "What about infinite looping?" },
  { id: "4", parentId: "3", author: "chen", text: "That's where transform wins." },
  { id: "5", parentId: "1", author: "dev", text: "IntersectionObserver works for the index too." },
  { id: "6", parentId: null, author: "ella", text: "Recursive or flat state for comments?" },
  { id: "7", parentId: "6", author: "ben", text: "Flat, once you need to edit deep replies." },
];

// ---------- Version 1: nested tree ----------

export interface TreeNode extends Comment {
  replies: TreeNode[];
}

/** Flat list → tree in one pass. Parents can come after their children. */
export function buildTree(flat: Comment[]): TreeNode[] {
  const nodes = new Map<string, TreeNode>();
  for (const c of flat) nodes.set(c.id, { ...c, replies: [] });

  const roots: TreeNode[] = [];
  for (const c of flat) {
    const node = nodes.get(c.id)!;
    const parent = c.parentId === null ? undefined : nodes.get(c.parentId);
    // A reply whose parent is missing (deleted, not loaded) becomes a root
    // instead of silently disappearing.
    (parent ? parent.replies : roots).push(node);
  }
  return roots;
}

/**
 * Replace the node with `id` by `fn(node)`, or remove it if `fn` returns
 * null. Only the nodes on the path to it are copied; every other branch keeps
 * its old object, so `memo` can skip it.
 */
export function updateTree(
  nodes: TreeNode[],
  id: string,
  fn: (node: TreeNode) => TreeNode | null,
): TreeNode[] {
  let changed = false;
  const next: TreeNode[] = [];
  for (const node of nodes) {
    if (node.id === id) {
      changed = true;
      const updated = fn(node);
      if (updated) next.push(updated);
      continue;
    }
    const replies = updateTree(node.replies, id, fn);
    if (replies !== node.replies) {
      changed = true;
      next.push({ ...node, replies });
    } else {
      next.push(node);
    }
  }
  return changed ? next : nodes;
}

// ---------- Version 2: flat map ----------

export interface IndexedComment extends Comment {
  childIds: string[];
}

export interface CommentIndex {
  byId: Record<string, IndexedComment>;
  rootIds: string[];
}

/** Flat list → lookup table. Same one pass, but nothing nests. */
export function buildIndex(flat: Comment[]): CommentIndex {
  const byId: Record<string, IndexedComment> = {};
  for (const c of flat) byId[c.id] = { ...c, childIds: [] };

  const rootIds: string[] = [];
  for (const c of flat) {
    const parent = c.parentId === null ? undefined : byId[c.parentId];
    (parent ? parent.childIds : rootIds).push(c.id);
  }
  return { byId, rootIds };
}

export function addToIndex(index: CommentIndex, comment: Comment): CommentIndex {
  const { byId, rootIds } = index;
  const parent = comment.parentId === null ? undefined : byId[comment.parentId];
  return {
    byId: {
      ...byId,
      [comment.id]: { ...comment, childIds: [] },
      // Only the parent changes. No walking down from the root.
      ...(parent && {
        [parent.id]: { ...parent, childIds: [...parent.childIds, comment.id] },
      }),
    },
    rootIds: parent ? rootIds : [...rootIds, comment.id],
  };
}

/** Delete a comment and everything under it, without recursion. */
export function removeFromIndex(index: CommentIndex, id: string): CommentIndex {
  const target = index.byId[id];
  if (!target) return index;

  const byId = { ...index.byId };
  const stack = [id];
  while (stack.length) {
    const current = stack.pop()!;
    stack.push(...byId[current].childIds);
    delete byId[current];
  }

  const parent = target.parentId === null ? undefined : byId[target.parentId];
  if (parent) {
    byId[parent.id] = {
      ...parent,
      childIds: parent.childIds.filter((c) => c !== id),
    };
  }
  return {
    byId,
    rootIds: parent ? index.rootIds : index.rootIds.filter((r) => r !== id),
  };
}

export interface Row {
  id: string;
  depth: number;
}

/**
 * The tree, walked depth-first with an explicit stack, as a flat list of rows
 * in reading order. Collapsed comments keep their row but hide their replies.
 */
export function visibleRows(
  { byId, rootIds }: CommentIndex,
  collapsed: ReadonlySet<string>,
): Row[] {
  const rows: Row[] = [];
  // A stack is last-in, first-out, so push in reverse to pop in order.
  const stack: Row[] = rootIds.map((id) => ({ id, depth: 0 })).reverse();
  while (stack.length) {
    const row = stack.pop()!;
    rows.push(row);
    if (collapsed.has(row.id)) continue;
    const kids = byId[row.id].childIds;
    for (let i = kids.length - 1; i >= 0; i--) {
      stack.push({ id: kids[i], depth: row.depth + 1 });
    }
  }
  return rows;
}
