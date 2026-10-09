import { useState } from "react";
import { EntryRow } from "./EntryRow";
import { NameForm } from "./NameForm";
import {
  ROOT,
  addToTable,
  initialTable,
  removeFromTable,
  renameInTable,
  sortEntries,
} from "./fileTree";
import type { FileTable, FlatNode, Kind } from "./fileTree";

const listStyle = { listStyle: "none", paddingLeft: 20, margin: 0 } as const;

interface FolderTreeProps {
  id: string;
  parentId: string | null;
  table: FileTable;
  expanded: ReadonlySet<string>;
  onExpand: (id: string, open: boolean) => void;
  onAdd: (parentId: string, entry: FlatNode) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (parentId: string, id: string) => void;
}

// The docs' PlaceTree: it gets an id (and its parent's id, for delete) and
// looks the item up in the table, instead of receiving a nested object.
const FolderTree = (props: FolderTreeProps) => {
  const { id, parentId, table, expanded, onExpand, onAdd, onRename, onDelete } = props;
  // Typing a name only matters to this row, so it stays local, as in version 1.
  const [creating, setCreating] = useState<Kind | null>(null);
  const [renaming, setRenaming] = useState(false);

  const node = table[id];
  const open = expanded.has(id);
  const children = node.childIds && sortEntries(node.childIds.map((c) => table[c]));

  return (
    <li>
      {renaming && parentId !== null ? (
        <NameForm
          label={`Rename ${node.name}`}
          initialName={node.name}
          submitLabel="Rename"
          siblings={table[parentId].childIds!.filter((c) => c !== id).map((c) => table[c])}
          onSubmit={(name) => {
            onRename(id, name);
            setRenaming(false);
          }}
          onCancel={() => setRenaming(false)}
        />
      ) : (
        <EntryRow
          entry={node}
          open={open}
          expandable={node.kind === "folder" && (!children || children.length > 0)}
          onToggle={() => onExpand(id, !open)}
          onNew={(kind) => {
            setCreating(kind);
            onExpand(id, true);
          }}
          onRename={parentId === null ? undefined : () => setRenaming(true)}
          onDelete={parentId === null ? undefined : () => onDelete(parentId, id)}
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
                  onAdd(id, {
                    id: crypto.randomUUID(),
                    name,
                    kind: creating,
                    // A new folder is known to be empty; don't fetch it.
                    ...(creating === "folder" && { childIds: [] }),
                  });
                  setCreating(null);
                }}
                onCancel={() => setCreating(null)}
              />
            </li>
          )}
          {children.map((child) => (
            <FolderTree key={child.id} {...props} id={child.id} parentId={id} />
          ))}
        </ul>
      )}
    </li>
  );
};

export const FlatMapExplorer = () => {
  const [table, setTable] = useState(initialTable);
  // Lifted up and keyed by id, so collapsing a folder doesn't forget which
  // folders inside it were open.
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set([ROOT.id]));

  const handleExpand = (id: string, open: boolean) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (open) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  return (
    <div className="demo-card">
      <h4>Version 2: flat table, recursive component by id</h4>
      <ul style={{ ...listStyle, paddingLeft: 0 }}>
        <FolderTree
          id={ROOT.id}
          parentId={null}
          table={table}
          expanded={expanded}
          onExpand={handleExpand}
          onAdd={(parentId, entry) => setTable((t) => addToTable(t, parentId, entry))}
          onRename={(id, name) => setTable((t) => renameInTable(t, id, name))}
          onDelete={(parentId, id) => setTable((t) => removeFromTable(t, parentId, id))}
        />
      </ul>
    </div>
  );
};
