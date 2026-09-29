import { useEffect, useState } from "react";
import { EntryRow } from "./EntryRow";
import { NameForm } from "./NameForm";
import { ROOT, sortEntries, updateNode } from "./fileTree";
import type { Kind, TreeNode } from "./fileTree";
import { useChildLoader } from "./useChildLoader";
import type { LoadStatus } from "./useChildLoader";

const listStyle = { listStyle: "none", paddingLeft: 20, margin: 0 } as const;

interface Api {
  status: Record<string, LoadStatus>;
  load: (folderId: string) => void;
  add: (parentId: string, node: TreeNode) => void;
  rename: (id: string, name: string) => void;
  remove: (id: string) => void;
}

// Renders itself for every child, like the docs' nested PlaceTree. Each node
// gets its whole subtree as an object.
interface NodeProps {
  node: TreeNode;
  isRoot: boolean;
  /** The parent's other children, for the rename name check. */
  siblings: TreeNode[];
  api: Api;
}

const Node = ({ node, isRoot, siblings, api }: NodeProps) => {
  // Local UI state. Collapsing a folder unmounts everything inside it, so the
  // open/closed state of inner folders is lost. The loaded data isn't: it
  // lives in the top-level tree, so reopening doesn't refetch.
  const [open, setOpen] = useState(isRoot);
  const [creating, setCreating] = useState<Kind | null>(null);
  const [renaming, setRenaming] = useState(false);

  // Fetch from the event that needs the data, not from an Effect watching
  // `open`. The root is the one exception: it loads on mount.
  const openFolder = () => {
    setOpen(true);
    if (!node.children) api.load(node.id);
  };

  const children = node.children;

  return (
    <li>
      {renaming ? (
        <NameForm
          label={`Rename ${node.name}`}
          initialName={node.name}
          submitLabel="Rename"
          siblings={siblings.filter((s) => s.id !== node.id)}
          onSubmit={(name) => {
            api.rename(node.id, name);
            setRenaming(false);
          }}
          onCancel={() => setRenaming(false)}
        />
      ) : (
        <EntryRow
          entry={node}
          open={open}
          expandable={node.kind === "folder" && (!children || children.length > 0)}
          status={api.status[node.id]}
          onToggle={() => (open ? setOpen(false) : openFolder())}
          onNew={(kind) => {
            setCreating(kind);
            openFolder();
          }}
          onRetry={() => api.load(node.id)}
          onRename={isRoot ? undefined : () => setRenaming(true)}
          onDelete={isRoot ? undefined : () => api.remove(node.id)}
        />
      )}
      {/* Nothing to draw for an empty folder, unless a new file is being typed into it. */}
      {open && children && (children.length > 0 || creating) && (
        <ul style={listStyle}>
          {creating && (
            <li>
              <NameForm
                label={`New ${creating} name`}
                placeholder={creating === "file" ? "name.ext" : "folder name"}
                submitLabel="Create"
                siblings={children}
                onSubmit={(name) => {
                  api.add(node.id, {
                    id: crypto.randomUUID(),
                    name,
                    kind: creating,
                    // A new folder is known to be empty; don't fetch it.
                    ...(creating === "folder" && { children: [] }),
                  });
                  setCreating(null);
                }}
                onCancel={() => setCreating(null)}
              />
            </li>
          )}
          {sortEntries(children).map((child) => (
            <Node key={child.id} node={child} isRoot={false} siblings={children} api={api} />
          ))}
        </ul>
      )}
    </li>
  );
};

export const RecursiveExplorer = () => {
  const [tree, setTree] = useState<TreeNode>({ ...ROOT });

  const update = (id: string, fn: (n: TreeNode) => TreeNode | null) =>
    setTree((t) => updateNode(t, id, fn) ?? t);

  // If the folder was deleted while loading, updateNode finds nothing and
  // returns the tree unchanged.
  const { status, load } = useChildLoader((folderId, entries) =>
    update(folderId, (n) => ({ ...n, children: entries.map((e) => ({ ...e })) })),
  );

  useEffect(() => load(ROOT.id), []);

  const api: Api = {
    status,
    load,
    add: (parentId, node) =>
      update(parentId, (p) => ({ ...p, children: [...(p.children ?? []), node] })),
    rename: (id, name) => update(id, (n) => ({ ...n, name })),
    remove: (id) => update(id, () => null),
  };

  return (
    <div className="demo-card">
      <h4>Version 1: nested tree, recursive component</h4>
      <ul style={{ ...listStyle, paddingLeft: 0 }}>
        <Node node={tree} isRoot siblings={[]} api={api} />
      </ul>
    </div>
  );
};
