import type { Entry, Kind } from "./fileTree";
import type { LoadStatus } from "./useChildLoader";

interface EntryRowProps {
  entry: Entry;
  open: boolean;
  /**
   * Show the chevron. True for folders that aren't loaded yet (they might
   * have contents) or have children; false for files and known-empty folders.
   */
  expandable: boolean;
  status?: LoadStatus;
  onToggle: () => void;
  onNew: (kind: Kind) => void;
  onRetry: () => void;
  /** Left out for the root, which can't be renamed or deleted. */
  onRename?: () => void;
  onDelete?: () => void;
}

// What one line of the explorer looks like. Both versions share it, so their
// files only differ in how the tree is stored and walked.
export const EntryRow = ({ entry, open, expandable, status, onToggle, onNew, onRetry, onRename, onDelete }: EntryRowProps) => {
  const isFolder = entry.kind === "folder";
  // Same width with or without the arrow, so names line up down the column.
  const chevron = (
    <span aria-hidden="true" style={{ display: "inline-block", width: "1em" }}>
      {expandable ? (open ? "▾" : "▸") : ""}
    </span>
  );
  return (
    <div className="demo-actions" style={{ alignItems: "center", margin: "2px 0" }}>
      {expandable ? (
        // Only rows that can open are buttons. A file or a known-empty folder
        // is plain text, so there's nothing to click that would do nothing.
        // The arrow is aria-hidden: aria-expanded already tells screen readers.
        <button aria-expanded={open} onClick={onToggle}>
          {chevron}
          <span aria-hidden="true">{open ? "📂" : "📁"}</span> {entry.name}
        </button>
      ) : (
        <span>
          {chevron}
          <span aria-hidden="true">{isFolder ? "📁" : "📄"}</span> {entry.name}
        </span>
      )}
      {isFolder && (
        <>
          <button onClick={() => onNew("file")} aria-label={`New file in ${entry.name}`}>
            + file
          </button>
          <button onClick={() => onNew("folder")} aria-label={`New folder in ${entry.name}`}>
            + folder
          </button>
        </>
      )}
      {onRename && (
        <button onClick={onRename} aria-label={`Rename ${entry.name}`}>
          Rename
        </button>
      )}
      {onDelete && (
        <button onClick={onDelete} aria-label={`Delete ${entry.name}`}>
          Delete
        </button>
      )}
      {status === "loading" && <span role="status">Loading…</span>}
      {status === "error" && (
        <span role="alert">
          Failed to load. <button onClick={onRetry}>Retry</button>
        </span>
      )}
    </div>
  );
};
