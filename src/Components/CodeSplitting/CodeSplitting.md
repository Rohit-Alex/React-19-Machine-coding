# Code splitting & lazy loading (`React.lazy`, `Suspense`)

> **The question:** "Our bundle is huge and the first load is slow. What do
> you do?" — or "What does `React.lazy` do, and what can go wrong?"
>
> Splitting is easy to turn on. The marks are for *where* you split, how you
> avoid spinners everywhere, and what happens when a chunk fails to load —
> which it will, after every deploy.

Runnable demo: [`index.tsx`](./index.tsx) · lazy panels:
[`HeavyReport.tsx`](./HeavyReport.tsx), [`HeavySettings.tsx`](./HeavySettings.tsx) ·
error boundary: [`ChunkErrorBoundary.tsx`](./ChunkErrorBoundary.tsx)

---

## 1. What splitting does

Without it, every component in the app goes into one JavaScript file. The
user downloads, parses and runs all of it before seeing anything — including
screens they may never open.

`import("./HeavyReport")` (a **dynamic import**) tells the bundler: put this
file and what only it uses into a separate **chunk**, and download it when
this line runs. Checked with `vite build` on this repo:
`HeavyReport-….js` and `HeavySettings-….js` come out as their own files,
next to the main `index-….js`.

```tsx
const Report = lazy(() => import("./HeavyReport"));    // needs a default export

<Suspense fallback={<p>Loading report…</p>}>
  <Report />
</Suspense>
```

`lazy` turns the import into a component. The first time it renders, it
**suspends**: React shows the nearest `<Suspense>` fallback until the chunk
arrives.

Analogy: a restaurant doesn't cook the whole menu when you sit down. It
brings the menu (the main bundle) and cooks each dish when you order it.

---

## 2. Where to split

| Split here | Why |
| --- | --- |
| **Routes / pages** | The biggest win for least effort: a user on `/home` never downloads `/admin`. Start here. |
| **Heavy, rarely-opened UI** | Rich-text editors, charts, maps, PDF viewers, emoji pickers. |
| **Modals and drawers** | Not on screen at load. |
| **Big libraries used in one place** | Import inside the event handler: `const { jsPDF } = await import("jspdf")` on "Export". |

**Don't split** small, always-visible parts — each chunk is an extra request,
and the header flashing a spinner is worse than a few KB.

This app is an example of the opposite: every demo, in every tab, is in the
main bundle. Splitting each tab with `lazy` would mean the Hooks tab never
downloads the Performance demos.

---

## 3. Preload before the click

```tsx
const loadReport = () => import("./HeavyReport");
const Report = lazy(loadReport);

<button onMouseEnter={loadReport} onFocus={loadReport} onClick={show}>Show report</button>
```

`lazy` only starts the download on first render — after the click. Calling
the same import on **hover or focus** starts it a few hundred ms earlier; by
the click it's often done. Other good moments: when the browser is idle
after load, or when a link scrolls into view (what Next.js does for links).

The demo keeps the download promise (`once()`), so hover and click share one
download, and forgets it on failure so a retry downloads again.

---

## 4. Avoiding spinner flashes: transitions

When something that's already on screen switches to a lazy component, the
nearest `Suspense` replaces the *whole* content with its fallback — a jarring
flash.

```tsx
startTransition(() => setTab("settings"));
```

Inside a transition, React keeps showing the **old** UI until the new one is
ready, and `isPending` lets you dim it. Fallbacks then only appear on first
load. Routers do this for navigation for you.

Also: **place `Suspense` boundaries deliberately.** One at the very top means
any lazy piece blanks the whole page. One around each lazy region keeps the
rest visible.

---

## 5. When a chunk fails to load

It will:
- a flaky mobile connection, or
- **a new deploy**: the open tab still references `HeavyReport-abc123.js`, but
  the server now only has `HeavyReport-def456.js`. Very common.

Without handling, the error goes up to the root and the whole app goes blank.

1. **An error boundary** around the lazy region shows "Couldn't load — Try
   again". Boundaries are still class components in React 19.
2. **Retry needs a new `lazy()`.** `lazy` caches its result *including
   failure*, so rendering the same one again fails immediately. The demo
   creates a fresh one on retry.
3. **After a deploy, retrying won't help** — the old file is gone. Common
   fix: on a chunk-load error, reload the page once (guard with
   `sessionStorage` so it can't loop), or keep old assets on the CDN for a
   while after each deploy.

---

## 6. Rules and gotchas

- **`lazy()` at module level, never inside a component.** Inside, it's a new
  component type every render: React remounts it, it suspends again, and you
  get an endless loading loop.
- **Default export required.** For named exports:
  `lazy(() => import("./x").then((m) => ({ default: m.Chart })))`.
- **Don't split what's needed for the first screen** — it adds a round trip
  before anything shows (a waterfall: main → chunk → data).
- **Server rendering**: `lazy` + `Suspense` stream on the server in React 18+;
  frameworks (Next.js, Remix) also add the chunk to the page so it starts
  downloading early.

---

## 7. Follow-ups to expect

| They ask | Short answer |
| --- | --- |
| "How do you find what to split?" | A bundle analyser (`rollup-plugin-visualizer`, `source-map-explorer`) to see what's big; the Coverage tab in Chrome DevTools to see how much downloaded code the first screen never runs. |
| "Chunk waterfalls." | A lazy page that then fetches data starts its fetch only after the chunk arrives. Start both together: route loaders, or kick off the fetch in the same handler that triggers the import. |
| "Too many tiny chunks?" | More requests; HTTP/2 makes it cheaper but not free. Group related code; let the bundler's `manualChunks` put rarely-changing libraries (React) in their own long-cached file. |
| "Images and fonts?" | Different tools: `loading="lazy"` on images, `font-display: swap`, responsive `srcset`. |
| "What else shrinks the main bundle?" | Tree-shakeable imports (`import { debounce } from "lodash-es"`, not all of lodash), dropping unused dependencies, smaller alternatives (date-fns vs moment). |

---

## 8. Scoring notes

- **Mid:** knows `lazy` + `Suspense`; splits something; one spinner at the top.
- **Senior:** splits by route first and justifies other splits; preloads on
  intent; uses transitions to avoid fallback flashes; places boundaries
  deliberately; handles chunk-load failure (boundary, fresh `lazy` on retry,
  the post-deploy reload); keeps `lazy` at module level; and checks the
  result with a bundle analyser.
