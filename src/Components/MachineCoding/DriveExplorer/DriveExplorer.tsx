import { useState } from "react";
import { useMediaQuery } from "../../Hooks/useMediaQuery/useMediaQuery";
import { NameForm } from "../FileExplorer/NameForm";
import type { Kind } from "../FileExplorer/fileTree";
import {
  ROOT_ID,
  addItem,
  childrenOf,
  formatBytes,
  initialTable,
  pathTo,
  removeItem,
  renameItem,
  searchItems,
} from "./driveData";
import type { DriveItem } from "./driveData";
import { ItemsView } from "./ItemsView";
import type { View } from "./ItemsView";

export const DriveExplorer = () => {
  // The data, and the few UI choices that aren't derived from it.
  const [table, setTable] = useState(initialTable);
  const [folderId, setFolderId] = useState(ROOT_ID);
  const [view, setView] = useState<View>("grid");
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState<Kind | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const narrow = useMediaQuery("(max-width: 640px)");

  // Everything else is worked out on each render. No debounce: filtering a
  // table in memory is instant. With a server search you'd debounce and
  // cancel stale requests (see the DebouncedSearch topic).
  const searching = query.trim() !== "";
  const items = searching ? searchItems(table, query) : childrenOf(table, folderId);
  const path = pathTo(table, folderId);
  const used = Object.values(table).reduce((sum, item) => sum + (item.size ?? 0), 0);

  const openFolder = (id: string) => {
    setFolderId(id);
    setQuery("");
    setCreating(null);
    setRenamingId(null);
  };

  const startCreating = (kind: Kind) => {
    setQuery(""); // New items go in the current folder, so leave search first.
    setRenamingId(null);
    setCreating(kind);
  };

  const create = (name: string) => {
    const kind = creating!;
    setTable((t) =>
      addItem(t, {
        id: crypto.randomUUID(),
        name,
        kind,
        parentId: folderId,
        modifiedAt: new Date().toISOString(),
        ...(kind === "file" && { size: 0 }),
      }),
    );
    setCreating(null);
  };

  const remove = (item: DriveItem) => {
    const hasContents = item.kind === "folder" && childrenOf(table, item.id).length > 0;
    if (hasContents && !window.confirm(`Delete "${item.name}" and everything in it?`)) return;
    const next = removeItem(table, item.id);
    setTable(next);
    // From search you can delete the folder you're in, or one above it.
    // Don't leave the view pointing at a folder that no longer exists.
    if (!next[folderId]) setFolderId(ROOT_ID);
  };

  const panel = { padding: 12, minWidth: 0 } as const;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: narrow ? "1fr" : "180px 1fr",
        border: "1px solid var(--border)",
        borderRadius: 8,
        minHeight: 420,
        background: "var(--bg)",
      }}
    >
      <header
        style={{
          ...panel,
          gridColumn: "1 / -1",
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          alignItems: "center",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <strong style={{ marginRight: 8 }}>
          <span aria-hidden="true">🗂️</span> Drive
        </strong>
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setRenamingId(null);
          }}
          onKeyDown={(e) => e.key === "Escape" && setQuery("")}
          placeholder="Search in Drive"
          aria-label="Search in Drive"
          style={{ flex: "1 1 200px", font: "inherit", padding: "6px 10px" }}
        />
        <div className="demo-actions" role="group" aria-label="View" style={{ margin: 0 }}>
          {(["grid", "list"] as const).map((v) => (
            <button key={v} aria-pressed={view === v} onClick={() => setView(v)}>
              {v === "grid" ? "▦ Grid" : "☰ List"}
            </button>
          ))}
        </div>
      </header>

      <nav
        aria-label="Drive"
        style={{
          ...panel,
          borderRight: narrow ? undefined : "1px solid var(--border)",
          borderBottom: narrow ? "1px solid var(--border)" : undefined,
        }}
      >
        <div className="demo-actions" style={{ marginTop: 0 }}>
          <button onClick={() => startCreating("folder")}>+ Folder</button>
          <button onClick={() => startCreating("file")}>+ File</button>
        </div>
        <button
          aria-current={folderId === ROOT_ID && !searching ? "page" : undefined}
          onClick={() => openFolder(ROOT_ID)}
          style={{ fontWeight: folderId === ROOT_ID && !searching ? 700 : 400 }}
        >
          My Drive
        </button>
        <p>
          <small>{formatBytes(used)} used</small>
        </p>
      </nav>

      <main style={panel}>
        {searching ? (
          <h5 style={{ margin: "0 0 12px" }}>
            {items.length} result{items.length === 1 ? "" : "s"} for “{query.trim()}”
          </h5>
        ) : (
          <nav aria-label="Breadcrumb">
            <ol style={{ listStyle: "none", display: "flex", flexWrap: "wrap", gap: 4, padding: 0, margin: "0 0 12px" }}>
              {path.map((folder, i) => (
                <li key={folder.id}>
                  {i > 0 && <span aria-hidden="true">› </span>}
                  {i === path.length - 1 ? (
                    <strong aria-current="page">{folder.name}</strong>
                  ) : (
                    <button onClick={() => openFolder(folder.id)}>{folder.name}</button>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}

        {creating && (
          <NameForm
            label={`New ${creating} name`}
            placeholder={creating === "file" ? "name.ext" : "Untitled folder"}
            submitLabel="Create"
            siblings={childrenOf(table, folderId)}
            onSubmit={create}
            onCancel={() => setCreating(null)}
          />
        )}

        {items.length > 0 ? (
          <ItemsView
            items={items}
            view={view}
            table={table}
            showLocation={searching}
            renamingId={renamingId}
            onOpenFolder={openFolder}
            onStartRename={(id) => {
              setCreating(null);
              setRenamingId(id);
            }}
            onRename={(id, name) => {
              setTable((t) => renameItem(t, id, name));
              setRenamingId(null);
            }}
            onDelete={remove}
            // Checked against the item's own folder, which in search results
            // isn't the folder on screen.
            siblingsOf={(item) => childrenOf(table, item.parentId!).filter((s) => s.id !== item.id)}
          />
        ) : (
          <p role="status">
            {searching ? "No files or folders match." : "This folder is empty. Use + Folder or + File."}
          </p>
        )}
      </main>
    </div>
  );
};
