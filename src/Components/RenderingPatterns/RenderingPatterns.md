# Rendering Patterns Deep Dive

Where and when does the HTML get made? And when does the page start to respond
to clicks? Every pattern below is a different answer to those two questions.

Notes only, no demo: SSR, ISR and Server Components need a server or a
framework, and this repo is a Vite SPA (which is itself the CSR example).
Server-render output shown below was checked in Node with this project's
`react-dom` 19.2.8. Next.js APIs are from the Next.js 16 docs.

- [The two questions](#the-two-questions)
- [1. Client-side rendering (CSR)](#1-client-side-rendering-csr)
- [2. Server-side rendering (SSR) + hydration](#2-server-side-rendering-ssr--hydration)
- [3. Static site generation (SSG)](#3-static-site-generation-ssg)
- [4. Incremental static regeneration (ISR)](#4-incremental-static-regeneration-isr)
- [5. Streaming SSR](#5-streaming-ssr)
- [6. Selective hydration](#6-selective-hydration)
- [7. Progressive hydration](#7-progressive-hydration)
- [8. React Server Components (RSC)](#8-react-server-components-rsc)
- [Comparison table](#comparison-table)
- [Picking one](#picking-one)
- [Interview questions](#interview-questions)

---

## The two questions

People often say "SSR is faster than CSR". That mixes up two different moments:

1. **When can the user _see_ the content?** (First Contentful Paint / LCP)
2. **When can the user _use_ it?** (Time to Interactive / INP during load)

SSR wins the first one. It does nothing for the second, because the browser
still has to download and run the same JavaScript. Every pattern after SSR
exists to fix one of these two gaps:

| Problem | Patterns that fix it |
| --- | --- |
| Server render is slow per request | SSG, ISR (do the work once, ahead of time) |
| One slow piece of data delays the whole page | Streaming SSR |
| Page is visible but frozen until _all_ JS hydrates | Selective hydration, progressive hydration |
| Too much JavaScript ships at all | React Server Components |

Keep this table in your head. In an interview, explaining **which problem**
each pattern solves matters more than listing APIs.

---

## 1. Client-side rendering (CSR)

**Analogy: IKEA flat-pack furniture.** The store hands you a box of parts and
instructions. You build it at home. Delivery is cheap and fast, but you can't
sit on it until you finish building.

The server sends an almost empty page. The browser builds everything.

```html
<!-- what the server sends -->
<body>
  <div id="root"></div>
  <script type="module" src="/assets/index-abc123.js"></script>
</body>
```

```tsx
// main.tsx — this repo works exactly like this
import { createRoot } from "react-dom/client";
createRoot(document.getElementById("root")!).render(<App />);
```

**What happens, in order:**

```
HTML (empty) → download JS → run JS → render → fetch data → render again → images
              └──────────── user sees blank / spinner ────────────┘
```

That chain is a **waterfall**: each step waits for the one before. The data
fetch can't start until the JS that contains the fetch has run.

**Good at:**

- Cheap to host. It's just static files on a CDN.
- After the first load, moving between pages is fast. Only data is fetched.
- Simple mental model: no server/client split, no hydration bugs.

**Bad at:**

- **First load on slow phones.** Nothing shows until the bundle downloads and runs.
- **SEO and link previews.** Google does run JS, but later and with limits.
  Most social link previewers (Slack, WhatsApp, X) don't run JS at all, so
  they see an empty page.
- **Waterfalls**, as above.

**Use it for:** dashboards, admin tools, apps behind a login, anything where
SEO doesn't matter and users come back often (so the bundle is cached).

**Making CSR less slow:**

- Code-split routes (`React.lazy`) so the first bundle is small — see
  [CodeSplitting](../Performance/CodeSplitting/CodeSplitting.md).
- Start data fetches **in parallel** with code loading (route loaders, or kick
  off the fetch in the click handler before navigating), not in a `useEffect`
  after render.
- Put a skeleton in `index.html` itself so something shows before JS runs.

---

## 2. Server-side rendering (SSR) + hydration

**Analogy: a painted stage set.** The audience can see the whole scene right
away. But the actors haven't arrived yet. Ring the doorbell on the set and
nothing happens until an actor walks on and takes their place. **Hydration is
the actors arriving.**

On every request, the server runs your React components and sends real HTML.
Then the browser loads the same components and **hydrates**: React walks the
existing HTML, matches it to its component tree, and attaches event handlers.
It does **not** rebuild the DOM.

```tsx
// server.ts (Express) — the old, all-at-once way
import { renderToString } from "react-dom/server";

app.get("*", async (req, res) => {
  const data = await loadData(req.url);                  // 1. wait for ALL data
  const html = renderToString(<App data={data} />);      // 2. render ALL HTML
  res.send(`<!doctype html>
    <div id="root">${html}</div>
    <script>window.__DATA__ = ${serialize(data)}</script>
    <script type="module" src="/main.js"></script>`);
});
```

```tsx
// client.tsx
import { hydrateRoot } from "react-dom/client";
hydrateRoot(document.getElementById("root")!, <App data={window.__DATA__} />);
//            ^ not createRoot — createRoot would throw the server HTML away
```

**Why pass `__DATA__`?** The client render must produce the **same** output as
the server. If the client re-fetched, it would render a loading state first and
not match. So the server ships the data it used.

**Security gotcha:** `serialize` must escape `<`. A plain `JSON.stringify` of a
user's comment containing `</script><script>…` breaks out of the tag and runs
code (XSS). Use a library like `serialize-javascript`, or replace `<` with
`<`.

### The problem SSR leaves behind: all-or-nothing

Classic SSR has four steps, and each one waits for the whole previous step:

```
fetch ALL data → render ALL HTML → load ALL JS → hydrate ALL components
```

- One slow API call (say, recommendations) delays the **whole** page's first byte.
- One big component's JS delays hydration of **every** button.
- While hydration runs, the page **looks** ready but clicks do nothing. This is
  the "uncanny valley". It can be worse than CSR, where at least the spinner
  is honest.

Streaming SSR fixes the first point; selective hydration fixes the other two.

**Checked in Node:** `renderToString` does not support Suspense. When a
component suspends, it doesn't wait. It renders the fallback and marks that
boundary `<!--$!-->` ("render this on the client instead"):

```html
<main><h1>Post</h1><!--$!--><template data-msg="…The server used &quot;renderToString&quot;
which does not support Suspense…"></template><p>Loading comments…</p><!--/$--></main>
```

### Hydration mismatches

The first client render must match the server HTML exactly. React can recover
from some mismatches by re-rendering on the client, but that's slow, and you
should fix them like any other bug. Common causes:

| Cause | Fix |
| --- | --- |
| `new Date()`, `Math.random()` in render | Compute on the server and pass as a prop, or set it in `useEffect` |
| `typeof window !== "undefined"` branches | Render the same thing first, switch in `useEffect` |
| `localStorage`, `matchMedia` in render | `useSyncExternalStore` with a `getServerSnapshot` — see [useSyncExternalStore](../Hooks/useSyncExternalStore/useSyncExternalStore.md) |
| Generated ids (`id={Math.random()}`) | `useId` — see [useId](../Hooks/useId/useId.md) |
| Locale/timezone formatting differs server vs browser | Fix the locale and timezone, or format on the client |
| Invalid HTML (`<div>` inside `<p>`) | The browser "fixes" it, so the DOM no longer matches. Fix the markup |
| Unavoidable timestamp text | `suppressHydrationWarning` on that one element (one level deep only; React won't patch the text) |

```tsx
// ❌ different on server and client
function Greeting() {
  return <p>{typeof window === "undefined" ? "Hello" : `Hi ${localStorage.name}`}</p>;
}

// ✅ same first render everywhere, then update
function Greeting() {
  const [name, setName] = useState<string | null>(null);
  useEffect(() => setName(localStorage.getItem("name")), []);
  return <p>{name ? `Hi ${name}` : "Hello"}</p>;
}
```

**Use SSR for:** pages that need SEO **and** per-request data — product
pages with live stock, search results, personalized pages that still need
link previews.

**Costs:** a server running per request (money, scaling, cold starts), slower
TTFB than a CDN file, and the hydration bug class above.

---

## 3. Static site generation (SSG)

**Analogy: a printed newspaper.** It's printed once, overnight. Everyone gets
the same copy, instantly, from the corner shop. But it can't show anything
that happened after printing.

SSG is SSR done **at build time**. Each page becomes an `.html` file. A CDN
serves it. No server runs per request.

```tsx
// Plain React 19: prerender waits for ALL Suspense data, then gives final HTML
import { prerenderToNodeStream } from "react-dom/static";

const { prelude } = await prerenderToNodeStream(<App />);
// write prelude to dist/index.html
```

Checked in Node: with a component that suspends for data, `prerender` waited
and produced the final content, with no fallback in the output:

```html
<main><!--$--><p>done</p><!--/$--></main>
```

That's the difference from streaming. `prerender` is for files on disk, so
waiting is fine. Nobody is staring at a blank screen.

```tsx
// Next.js App Router: list the pages to build ahead of time
export async function generateStaticParams() {
  const posts = await fetch("https://…/posts").then((r) => r.json());
  return posts.map((p) => ({ slug: p.slug }));   // one HTML file per slug
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);
  return <article>{post.body}</article>;
}
```

The page still hydrates in the browser so buttons work. SSG only changes
**when** the HTML was made.

**Good at:** fastest possible first byte, cheapest, survives traffic spikes
(it's just files), nothing to break at runtime.

**Bad at:**

- **Stale content.** A typo fix needs a new build and deploy.
- **Build time grows with page count.** 100k products = 100k pages to render
  on every deploy.
- **No per-user content in the HTML.** Same file for everyone. Personal bits
  (cart count, "Hi Rohit") must load on the client after hydration.

**Use it for:** docs, blogs, marketing pages, landing pages. Content that
changes when you deploy, not when users act.

---

## 4. Incremental static regeneration (ISR)

**Analogy: the chalkboard menu in a café.** It's written up ahead of time,
and everyone reads the same board. When the special changes, staff rewrite it
in the background. Nobody waits at the counter while it's rewritten. The next
customer just sees the new board.

ISR is SSG that **updates itself after deploy**, one page at a time, without
a full rebuild. It fixes SSG's two weak points: staleness and build time.

### Time-based (stale-while-revalidate)

```tsx
// app/blog/[id]/page.tsx
export const revalidate = 60;   // seconds

export async function generateStaticParams() {
  const posts = await fetch("https://…/posts").then((r) => r.json());
  return posts.slice(0, 100).map((p) => ({ id: String(p.id) }));  // build only the top 100
}
```

What actually happens:

1. Request within 60s of the last build → cached HTML, instant.
2. **First** request after 60s → still gets the **old** HTML, instantly. In
   the background, the server re-renders the page.
3. Next request → gets the new HTML.

So `revalidate = 60` does **not** mean "refresh every 60 seconds". It means
"at most once per 60 seconds, and only when someone visits". A page nobody
visits never regenerates. And the visitor who triggers it sees stale content.

**Pages not built ahead of time** (post 101+): rendered on the first request,
then cached like the rest. Set `export const dynamicParams = false` to 404
them instead.

### On-demand (after a mutation)

Waiting 60s is silly when you **know** the data just changed. Invalidate it
from the code that changed it:

```ts
"use server";
import { revalidatePath, revalidateTag, updateTag } from "next/cache";

export async function publishPost() {
  await db.post.create(/* … */);
  revalidatePath("/blog");          // re-render this route on its next visit
}

export async function editProduct(id: string) {
  await db.product.update(/* … */);
  revalidateTag(`product-${id}`, "max");  // mark stale: next visit gets old page, regenerates in background
  // updateTag(`product-${id}`);          // or expire now: this user sees their own edit (read-your-writes)
}
```

In Next.js 16, calling `revalidateTag` without the second argument is deprecated.

### Next.js 16 with Cache Components

With `cacheComponents: true` in `next.config`, the newer way is to mark the
**data or component** as cached instead of the whole route:

```tsx
import { cacheLife, cacheTag } from "next/cache";

async function BlogPosts() {
  "use cache";
  cacheLife("hours");     // how long it stays fresh
  cacheTag("posts");      // name it, so revalidateTag/updateTag can find it
  const posts = await fetch("https://…/posts").then((r) => r.json());
  return <ul>{posts.map((p) => <li key={p.id}>{p.title}</li>)}</ul>;
}
```

Same idea as ISR, at a finer grain: one cached piece of a page, not the whole page.

### ISR is not a Next.js-only idea

It's the HTTP header `stale-while-revalidate` applied to HTML:

```
Cache-Control: s-maxage=60, stale-while-revalidate=86400
```

Any CDN that supports it gives you the same "serve old, refresh in the
background" behaviour in front of an SSR server.

**Gotchas:**

- **Self-hosting with several server instances:** each one has its own cache
  unless you configure a shared cache handler. Users can see different versions.
- **Not for per-user data.** The cached page is shared by everyone.
- **Stale reads are by design.** Fine for a product description. Not fine for
  a bank balance.

**Use it for:** e-commerce product/category pages, news, large content sites.
Too many pages to build every deploy, mostly the same for everyone, OK to be
a little out of date.

---

## 5. Streaming SSR

**Analogy: a buffet that opens in stages.** Instead of keeping the doors shut
until every dish is cooked, the restaurant opens with bread and salad on the
table. Hot dishes come out as each one is ready, into spots already marked
with a "coming soon" card.

Send the page **as it becomes ready**, not after everything is ready. The
fast parts go out first. Each slow part, wrapped in `<Suspense>`, goes out
later in the **same** HTTP response.

```tsx
function PostPage() {
  return (
    <Layout>
      <Post />                                         {/* fast — in the first chunk */}
      <Suspense fallback={<p>Loading comments…</p>}>
        <Comments />                                   {/* slow — streamed later */}
      </Suspense>
    </Layout>
  );
}
```

```tsx
// server.ts (Node)
import { renderToPipeableStream } from "react-dom/server";

app.get("*", (req, res) => {
  const { pipe, abort } = renderToPipeableStream(<App />, {
    bootstrapScripts: ["/main.js"],
    onShellReady() {                     // everything outside Suspense is ready
      res.statusCode = 200;
      res.setHeader("content-type", "text/html");
      pipe(res);
    },
    onShellError() {                     // the shell itself failed: nothing sent yet
      res.statusCode = 500;
      res.send("<h1>Something went wrong</h1>");
    },
    onError(err) {
      console.error(err);                // errors inside a boundary: that boundary renders on the client instead
    },
  });
  setTimeout(abort, 10_000);             // give up on slow boundaries, client finishes them
});
```

For Web Streams (edge runtimes, Deno, Bun, Cloudflare Workers) use
`renderToReadableStream` instead.

### What actually goes over the wire (checked in Node)

**Chunk 1** — sent as soon as the shell is ready. The slow part is a fallback
with a placeholder id:

```html
<main><h1>Post</h1><!--$?--><template id="B:0"></template><p>Loading comments…</p><!--/$--></main>
```

**Chunk 2** — sent later, when `<Comments>` resolves. The real HTML arrives in
a hidden `div`, plus a tiny inline script that moves it into the `B:0` spot:

```html
<div hidden id="S:0"><ul><li>a</li><li>b</li></ul></div><script>$RB=[];$RV=function(a){…
```

So the user sees comments appear **before any of your JS bundle has loaded**.
This is plain HTML + a small inline script, not React running.

### `onShellReady` vs `onAllReady`

| Callback | Fires when | Use for |
| --- | --- | --- |
| `onShellReady` | Everything outside Suspense boundaries is rendered | Real users: start streaming now |
| `onAllReady` | Every boundary has resolved | Crawlers and static generation: they want the full HTML in one go |

### Gotchas

- **You can't change the status code or headers after the shell is sent.**
  If `<Product>` inside a Suspense boundary finds the product is missing, it's
  too late to send a 404. Load "does this page exist?" data **outside**
  Suspense, so it's part of the shell.
- **Where you put `<Suspense>` decides what streams.** No boundaries means
  streaming behaves like classic SSR: one big chunk.
- **Too many tiny boundaries** cause layout shift as things pop in one by
  one. Group related content under one boundary.
- **Some proxies and CDNs buffer responses**, which silently undoes
  streaming. Check that compression/buffering layers flush chunks.

---

## 6. Selective hydration

**Analogy: a shop opening in the morning.** Staff switch on each counter one by
one. But if a customer is already standing at the coffee counter, the manager
sends someone there first, then carries on with the rest.

Streaming fixed the HTML side. Hydration still had two problems: wait for
**all** the JS, then hydrate **everything** before anything responds.

With `hydrateRoot` and `<Suspense>` boundaries, React 18+ does two things:

1. **Hydrates each Suspense boundary on its own.** The page shell can become
   interactive while `<Comments>`'s code or data is still loading. A slow
   boundary no longer blocks the rest.
2. **Hydrates what the user touches first.** If the user clicks inside a
   boundary that isn't hydrated yet, React jumps that boundary to the front
   of the queue, hydrates it, then **replays** the click so it isn't lost.

```tsx
function Page() {
  return (
    <>
      <Header />                                  {/* hydrates early */}
      <Suspense fallback={<Spinner />}>
        <Sidebar />                               {/* independent unit */}
      </Suspense>
      <Suspense fallback={<Spinner />}>
        <Comments />                              {/* independent unit */}
      </Suspense>
    </>
  );
}
```

You don't call any API for it. It's automatic, and `<Suspense>` boundaries are
the units it works with. It also works with `React.lazy` code splitting: a
lazy component's server HTML stays on screen, untouched, until its code
arrives, then it hydrates.

**Without boundaries there is nothing to select.** The whole tree is one unit,
and hydration is all-or-nothing again.

### React 19.2: `<Activity>` boundaries count too

Wrapping content in `<Suspense>` changes the UI if a fallback ever shows.
`<Activity>` boundaries also split the tree into units for selective
hydration, but **without** a fallback. Use one when you want the hydration
split with no visual change:

```tsx
function Page() {
  return (
    <>
      <Post />
      <Activity>          {/* always visible — only here to split hydration */}
        <Comments />
      </Activity>
    </>
  );
}
```

---

## 7. Progressive hydration

**Analogy: moving into a new house.** You unpack the kitchen and bedroom on
day one. The boxes for the attic stay taped up until you actually go up there.
The house is livable long before everything is unpacked.

Progressive hydration means hydrating parts of the page **over time**, by
priority. Visible and important parts first. The footer, below-the-fold
carousels and rarely used widgets later, or **never** unless the user gets to
them.

**This is a pattern, not a React API.** Interviewers like to check whether
you know the difference from selective hydration:

| | Selective hydration | Progressive hydration |
| --- | --- | --- |
| What it is | React's built-in scheduling of Suspense/Activity boundaries | A strategy: decide _when_ each part hydrates |
| Trigger | Code/data arriving, plus user interaction | You choose: on visible, on idle, on interaction |
| Built into React? | Yes, automatic | Not directly; you get part of it via code splitting |

### What you can do in React

React keeps a lazy component's server HTML untouched until its code loads.
So **delaying the code delays its hydration**:

```tsx
const Reviews = lazy(() => import("./Reviews"));   // separate chunk

<Suspense fallback={<ReviewsSkeleton />}>
  <Reviews />    {/* server HTML stays visible; hydrates when Reviews.js arrives */}
</Suspense>
```

What React **doesn't** give you is "hydrate this only when it scrolls into
view". `lazy` starts loading as soon as React reaches it during hydration.
DIY tricks to stop that (keeping server HTML with `dangerouslySetInnerHTML`
and `suppressHydrationWarning`) depend on React internals and break easily.

### Where progressive hydration is a first-class feature

- **Islands architecture (Astro):** the page is static HTML. Only the
  interactive "islands" ship JS, each with its own trigger:
  ```astro
  <Header client:load />
  <ReviewsCarousel client:visible />   <!-- hydrate when scrolled into view -->
  <ChatWidget client:idle />           <!-- hydrate when the browser is idle -->
  <Footer />                           <!-- no directive: zero JS, never hydrates -->
  ```
- **Resumability (Qwik):** skips hydration entirely. The server writes the
  app's state into the HTML, and the code for a handler loads only when that
  event fires.
- **React Server Components** get the same effect from the other direction.
  Parts that are server-only ship no JS, so they **never** need hydrating
  (next section).

---

## 8. React Server Components (RSC)

**Analogy: a restaurant kitchen vs tableside cooking.** Most dishes are cooked
in the kitchen. You just get the plate; the stove and knives never come to
your table. A few dishes, like fondue, are brought to the table with their
equipment, because you interact with them. **Server Components are the
kitchen. Client Components are the fondue set.**

### The misconception to clear up first

**RSC is not SSR.** They answer different questions:

- **SSR**: _how_ do we get the first HTML on screen fast? (Run components on
  the server, output HTML, then hydrate **all** of them in the browser.)
- **RSC**: _which_ components need to exist in the browser at all? Server
  Components run only on the server (or at build time). Their code **never**
  goes into the JS bundle and they **never** hydrate.

Frameworks like Next.js use both together: Server Components produce the RSC
payload, SSR turns that into HTML for the first load, and only the Client
Components hydrate.

### What they look like

```tsx
// app/products/[id]/page.tsx — a Server Component (the default in Next.js App Router)
import { db } from "@/lib/db";            // DB client: never reaches the browser
import { marked } from "marked";          // markdown lib: never in the bundle
import { AddToCart } from "./AddToCart";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await db.product.find(id);   // async component: just await
  return (
    <article>
      <h1>{product.name}</h1>
      <div dangerouslySetInnerHTML={{ __html: marked(product.description) }} />
      <AddToCart productId={product.id} />    {/* only this ships JS */}
    </article>
  );
}
```

```tsx
// AddToCart.tsx — a Client Component
"use client";
import { useState } from "react";

export function AddToCart({ productId }: { productId: string }) {
  const [added, setAdded] = useState(false);
  return <button onClick={() => setAdded(true)}>{added ? "Added" : "Add to cart"}</button>;
}
```

### Why bother

- **Less JavaScript.** `marked` and the DB client cost the browser nothing.
  On a content-heavy page, most components have no interactivity and can
  stay on the server.
- **No client-side fetch waterfalls.** Data loads on the server, close to the
  database, with direct access. No `useEffect` + loading state + API route.
- **Secrets stay on the server.** API keys and DB credentials can be used
  directly in the component.

### The rules

| | Server Component | Client Component |
| --- | --- | --- |
| Marker | Default (no directive) | `"use client"` at the top of the file |
| `async` / `await` in the component | ✅ | ❌ (read promises with `use()`) |
| `useState`, `useEffect`, event handlers | ❌ | ✅ |
| Browser APIs (`window`, `localStorage`) | ❌ | ✅ (in effects/handlers) |
| DB, file system, secrets | ✅ | ❌ |
| Ships JS to the browser | ❌ | ✅ |

**`"use client"` marks a boundary, not one component.** Everything the file
imports also becomes client code. Put it as low in the tree as you can: on the
`<AddToCart>` button, not on the whole page.

**Props across the boundary must be serializable.** Server → client props go
over the network. Allowed: strings, numbers, plain objects/arrays, `Date`,
`Map`/`Set`, **JSX**, **promises**, and **Server Functions**. Not allowed:
regular functions (so no `onClick={() => …}` from a Server Component) and
class instances.

```tsx
// ✅ pass a promise — don't await it — and let the client read it with use()
export default function Page() {
  const commentsPromise = getComments();   // starts the fetch, doesn't block the page
  return (
    <Suspense fallback={<p>Loading…</p>}>
      <Comments commentsPromise={commentsPromise} />
    </Suspense>
  );
}

// Comments.tsx
"use client";
export function Comments({ commentsPromise }: { commentsPromise: Promise<Comment[]> }) {
  const comments = use(commentsPromise);
  return <ul>{comments.map((c) => <li key={c.id}>{c.text}</li>)}</ul>;
}
```

### A Client Component can't import a Server Component, but can render one

Once you're inside `"use client"`, any component you **import** becomes client
code. To put server-only content inside a client wrapper, pass it as
`children` (the "donut" pattern: a client shell with a server-rendered hole in
the middle):

```tsx
// Modal.tsx
"use client";
export function Modal({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return <>{open && <div className="modal">{children}</div>}<button onClick={() => setOpen(true)}>Open</button></>;
}

// page.tsx — Server Component
<Modal>
  <ServerRenderedTerms />   {/* still a Server Component: rendered on the server, passed in as JSX */}
</Modal>
```

### `"use server"` is not for Server Components

A common mix-up. `"use server"` marks **Server Functions**: functions the
client can call, like an RPC (form actions, mutations). Server Components need
no directive at all.

```tsx
"use server";
export async function addToCart(productId: string) {
  await db.cart.add(productId);   // runs on the server, called from a client form/button
}
```

Treat every Server Function like a public API endpoint. Anyone can call it
with any arguments, so check auth and validate input inside it.

### Gotchas

- **Data passed to a Client Component is visible in the browser.** Passing a
  whole `user` row to a client button also sends `passwordHash`. Pass only the
  fields it needs. Use the `server-only` package in modules that must never be
  imported by client code (the build fails if they are).
- **Context doesn't work in Server Components.** Providers must be Client
  Components; wrap them around `children` in your root layout.
- **You need a framework or bundler integration.** RSC requires bundler
  support to split server and client modules. In practice: Next.js App Router,
  React Router (RSC mode), Waku, or Parcel/Vite plugins. A plain Vite SPA like
  this repo doesn't have it.

---

## Comparison table

| | CSR | SSR | SSG | ISR | Streaming SSR | RSC |
| --- | --- | --- | --- | --- | --- | --- |
| HTML made | In the browser | Per request | At build | At build + refreshed later | Per request, in chunks | Server / build (+ SSR for HTML) |
| First byte (TTFB) | Fast (static file) | Slow (waits for data) | Fastest (CDN) | Fastest (CDN) | Fast (shell first) | Depends on SSR/SSG choice |
| Content visible | Late | Early | Early | Early | Early, in pieces | Early |
| Interactive | When JS runs | After full hydration | After full hydration | After full hydration | Per boundary (selective) | Only client parts hydrate |
| SEO / link previews | Weak | ✅ | ✅ | ✅ | ✅ | ✅ |
| Data freshness | Live | Live | Stale until rebuild | Stale for a window | Live | Your choice (cached or live) |
| Per-user content in HTML | ✅ (client) | ✅ | ❌ | ❌ | ✅ | ✅ |
| Server cost | None | Per request | None | Low (regen only) | Per request | Per request or build |
| JS shipped | All | All | All | All | All | Client Components only |

Direction only. Real numbers depend on the device, network and how much data
each page needs.

---

## Picking one

Mix per route. Almost no real app uses one pattern everywhere.

| Page | Pattern | Why |
| --- | --- | --- |
| Marketing / docs / blog | SSG | Same for everyone, changes on deploy |
| Product page in a large catalogue | ISR (or `"use cache"` + tags) | Too many pages to rebuild, OK to be slightly stale, invalidate on edit |
| Search results, live inventory | Streaming SSR | Needs fresh data + SEO; stream slow sections |
| Logged-in dashboard | CSR (or SSR shell + client data) | No SEO, highly interactive, users return often |
| Content-heavy page with a few widgets | RSC + small Client Components | Most of the page needs no JS |

**Questions to ask in a system-design round:**

1. Does it need SEO or link previews? No → CSR is fine.
2. Is the content the same for every user? Yes → SSG / ISR.
3. How fresh must it be? On deploy → SSG. Minutes → ISR. Live → SSR.
4. Is part of the page slow? → Streaming + Suspense around that part.
5. Is a lot of it non-interactive? → Server Components to cut JS.

---

## Interview questions

**"Is SSR faster than CSR?"**
It shows content sooner. It doesn't make the page usable sooner, because the
same JS still has to load and hydrate. On a slow server or with slow data,
TTFB can even be worse. Faster at _seeing_, not at _using_.

**"What is hydration and why is it needed?"**
The server HTML has no event handlers; it's just markup. Hydration is React
running the same components in the browser, matching them to the existing
DOM, and attaching handlers, without rebuilding the DOM.

**"What causes a hydration mismatch? How do you fix it?"**
The first client render differs from the server HTML: dates, random values,
`window` checks, `localStorage`, locale formatting, invalid nesting. Make the
first render identical and move client-only values into `useEffect` or
`useSyncExternalStore` with `getServerSnapshot`. `suppressHydrationWarning`
only for unavoidable one-element text like timestamps.

**"SSG vs ISR vs SSR?"**
When the HTML is made: build time / build time + background refresh /
every request. Trade freshness for speed and cost.

**"How does ISR's `revalidate: 60` behave?"**
Stale-while-revalidate. After 60s, the **next** visitor still gets the old
page, and that visit triggers a background rebuild. It's "at most once per
60s, when visited", not a timer.

**"How does streaming SSR work without JavaScript loaded?"**
The shell is sent with Suspense fallbacks marked by placeholder ids. Each
resolved boundary is sent later in the same response as hidden HTML plus a
tiny inline script that swaps it into place. Your bundle isn't needed for that.

**"Why can't I return a 404 from inside a Suspense boundary when streaming?"**
The status code went out with the first chunk. Do existence checks outside
Suspense so they're part of the shell.

**"Selective vs progressive hydration?"**
Selective is React's built-in: boundaries hydrate independently, and the one
the user clicks jumps the queue (the click is replayed). Progressive is the
broader strategy of choosing _when_ each part hydrates (visible, idle, on
interaction). Astro islands and Qwik support it directly; in React you get
part of it via code splitting.

**"RSC vs SSR?"**
SSR = produce HTML on the server, then hydrate everything. RSC = some
components exist only on the server and never ship JS or hydrate. They're
complementary; Next.js uses both.

**"Can a Client Component render a Server Component?"**
Not by importing it, since the import becomes client code. Yes by receiving
it as `children` or another JSX prop from a Server Component parent.

**"What's `"use server"` for?"**
Server Functions (callable from the client, like RPC). Not for marking Server
Components, which are the default.
