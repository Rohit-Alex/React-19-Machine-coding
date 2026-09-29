import { useEffect, useState } from "react";
import { EntryRow } from "./EntryRow";
import { NameForm } from "./NameForm";
import {
  ROOT,
  addToTable,
  initialTable,
  removeFromTable,
  renameInTable,
  setChildrenInTable,
  sortEntries,
} from "./fileTree";
import type { FileTable, Kind } from "./fileTree";
import { useChildLoader } from "./useChildLoader";
import type { LoadStatus } from "./useChildLoader";

const listStyle = { listStyle: "none", paddingLeft: 20, margin: 0 } as const;

interface Api {
  table: FileTable;
  expanded: ReadonlySet<string>;
  creating: { parentId: string; kind: Kind } | null;
  renamingId: string | null;
  status: Record<string, LoadStatus>;
  openFolder: (id: string) => void;
  closeFolder: (id: string) => void;
  startCreating: (parentId: string, kind: Kind) => void;
  cancelCreating: () => void;
  create: (parentId: string, name: string, kind: Kind) => void;
  startRenaming: (id: string | null) => void;
  rename: (id: string, name: string) => void;
  remove: (parentId: string, id: string) => void;
  load: (id: string) => void;
}

// Same recursion as the docs' normalized PlaceTree: it gets an id and looks
// the item up in the table, instead of receiving a nested object.
const FolderTree = ({ id, parentId, api }: { id: string; parentId: string | null; api: Api }) => {
  const node = api.table[id];
  const open = api.expanded.has(id);
  const childIds = node.childIds;
  const creating = api.creating?.parentId === id ? api.creating.kind : null;
  const children = childIds ? sortEntries(childIds.map((c) => api.table[c])) : undefined;

  return (
    <li>
      {api.renamingId === id && parentId !== null ? (
        <NameForm
          label={`Rename ${node.name}`}
          initialName={node.name}
          submitLabel="Rename"
          // The parent's other children: one lookup, since the parent is in the table.
          siblings={(api.table[parentId].childIds ?? [])
            .filter((c) => c !== id)
            .map((c) => api.table[c])}
          onSubmit={(name) => api.rename(id, name)}
          onCancel={() => api.startRenaming(null)}
        />
      ) : (
        <EntryRow
          entry={node}
          open={open}
          expandable={node.kind === "folder" && (!childIds || childIds.length > 0)}
          status={api.status[id]}
          onToggle={() => (open ? api.closeFolder(id) : api.openFolder(id))}
          onNew={(kind) => api.startCreating(id, kind)}
          onRetry={() => api.load(id)}
          onRename={parentId === null ? undefined : () => api.startRenaming(id)}
          onDelete={parentId === null ? undefined : () => api.remove(parentId, id)}
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
                onSubmit={(name) => api.create(id, name, creating)}
                onCancel={api.cancelCreating}
              />
            </li>
          )}
          {children.map((child) => (
            <FolderTree key={child.id} id={child.id} parentId={id} api={api} />
          ))}
        </ul>
      )}
    </li>
  );
};

export const FlatMapExplorer = () => {
  const [table, setTable] = useState(initialTable);
  // UI state lives up here, keyed by id, so collapsing a folder doesn't
  // forget which folders inside it were open.
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set([ROOT.id]));
  const [creating, setCreating] = useState<Api["creating"]>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);

  const { status, load } = useChildLoader((folderId, entries) =>
    setTable((t) => setChildrenInTable(t, folderId, entries)),
  );

  useEffect(() => load(ROOT.id), []);

  const openFolder = (id: string) => {
    setExpanded((prev) => new Set(prev).add(id));
    if (!table[id].childIds) load(id);
  };

  const api: Api = {
    table,
    expanded,
    creating,
    renamingId,
    status,
    load,
    openFolder,
    closeFolder: (id) =>
      setExpanded((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      }),
    startCreating: (parentId, kind) => {
      setCreating({ parentId, kind });
      openFolder(parentId);
    },
    cancelCreating: () => setCreating(null),
    create: (parentId, name, kind) => {
      setTable((t) =>
        addToTable(t, parentId, {
          id: crypto.randomUUID(),
          name,
          kind,
          ...(kind === "folder" && { childIds: [] }),
        }),
      );
      setCreating(null);
    },
    startRenaming: setRenamingId,
    rename: (id, name) => {
      setTable((t) => renameInTable(t, id, name));
      setRenamingId(null);
    },
    remove: (parentId, id) => setTable((t) => removeFromTable(t, parentId, id)),
  };

  return (
    <div className="demo-card">
      <h4>Version 2: flat table, recursive component by id</h4>
      <ul style={{ ...listStyle, paddingLeft: 0 }}>
        <FolderTree id={ROOT.id} parentId={null} api={api} />
      </ul>
    </div>
  );
};
