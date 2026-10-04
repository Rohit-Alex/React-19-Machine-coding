import { useRef, useState } from "react";
import { Modal } from "./Modal";
import "../../Hooks/hook-demo.css";

export const ModalDemo = () => {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [name, setName] = useState("Project Apollo");
  const [draft, setDraft] = useState(name);
  const nativeRef = useRef<HTMLDialogElement>(null);

  return (
    <section>
      <h2>Modal / dialog</h2>
      <p>
        Writeup: <code>src/Components/MachineCoding/Modal/Modal.md</code>. Portal, focus in and
        back, focus trap, Escape, backdrop click, and scroll lock.
      </p>

      <div className="demo-card">
        <h4>Built with createPortal</h4>
        <p>
          Project: <strong>{name}</strong>. Open it, Tab around (focus stays inside), try scrolling
          the page, open the nested confirm, then press Escape twice.
        </p>
        <div className="demo-actions">
          <button
            onClick={() => {
              setDraft(name);
              setIsEditOpen(true);
            }}
          >
            Rename project
          </button>
        </div>

        <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Rename project">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setName(draft.trim() || name);
              setIsEditOpen(false);
            }}
          >
            <label>
              Name <input value={draft} onChange={(e) => setDraft(e.target.value)} />
            </label>
            <div className="demo-actions" style={{ marginTop: 16 }}>
              <button type="submit">Save</button>
              <button type="button" onClick={() => setIsEditOpen(false)}>
                Cancel
              </button>
              <button type="button" onClick={() => setIsConfirmOpen(true)}>
                Delete…
              </button>
            </div>
          </form>

          {/* Nested: rendered inside the first modal's tree, portaled to body. */}
          <Modal isOpen={isConfirmOpen} onClose={() => setIsConfirmOpen(false)} title="Delete project?">
            <p>This can't be undone. (Demo only — nothing is deleted.)</p>
            <div className="demo-actions">
              <button onClick={() => setIsConfirmOpen(false)}>Keep it</button>
              <button
                onClick={() => {
                  setIsConfirmOpen(false);
                  setIsEditOpen(false);
                }}
              >
                Delete
              </button>
            </div>
          </Modal>
        </Modal>
      </div>

      <div className="demo-card">
        <h4>Native: &lt;dialog&gt; + showModal()</h4>
        <p>
          No portal, no trap code: the browser puts it on top, makes the page behind it inert,
          closes on Escape, and returns focus.
        </p>
        <div className="demo-actions">
          <button onClick={() => nativeRef.current?.showModal()}>Open native dialog</button>
        </div>
        <dialog ref={nativeRef} aria-labelledby="native-dialog-title">
          <h3 id="native-dialog-title">Native dialog</h3>
          <p>Tab around, press Escape, or use the button.</p>
          <form method="dialog">
            <button>Close</button>
          </form>
        </dialog>
      </div>
    </section>
  );
};
