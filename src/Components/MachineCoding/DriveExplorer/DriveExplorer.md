# Google Drive–like file explorer (frontend HLD + mini build)

> **The prompt:** "Design and implement a Google Drive–like file explorer UI."
>
> This is two questions at once. The *design* half: list what a real Drive
> needs, and explain how the frontend is structured to support it. The
> *build* half: a small working version in the time you have. The mistake is
> trying to build everything; the other mistake is designing without shipping
> anything. Say the full picture, then build a clear slice of it.

Runnable demo: [`DriveExplorer.tsx`](./DriveExplorer.tsx) (layout and state) ·
[`ItemsView.tsx`](./ItemsView.tsx) (grid and list) · data and helpers:
[`driveData.ts`](./driveData.ts) · reused from the
[file explorer](../FileExplorer/FileExplorer.md):
[`NameForm`](../FileExplorer/NameForm.tsx), `validateName`, `sortEntries`

---

## 1. How to run the interview

1. **Requirements (5 min).** Functional and non-functional, then agree on
   what you'll build (section 2).
2. **Design (10–15 min).** Components, state and data model, API, and how
   you'd handle scale (sections 3–8).
3. **Build (25–30 min).** The slice agreed in step 1 (section 9).
4. **Wrap up (5 min).** What you'd add next and why (section 10).

Keep saying *why* you're leaving something out. "I'll mention virtualization
but not build it, because with 20 items it changes nothing on screen" is a
good answer. Silence about it is a bad one.

---

## 2. Requirements

### Functional

| Requirement | Built here? |
| --- | --- |
| Browse folders; open a folder to see its contents | ✅ |
| Breadcrumbs showing where you are, each part clickable | ✅ |
| Create folder / file (real Drive: upload) | ✅ (create by name; upload mentioned) |
| Rename | ✅ |
| Delete (real Drive: move to Trash, restore) | ✅ (permanent delete; Trash mentioned) |
| Grid and list views | ✅ |
| Search by name across the whole drive | ✅ (in memory) |
| Sort (name, date, size) | Folders-first by name only |
| Move items (drag and drop, or "Move to…") | ❌ mentioned |
| Multi-select (click, Shift-click, Ctrl-click) and bulk actions | ❌ mentioned |
| Preview files, open in an editor | ❌ mentioned |
| Share, permissions, starred, recent | ❌ out of scope |

### Non-functional

| Requirement | How it's handled |
| --- | --- |
| Fast with big folders (10,000+ items) | Paginate from the server, virtualize the list (section 7). |
| Feels instant | Optimistic updates for create / rename / delete / move (section 6). |
| Search doesn't hammer the server | Debounce, cancel stale requests (section 7). |
| Works with keyboard and screen readers | Real buttons, labelled actions, breadcrumb semantics, announcements (section 8). |
| Works on phones | Sidebar collapses; grid adapts to width. |
| Deep links and Back button | Current folder lives in the URL (section 5). |
| Consistent across tabs / devices | Refetch on focus, or push updates; handle edit conflicts (section 6). |

### Agreed build scope

Layout like Drive · add, rename, delete · grid / list toggle · breadcrumbs ·
search. **Not built**, only discussed: debouncing, virtualization, drag and
drop, upload, Trash, multi-select, URL routing. Each would take real
interview time without showing anything new about the core design.

---

## 3. Layout and components

```
DriveExplorer                    ← owns state
├── Header
│   ├── Logo
│   ├── SearchBar                (query)
│   └── ViewToggle               (grid | list)
├── Sidebar
│   ├── New buttons              (+ Folder, + File)
│   ├── Nav: My Drive            (real app: Recent, Starred, Trash…)
│   └── Storage used
└── Main
    ├── Breadcrumbs | "N results for …"
    ├── NameForm                 (while creating)
    └── ItemsView
        ├── GridView → ItemCard  (icon, name, meta, actions)
        └── ListView → table row (name, location, modified, size, actions)
```

- **Grid and list are one component with two layouts.** They show the same
  items with the same actions, so `ItemsView` takes the items and callbacks
  as props and picks a layout. Neither layout owns any state. Adding a third
  view (say, a compact list) is one more branch, not a new data path.
- **Layout is CSS grid:** header across the top, sidebar and main below. On
  narrow screens ([`useMediaQuery`](../../Hooks/useMediaQuery/useMediaQuery.ts))
  the sidebar stacks above the main area instead of beside it.
- **The list view is a real `<table>`** with column headers — it *is*
  tabular data, and screen readers can then read "Modified, 15 Sep 2026" per
  cell.

---

## 4. State and data model

### What's stored

```ts
interface DriveItem {
  id: string;
  name: string;
  kind: "file" | "folder";
  parentId: string | null;   // null only for "My Drive"
  modifiedAt: string;
  size?: number;             // files only
}
type DriveTable = Record<string, DriveItem>;
```

Plus a few UI choices: `folderId` (where you are), `view`, `query`, and which
item is being created or renamed.

### Why `parentId` (and not `childIds`) this time

The [file explorer](../FileExplorer/FileExplorer.md) used the React docs'
`childIds` shape. Here each item points **up** at its parent instead. Why:

- **It's how the server stores it.** A files table with a `parent_id`
  column. The client cache matches the API one to one.
- **Breadcrumbs are a walk up:** start at the current folder and follow
  `parentId` to the root.
- **Moving an item changes one field.** With `childIds` you edit two arrays
  and must keep them in step.
- **Search is a filter over one table**, and each result's location is its
  path up.

The cost: listing a folder's children means filtering the table
(`childrenOf`). In memory that's instant; on the server it's an index on
`parent_id`. Deleting a folder means finding everything below it, which with
upward links takes repeated passes (see `removeItem`).

The analogy: a staff list where each person names their manager. "Who's my
boss's boss?" is easy — just follow the names up. "Who works under this
manager?" means looking through the list. Drive asks the first question on
every screen (breadcrumbs) and the second only when you open a folder, which
the server answers with an index.

### What's derived, never stored

```ts
const items = searching ? searchItems(table, query) : childrenOf(table, folderId);
const path  = pathTo(table, folderId);
const used  = sum of sizes;
```

Children, breadcrumbs, search results and storage used are all worked out
from the table on each render. Storing any of them as separate state means
remembering to update it after every rename, delete and move — and one day
forgetting. React's docs put it as: don't keep in state what you can compute.

---

## 5. Navigation and URLs

In the build, the current folder is `useState`. In a real app it belongs in
the URL:

```
/drive/my-drive
/drive/folders/:folderId
/drive/search?q=roadmap
```

That gives you, for free: the Back button goes to the previous folder; a
folder link can be shared or bookmarked; refreshing keeps you where you were.
With a router (React Router, Next.js), opening a folder is a navigation, and
the page reads `folderId` from the route.

**Breadcrumbs:** every part but the last is a button; the last is plain text
with `aria-current="page"`, inside `<nav aria-label="Breadcrumb"><ol>…`. For
deep paths, collapse the middle into "…" with a menu, keeping the first and
last two.

**Loading breadcrumbs from a server:** the client may not have every
ancestor cached when you deep-link to a folder. The API should return the
path with the folder (`GET /folders/:id` → `{ folder, path: [...] }`), so
breadcrumbs render in one round trip.

---

## 6. API and client data

### Endpoints

| Call | Purpose |
| --- | --- |
| `GET /folders/:id/children?cursor=…&sort=name` | One page of a folder's items. |
| `GET /folders/:id` | The folder itself plus its path (for breadcrumbs). |
| `POST /items` `{ name, kind, parentId }` | Create a folder (files come from upload). |
| `PATCH /items/:id` `{ name?, parentId? }` | Rename and move are the same call. |
| `DELETE /items/:id` | Move to Trash (a flag, not a real delete). |
| `POST /items/:id/restore` | Restore from Trash. |
| `GET /search?q=…&cursor=…` | Search across everything the user can see. |
| `POST /uploads` → upload URL, then `PUT` the bytes | Uploads go straight to storage, not through the app server; big files upload in resumable chunks. |

Name clashes are checked on the server too (the client check is just for a
quick message). The server returns `409 Conflict`, and the UI shows the same
error as the client check would.

### Client cache

- **Normalized by id**, as in the build: one entry per item, so renaming a
  file updates it everywhere it appears — in its folder, in search results,
  in "Recent".
- **Folder listings cached per folder** (which ids, in what order, and the
  next page cursor). Reopening a folder shows the cached list at once and
  refreshes it in the background (stale-while-revalidate).
- A library like **TanStack Query** does the caching, background refresh,
  request de-duplication and retries. Hand-rolling it is a good interview
  talking point, not a good production choice.

### Optimistic updates

Rename, delete, create and move change the screen immediately, then send the
request. If it fails, undo the change and show an error ("Couldn't rename —
name already taken"). Delete in Drive shows an **Undo** toast instead of a
confirm dialog: faster for the common case, safe for the mistake. See
[`useOptimistic`](../../Hooks/useOptimistic/useOptimistic.md).

### Other tabs and devices

Refetch the open folder when the tab regains focus, or subscribe to changes
(WebSocket / server-sent events) and apply them to the cache. For edits that
race — two people rename the same file — send the version you last saw
(`If-Match` / an ETag); the server rejects stale writes and the client
refetches.

---

## 7. Performance at scale (mentioned, not built)

| Problem | Fix | Why it's not in the build |
| --- | --- | --- |
| Folder with 10,000 items | Server pagination (cursor) + infinite scroll, and a **virtualized** list/grid that only renders what's on screen. See [VirtualList](../VirtualList/VirtualList.md), [InfiniteScroll](../InfiniteScroll/InfiniteScroll.md). | The demo has a dozen items; virtualizing changes nothing visible. |
| Search on every keystroke | **Debounce** (~300ms) and **cancel** the previous request with `AbortController`, so a slow old response can't overwrite a newer one. See [DebouncedSearch](../DebouncedSearch/DebouncedSearch.md). | In memory, filtering is instant. `useDeferredValue` would cover a slow in-memory filter. |
| Many thumbnails | `loading="lazy"`, server-generated small thumbnails, fixed sizes to stop the layout jumping. | No images in the demo. |
| Opening a folder feels slow | Prefetch a folder's first page on hover or focus. | Nothing to fetch. |
| Heavy previewers (PDF, video) | Load their code only when opened (`React.lazy`). | No preview. |

---

## 8. Interactions and accessibility

- **Folders are buttons, files are text** in this build. Real Drive: single
  click selects, double click (or Enter) opens. Selection needs its own
  state (a `Set` of ids plus an "anchor" for Shift-click ranges) and a
  toolbar that acts on the selection.
- **Actions per item** here are visible Rename / Delete buttons with labels
  like "Rename Budget 2026.xlsx". Real Drive uses a "⋮" menu and a
  right-click context menu; both need the ARIA menu pattern (arrow keys,
  Escape, focus return).
- **Drag and drop to move:** native drag and drop onto folder cards and
  breadcrumbs, with a keyboard-friendly "Move to…" dialog as the
  non-drag route. Refuse dropping a folder into itself or its own
  descendants — walk up `parentId` from the target. See
  [KanbanBoard](../KanbanBoard/KanbanBoard.md) for the drag details.
- **Upload:** a button plus dropping files from the desktop onto the page,
  with a progress panel per file.
- **View toggle** buttons use `aria-pressed`, in a labelled group. Remember
  the choice in `localStorage` (see
  [`useLocalStorage`](../../Hooks/useLocalStorage/useLocalStorage.ts)).
- **Search** is `type="search"`, labelled, Escape clears it. The result count
  heading tells everyone how many matched.
- **Empty states** say what to do next ("Use + Folder or + File"), not just
  "Nothing here".

---

## 9. The build: decisions worth pointing out

**Create and rename share one form.** [`NameForm`](../FileExplorer/NameForm.tsx)
(from the file explorer) checks the name: not empty, no slashes, no clash
with another item in the same folder, ignoring case. For rename, the item
itself is left out of that list — otherwise renaming `notes.docx` to
`Notes.docx` would clash with itself.

**Rename selects the name, not the extension.** Focusing the rename box
selects `Budget 2026` in `Budget 2026.xlsx`, so typing replaces the name and
keeps the file type — what Finder and Drive do.

**Renaming from search results checks the right folder.** A search result
can live anywhere, so the clash check uses *that item's* folder
(`childrenOf(table, item.parentId)`), not the folder on screen.

**Deleting the folder you're in.** Search can show the folder you're
currently inside, or one above it. Delete it, and `folderId` points at
nothing. After a delete, if the current folder is gone, go back to My Drive.

**Deleting a folder with contents asks first.** `window.confirm` keeps the
build short; the real answer is Trash plus an Undo toast (section 6).

**New items go in the current folder.** Clicking "+ Folder" during a search
leaves the search first, so it's clear where the new folder will appear.

**Everything shown is derived.** Children, breadcrumbs, search results,
storage used — computed from the table each render, so rename / delete /
create can never leave them out of date.

---

## 10. Follow-ups to expect

| They ask | Short answer |
| --- | --- |
| "Add multi-select and bulk delete." | `selected: Set<string>` + an anchor id for Shift ranges; Ctrl/Cmd toggles one. A toolbar appears when the set isn't empty. Clear it when the folder changes. |
| "Add sorting by column in list view." | `sort: { key, direction }` state; sort the derived list (keep folders first). Clickable column headers with `aria-sort`. |
| "Add Trash." | Delete sets `trashedAt`; normal views filter it out; a Trash view shows only those; restore clears it; a job empties items older than 30 days. |
| "Two tabs open, rename in one." | Refetch on focus, or push updates. Normalized cache means one update fixes every place the item appears. |
| "Upload a 2 GB file." | Chunked, resumable upload straight to storage with a signed URL; progress per chunk; retry failed chunks; allow cancel. |
| "Folder sizes?" | Expensive to compute live; the server keeps a running total per folder, or shows "—" as Drive does. |
| "Offline?" | Cache folder listings (IndexedDB), queue edits while offline, replay on reconnect, and deal with conflicts. |
| "Why not keep `childIds` like the file explorer?" | Either works. `parentId` matches the database, makes breadcrumbs and moves simple, and search is one filter. `childIds` makes listing a folder a direct lookup. Section 4. |

---

## 11. Scoring notes

- **Mid:** a working folder view with create and delete, maybe a grid,
  navigation by keeping the current folder in state.
- **Senior:** clear requirements with an explicit build scope; one normalized
  table with derived children, breadcrumbs and search; grid and list as two
  layouts of one component; name validation shared by create and rename;
  handles deleting the current folder; and can talk through URLs, the API,
  caching with optimistic updates, pagination plus virtualization, debounced
  search with cancellation, drag-to-move with the cycle check, and
  accessibility — while knowing which of those to *not* build in 45 minutes.
