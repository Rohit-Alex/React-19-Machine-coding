# File upload with progress bar

> **The prompt:** "Let users upload files with a progress bar for each. They
> should be able to cancel."
>
> The trap is in the first line of code: `fetch` can't report upload
> progress. After that, it's a small state machine per file, a queue, and the
> edge cases of file inputs and drag and drop.

Runnable demo: [`index.tsx`](./index.tsx) · component:
[`FileUpload.tsx`](./FileUpload.tsx) · upload functions: [`upload.ts`](./upload.ts)

---

## 1. Clarify before you code

| Question | Why it changes your code |
| --- | --- |
| One file or many? All at once or limited? | Many + a limit means a queue (section 4). |
| Which types and sizes? | Check before uploading (section 5) — and the server checks again. |
| Huge files (video, GBs)? | Chunked / resumable upload instead of one request (section 7). |
| Upload straight to S3 / GCS? | Ask the backend for a pre-signed URL, then PUT the file there. Same progress code. |
| Drag and drop? Paste from clipboard? | Extra entry points into the same `addFiles()`. |
| What happens on failure? | Retry per file, without re-picking it. |

---

## 2. `fetch` has no upload progress — use XHR

```ts
xhr.upload.onprogress = (e) => {
  if (e.lengthComputable) onProgress(e.loaded / e.total);
};
```

`fetch` gives you the **response** body as a stream (download progress), but
nothing for the **request** body going up. `XMLHttpRequest` has
`xhr.upload.onprogress`, so this is the one place XHR is still the right tool.
(Streaming a request body with `fetch` exists in Chrome over HTTP/2, and you
can count bytes as the stream is read — but that's bytes handed to the
browser, not bytes the server received, and other browsers don't support
it.)

The [`uploadWithXhr`](./upload.ts) function wraps it in a promise with the
same shape as the rest of the code: `{ onProgress, signal }`.

- **`load` doesn't mean success.** The body finished uploading, then the
  server answered 413 or 500. Check `xhr.status`.
- **Cancel with `AbortSignal`** even though XHR predates it: on abort, call
  `xhr.abort()`. The component only ever deals with signals.
- **`lengthComputable`** can be false; then show an indeterminate bar
  (`<progress>` with no `value`).

The demo uses `fakeUpload` with the same signature — there's no server here,
and a localhost upload would finish too fast to watch.

---

## 3. One record per file

```ts
{ id, file, status: "queued" | "uploading" | "done" | "error" | "cancelled", progress, error? }
```

- **Keyed by a generated id,** not file name — two files called `photo.jpg`
  from different folders are both allowed.
- **AbortControllers live in a ref** (`Map<id, AbortController>`). They aren't
  shown on screen, so putting them in state would only cause re-renders.
- **Status drives the buttons:** Cancel while queued or uploading, Retry after
  an error or cancel. Retry just sets status back to `queued` — the queue
  does the rest.
- **Cancelled vs failed:** the catch checks `signal.aborted`. A cancel isn't
  an error and shouldn't show red.

---

## 4. The queue: an effect that starts what's allowed

```ts
useEffect(() => {
  const running = uploads.filter((u) => u.status === "uploading").length;
  const toStart = uploads.filter((u) => u.status === "queued").slice(0, MAX_PARALLEL - running);
  for (const u of toStart) { /* mark uploading, start it */ }
}, [uploads]);
```

Twenty files at once means twenty requests fighting for the same upload
bandwidth — each one slower, and all twenty half-done if the connection
drops. Two or three in parallel is usually as fast overall.

The effect doesn't keep its own queue. It looks at the list and asks "how
many slots are free?". Any change — a finish, a cancel, a retry — changes the
list, so the next file starts on its own.

Analogy: a supermarket with two checkouts. Nobody plans the order in
advance; whenever a till is free, the next person in line walks up.

---

## 5. File input and drag-and-drop details

- **`accept` is only a hint.** It filters the file picker, but drag and drop
  ignores it, and users can switch the picker to "All files". Check type and
  size in code — and the server must check again, since the client can be
  bypassed entirely.
- **Reset the input** (`event.target.value = ""`) after reading it, or picking
  the same file a second time fires no `change` event.
- **`dragover` must call `preventDefault()`**, or `drop` never fires.
- **`drop` must call `preventDefault()`**, or the browser opens the file in
  the tab and the user loses the page.
- **`dragleave` fires when moving onto a child** of the drop zone, so the
  highlight flickers. Only clear it when `relatedTarget` is outside the zone.
- **Keep a real `<input type="file">`.** Drag and drop is mouse-only; the
  input works with keyboard and screen readers.

---

## 6. Accessibility

- **Native `<progress>`** — announced as a progress bar with its value. Give
  each one a label with the file name.
- **One polite summary** ("3 of 5 files uploaded"), not an announcement per
  progress tick per file — that would be a constant stream of speech.
- **Rejected files in a `role="alert"`** list, saying why.
- **Unique button labels** ("Cancel photo.jpg"), not ten "Cancel" buttons.

---

## 7. Follow-ups to expect

| They ask | Short answer |
| --- | --- |
| "Files of several GB." | Chunked upload: `file.slice(start, end)` into 5–10 MB parts, upload each (S3 multipart or tus protocol), progress = parts done + current part. A failed part retries alone. |
| "Resume after the page reloads." | The server tracks which chunks it has; on reload, ask for the offset and continue from there. The `File` itself must be picked again — browsers don't keep it. |
| "Upload straight to S3." | Backend returns a pre-signed URL per file; `PUT` the file there with the same XHR code. Your server never handles the bytes. |
| "Image previews." | `URL.createObjectURL(file)` for an `<img>`, and `URL.revokeObjectURL` when the item is removed, or the memory is held until the page closes. |
| "Retry automatically." | Exponential backoff (1s, 2s, 4s…) on network errors only, never on 4xx answers. |
| "Warn before leaving mid-upload." | `beforeunload` listener while anything is `uploading`. |

---

## 8. Scoring notes

- **Mid:** a `fetch` upload with a spinner, or XHR progress for one file, no
  cancel.
- **Senior:** knows `fetch` can't do upload progress and uses XHR, per-file
  status machine, cancel via `AbortSignal` (cancel ≠ error), a concurrency
  limit, retry, type and size checks that don't trust `accept`, the input
  reset and drag-and-drop `preventDefault` details, and native `<progress>`.
