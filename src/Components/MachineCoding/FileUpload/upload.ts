export interface UploadOptions {
  onProgress: (fraction: number) => void;
  signal: AbortSignal;
}

/*
 * The real thing. fetch() has no upload progress event; XMLHttpRequest does
 * (xhr.upload.onprogress). This is the one place XHR is still the right tool.
 */
export function uploadWithXhr(url: string, file: File, { onProgress, signal }: UploadOptions) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    };
    // Finishing the upload isn't success: the server can still answer 413 or 500.
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed (${xhr.status})`));
    xhr.onerror = () => reject(new Error("Network error"));
    xhr.onabort = () => reject(new DOMException("Upload cancelled", "AbortError"));
    signal.addEventListener("abort", () => xhr.abort(), { once: true });

    const body = new FormData();
    body.append("file", file);
    xhr.send(body);
  });
}

/*
 * Same signature, no server: the demo has nowhere to upload to, and a
 * localhost upload would finish too fast to see. Takes 1.5–5s depending on
 * size, and fails 1 time in 5 so retry can be tried.
 */
export function fakeUpload(file: File, { onProgress, signal }: UploadOptions) {
  return new Promise<void>((resolve, reject) => {
    const duration = Math.min(5000, Math.max(1500, file.size / 2000));
    const willFail = Math.random() < 0.2;
    const startedAt = Date.now();
    const intervalId = setInterval(() => {
      const fraction = Math.min(1, (Date.now() - startedAt) / duration);
      if (willFail && fraction > 0.6) {
        clearInterval(intervalId);
        reject(new Error("Network error (simulated)"));
        return;
      }
      onProgress(fraction);
      if (fraction === 1) {
        clearInterval(intervalId);
        resolve();
      }
    }, 100);
    signal.addEventListener(
      "abort",
      () => {
        clearInterval(intervalId);
        reject(new DOMException("Upload cancelled", "AbortError"));
      },
      { once: true },
    );
  });
}
