export type Kind = "file" | "folder";

export interface Entry {
  id: string;
  name: string;
  kind: Kind;
}

export const ROOT: Entry = { id: "root", name: "project", kind: "folder" };

/** Folders first, then by name. `numeric` puts "file2" before "file10". */
export function sortEntries<T extends Entry>(entries: T[]): T[] {
  return [...entries].sort((a, b) =>
    a.kind === b.kind
      ? a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" })
      : a.kind === "folder"
        ? -1
        : 1,
  );
}

/** Returns an error message, or null if the name is fine. */
export function validateName(raw: string, siblings: Entry[]): string | null {
  const name = raw.trim();
  if (!name) return "Name can't be empty.";
  if (/[\\/]/.test(name)) return "Name can't contain / or \\.";
  // Case-insensitive, like the default macOS and Windows file systems.
  if (siblings.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
    return `"${name}" already exists here.`;
  }
  return null;
}

// ---------- Version 1: nested tree ----------

export interface TreeNode extends Entry {
  /**
   * Folders only. `undefined` means "not loaded yet", which is different from
   * `[]`, "loaded, and empty". Mixing the two up either refetches empty
   * folders forever or never fetches unopened ones.
   */
  children?: TreeNode[];
}

/**
 * Replace the node with `id` by `fn(node)`, or remove it if `fn` returns
 * null. Copies only the folders on the path down to it.
 */
export function updateNode(
  node: TreeNode,
  id: string,
  fn: (node: TreeNode) => TreeNode | null,
): TreeNode | null {
  if (node.id === id) return fn(node);
  if (!node.children) return node;

  let changed = false;
  const children: TreeNode[] = [];
  for (const child of node.children) {
    const next = updateNode(child, id, fn);
    if (next !== child) changed = true;
    if (next) children.push(next);
  }
  return changed ? { ...node, children } : node;
}

// ---------- Version 2: flat table (the React docs' "normalized" shape) ----------

export interface FlatNode extends Entry {
  /** Folders only. */
  childIds?: string[];
}

export type FileTable = Record<string, FlatNode>;

/** The whole tree up front, like the React docs' `initialTravelPlan`. No server. */
export const initialTable: FileTable = {
  root: { ...ROOT, childIds: ["src", "public", "pkg", "readme"] },
  src: { id: "src", name: "src", kind: "folder", childIds: ["components", "app", "main"] },
  components: { id: "components", name: "components", kind: "folder", childIds: ["button", "modal", "icons"] },
  icons: { id: "icons", name: "icons", kind: "folder", childIds: [] },
  button: { id: "button", name: "Button.tsx", kind: "file" },
  modal: { id: "modal", name: "Modal.tsx", kind: "file" },
  app: { id: "app", name: "App.tsx", kind: "file" },
  main: { id: "main", name: "main.tsx", kind: "file" },
  public: { id: "public", name: "public", kind: "folder", childIds: ["favicon"] },
  favicon: { id: "favicon", name: "favicon.svg", kind: "file" },
  pkg: { id: "pkg", name: "package.json", kind: "file" },
  readme: { id: "readme", name: "README.md", kind: "file" },
};

export function addToTable(
  table: FileTable,
  parentId: string,
  entry: FlatNode,
): FileTable {
  const parent = table[parentId];
  return {
    ...table,
    [entry.id]: entry,
    [parentId]: { ...parent, childIds: [...(parent.childIds ?? []), entry.id] },
  };
}

export function renameInTable(table: FileTable, id: string, name: string): FileTable {
  return { ...table, [id]: { ...table[id], name } };
}

/**
 * Two steps, as in the React docs: drop the id from its parent's `childIds`,
 * then forget the item and its whole subtree so the table doesn't keep
 * entries nothing points to.
 */
export function removeFromTable(
  table: FileTable,
  parentId: string,
  id: string,
): FileTable {
  const next = { ...table };
  const parent = next[parentId];
  next[parentId] = {
    ...parent,
    childIds: parent.childIds?.filter((c) => c !== id),
  };
  const stack = [id];
  while (stack.length) {
    const current = stack.pop()!;
    stack.push(...(next[current]?.childIds ?? []));
    delete next[current];
  }
  return next;
}
