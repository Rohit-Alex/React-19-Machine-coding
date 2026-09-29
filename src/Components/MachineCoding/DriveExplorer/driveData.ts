import { sortEntries } from "../FileExplorer/fileTree";
import type { Kind } from "../FileExplorer/fileTree";

// Shaped like a database table: each item points at its parent. Children,
// breadcrumbs and search results are all worked out from this one table,
// never stored separately, so they can't fall out of sync with it.
export interface DriveItem {
  id: string;
  name: string;
  kind: Kind;
  /** null only for the root ("My Drive"). */
  parentId: string | null;
  modifiedAt: string; // ISO date
  /** Files only, in bytes. */
  size?: number;
}

export type DriveTable = Record<string, DriveItem>;

export const ROOT_ID = "root";

const seed: [id: string, name: string, kind: Kind, parentId: string | null, modifiedAt: string, size?: number][] = [
  ["root", "My Drive", "folder", null, "2026-01-01"],
  ["work", "Work", "folder", "root", "2026-09-10"],
  ["personal", "Personal", "folder", "root", "2026-08-02"],
  ["photos", "Photos", "folder", "personal", "2026-07-21"],
  ["q3", "Q3 planning", "folder", "work", "2026-09-12"],
  ["resume", "Resume.pdf", "file", "root", "2026-06-30", 184_320],
  ["notes", "Meeting notes.docx", "file", "work", "2026-09-15", 42_100],
  ["budget", "Budget 2026.xlsx", "file", "work", "2026-09-01", 96_400],
  ["roadmap", "Roadmap.pdf", "file", "q3", "2026-09-14", 1_240_000],
  ["okrs", "OKRs.docx", "file", "q3", "2026-09-13", 38_900],
  ["beach", "beach.jpg", "file", "photos", "2026-07-20", 3_420_000],
  ["hike", "hike.jpg", "file", "photos", "2026-07-21", 2_910_000],
  ["taxes", "Taxes 2025.pdf", "file", "personal", "2026-04-11", 512_000],
];

export const initialTable: DriveTable = Object.fromEntries(
  seed.map(([id, name, kind, parentId, modifiedAt, size]) => [
    id,
    { id, name, kind, parentId, modifiedAt, size },
  ]),
);

// ponytail: every helper below scans the whole table — fine in memory, and
// the server does these with an index on parent_id / name in the real thing.

export const childrenOf = (table: DriveTable, folderId: string) =>
  sortEntries(Object.values(table).filter((item) => item.parentId === folderId));

/** Root first, down to `id` itself. This is the breadcrumb trail. */
export function pathTo(table: DriveTable, id: string): DriveItem[] {
  const path: DriveItem[] = [];
  for (let item: DriveItem | undefined = table[id]; item; item = item.parentId ? table[item.parentId] : undefined) {
    path.unshift(item);
  }
  return path;
}

/** Case-insensitive name match across the whole drive, root excluded. */
export function searchItems(table: DriveTable, query: string): DriveItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return sortEntries(
    Object.values(table).filter((item) => item.id !== ROOT_ID && item.name.toLowerCase().includes(q)),
  );
}

export function addItem(table: DriveTable, item: DriveItem): DriveTable {
  return { ...table, [item.id]: item };
}

export function renameItem(table: DriveTable, id: string, name: string): DriveTable {
  return { ...table, [id]: { ...table[id], name, modifiedAt: new Date().toISOString() } };
}

/** Removes the item and everything inside it. */
export function removeItem(table: DriveTable, id: string): DriveTable {
  const doomed = new Set([id]);
  // Keep sweeping until a pass finds nothing new: each pass catches the next
  // level down. Items only point up, so this is how you find what's inside.
  for (let grew = true; grew; ) {
    grew = false;
    for (const item of Object.values(table)) {
      if (item.parentId && doomed.has(item.parentId) && !doomed.has(item.id)) {
        doomed.add(item.id);
        grew = true;
      }
    }
  }
  return Object.fromEntries(Object.entries(table).filter(([key]) => !doomed.has(key)));
}

export function formatBytes(bytes: number): string {
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}

export function iconFor(item: DriveItem): string {
  if (item.kind === "folder") return "📁";
  const ext = item.name.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "📕";
  if (ext === "xlsx" || ext === "csv") return "📊";
  if (ext === "jpg" || ext === "jpeg" || ext === "png") return "🖼️";
  return "📄";
}
