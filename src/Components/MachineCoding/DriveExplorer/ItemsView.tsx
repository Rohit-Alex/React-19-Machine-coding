import { NameForm } from "../FileExplorer/NameForm";
import { formatBytes, iconFor, pathTo } from "./driveData";
import type { DriveItem, DriveTable } from "./driveData";

export type View = "grid" | "list";

interface ItemsViewProps {
  items: DriveItem[];
  view: View;
  table: DriveTable;
  /** Search results come from anywhere, so show where each one lives. */
  showLocation: boolean;
  renamingId: string | null;
  onOpenFolder: (id: string) => void;
  onStartRename: (id: string | null) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (item: DriveItem) => void;
  siblingsOf: (item: DriveItem) => DriveItem[];
}

// Read by screen readers, not shown: the actions column needs a header name.
const visuallyHidden = {
  position: "absolute",
  width: 1,
  height: 1,
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
} as const;

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

// Grid and list are two layouts of the same items with the same actions.
// Everything they can do comes in through props; neither owns any state.
export const ItemsView = (props: ItemsViewProps) => {
  const { items, view, table, showLocation, renamingId, onOpenFolder } = props;

  const nameCell = (item: DriveItem) =>
    item.id === renamingId ? (
      <NameForm
        label={`Rename ${item.name}`}
        initialName={item.name}
        submitLabel="Rename"
        siblings={props.siblingsOf(item)}
        onSubmit={(name) => props.onRename(item.id, name)}
        onCancel={() => props.onStartRename(null)}
      />
    ) : item.kind === "folder" ? (
      // Folders open; files have nothing to open in this build (a preview
      // would go here).
      <button onClick={() => onOpenFolder(item.id)} style={{ textAlign: "left" }}>
        <span aria-hidden="true">{iconFor(item)}</span> {item.name}
      </button>
    ) : (
      <span>
        <span aria-hidden="true">{iconFor(item)}</span> {item.name}
      </span>
    );

  const actions = (item: DriveItem) => (
    <span className="demo-actions" style={{ margin: 0 }}>
      <button onClick={() => props.onStartRename(item.id)} aria-label={`Rename ${item.name}`}>
        Rename
      </button>
      <button onClick={() => props.onDelete(item)} aria-label={`Delete ${item.name}`}>
        Delete
      </button>
    </span>
  );

  const location = (item: DriveItem) => {
    const parent = item.parentId!;
    return (
      <button onClick={() => onOpenFolder(parent)} aria-label={`Open folder containing ${item.name}`}>
        {pathTo(table, parent).map((p) => p.name).join(" / ")}
      </button>
    );
  };

  if (view === "grid") {
    return (
      <ul
        style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: 12,
        }}
      >
        {items.map((item) => (
          <li
            key={item.id}
            style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 10, minWidth: 0 }}
          >
            <div aria-hidden="true" style={{ fontSize: 36, textAlign: "center" }}>
              {iconFor(item)}
            </div>
            <div style={{ overflowWrap: "anywhere" }}>{nameCell(item)}</div>
            <small>
              {formatDate(item.modifiedAt)}
              {item.size !== undefined && ` · ${formatBytes(item.size)}`}
            </small>
            {showLocation && <div>{location(item)}</div>}
            {item.id !== renamingId && actions(item)}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
        <thead>
          <tr>
            <th scope="col">Name</th>
            {showLocation && <th scope="col">Location</th>}
            <th scope="col">Modified</th>
            <th scope="col">Size</th>
            <th scope="col">
              <span style={visuallyHidden}>Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} style={{ borderTop: "1px solid var(--border)" }}>
              <td style={{ padding: "4px 8px 4px 0" }}>{nameCell(item)}</td>
              {showLocation && <td>{location(item)}</td>}
              <td>{formatDate(item.modifiedAt)}</td>
              {/* Folders show a dash, as in Drive: their size isn't one number you can read off. */}
              <td>{item.size !== undefined ? formatBytes(item.size) : "—"}</td>
              <td>{item.id !== renamingId && actions(item)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
