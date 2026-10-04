import { FileUpload } from "./FileUpload";
import "../../Hooks/hook-demo.css";

export const FileUploadDemo = () => (
  <section>
    <h2>File upload with progress</h2>
    <p>
      Writeup: <code>src/Components/MachineCoding/FileUpload/FileUpload.md</code>. Per-file
      progress, two uploads at a time, cancel, retry, and checks before uploading.
    </p>
    <div className="demo-card">
      <h4>Upload files</h4>
      <p>
        Uploads are simulated (no server). Pick several files at once to see the queue; about 1 in
        5 fails on purpose so you can retry.
      </p>
      <FileUpload />
    </div>
  </section>
);
