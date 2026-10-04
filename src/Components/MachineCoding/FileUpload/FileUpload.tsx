import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { fakeUpload } from "./upload";

type Status = "queued" | "uploading" | "done" | "error" | "cancelled";

interface Upload {
  id: number;
  file: File;
  status: Status;
  progress: number; // 0..1
  error?: string;
}

const MAX_SIZE = 10 * 1024 * 1024;
const MAX_PARALLEL = 2;
const ACCEPT = ["image/", "application/pdf"];

const formatSize = (bytes: number) =>
  bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

export const FileUpload = () => {
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [rejected, setRejected] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const nextId = useRef(0);
  // Controllers aren't for rendering, so they live in a ref, not state.
  const controllers = useRef(new Map<number, AbortController>());

  const patch = (id: number, changes: Partial<Upload>) =>
    setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, ...changes } : u)));

  const addFiles = (files: File[]) => {
    // `accept` on the input is only a hint for the file picker — drag and
    // drop ignores it. Check again here (and again on the server).
    const ok: File[] = [];
    const bad: string[] = [];
    for (const file of files) {
      if (!ACCEPT.some((type) => file.type.startsWith(type))) bad.push(`${file.name}: only images and PDFs.`);
      else if (file.size > MAX_SIZE) bad.push(`${file.name}: larger than 10 MB.`);
      else ok.push(file);
    }
    setRejected(bad);
    setUploads((prev) => [
      ...prev,
      ...ok.map((file) => ({ id: nextId.current++, file, status: "queued" as const, progress: 0 })),
    ]);
  };

  // The queue runner. Whenever the list changes, start queued files until
  // MAX_PARALLEL are running. Finishing, cancelling or retrying a file
  // changes the list, so the next one starts by itself.
  useEffect(() => {
    const running = uploads.filter((u) => u.status === "uploading").length;
    const toStart = uploads.filter((u) => u.status === "queued").slice(0, MAX_PARALLEL - running);
    for (const { id, file } of toStart) {
      const controller = new AbortController();
      controllers.current.set(id, controller);
      patch(id, { status: "uploading", progress: 0, error: undefined });
      fakeUpload(file, { signal: controller.signal, onProgress: (progress) => patch(id, { progress }) })
        .then(() => patch(id, { status: "done", progress: 1 }))
        .catch((error: Error) =>
          patch(id, controller.signal.aborted ? { status: "cancelled" } : { status: "error", error: error.message }),
        )
        .finally(() => controllers.current.delete(id));
    }
  }, [uploads]);

  // Leaving the page mid-upload: stop them all.
  useEffect(() => {
    const running = controllers.current;
    return () => running.forEach((controller) => controller.abort());
  }, []);

  const cancel = (upload: Upload) => {
    if (upload.status === "queued") patch(upload.id, { status: "cancelled" });
    else controllers.current.get(upload.id)?.abort();
  };

  const onInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    addFiles([...(event.target.files ?? [])]);
    // Clear it, or picking the same file again fires no change event.
    event.target.value = "";
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault(); // Otherwise the browser opens the file in the tab.
    setIsDragging(false);
    addFiles([...event.dataTransfer.files]);
  };

  return (
    <div>
      <div
        // dragover must be cancelled, or the drop event never fires.
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        // dragleave also fires when moving onto a child element. Only stop
        // highlighting when the pointer has really left the zone.
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsDragging(false);
        }}
        onDrop={onDrop}
        style={{
          border: `2px dashed ${isDragging ? "#3b6fd4" : "var(--border)"}`,
          borderRadius: 8,
          padding: 24,
          textAlign: "center",
          background: isDragging ? "rgb(59 111 212 / 0.08)" : undefined,
        }}
      >
        <p style={{ marginTop: 0 }}>Drop images or PDFs here (up to 10 MB each), or</p>
        {/* A real file input: keyboard and screen readers work with no extra code. */}
        <input type="file" multiple accept="image/*,application/pdf" onChange={onInputChange} aria-label="Choose files to upload" />
      </div>

      {rejected.length > 0 && (
        <ul role="alert" style={{ color: "#c4321c" }}>
          {rejected.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}

      <ul style={{ listStyle: "none", padding: 0 }}>
        {uploads.map((upload) => (
          <li key={upload.id} style={{ padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <span>
                {upload.file.name} <small>({formatSize(upload.file.size)})</small>
              </span>
              <span>
                {(upload.status === "queued" || upload.status === "uploading") && (
                  <button onClick={() => cancel(upload)} aria-label={`Cancel ${upload.file.name}`}>
                    Cancel
                  </button>
                )}
                {(upload.status === "error" || upload.status === "cancelled") && (
                  <button onClick={() => patch(upload.id, { status: "queued", progress: 0 })} aria-label={`Retry ${upload.file.name}`}>
                    Retry
                  </button>
                )}
              </span>
            </div>
            {/* Native <progress>: screen readers announce it as a progress bar with its value. */}
            <progress
              value={upload.progress}
              max={1}
              aria-label={`${upload.file.name} upload progress`}
              style={{ width: "100%" }}
            />
            <small>
              {upload.status === "queued" && "Waiting…"}
              {upload.status === "uploading" && `${Math.floor(upload.progress * 100)}%`}
              {upload.status === "done" && "✅ Uploaded"}
              {upload.status === "cancelled" && "Cancelled"}
              {upload.status === "error" && `❌ ${upload.error}`}
            </small>
          </li>
        ))}
      </ul>
      {/* One summary for screen readers, not an announcement every 100ms per file. */}
      <p aria-live="polite" className="visually-hidden">
        {uploads.filter((u) => u.status === "done").length} of {uploads.length} files uploaded
      </p>
    </div>
  );
};
