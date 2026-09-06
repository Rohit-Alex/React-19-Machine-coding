import { useImperativeHandle, useRef, useState } from "react";

type ImperativeModalHandle = { open: () => void; close: () => void };

function ImperativeModal({ ref }: { ref?: React.Ref<ImperativeModalHandle> }) {
  const [isOpen, setIsOpen] = useState(false);

  useImperativeHandle(ref, () => {
    return {
      open() {
        setIsOpen(true);
      },
      close() {
        setIsOpen(false);
      },
    };
  }, []);

  if (!isOpen) return null;
  return (
    <div style={{ border: "1px solid #ccc", padding: 8 }}>
      Imperative modal is open. (Parent called <code>ref.current.open()</code>.)
    </div>
  );
}

function PropModal({ isOpen }: { isOpen: boolean }) {
  if (!isOpen) return null;
  return (
    <div style={{ border: "1px solid #ccc", padding: 8 }}>
      Prop-driven modal is open. (Parent just set <code>isOpen</code>.)
    </div>
  );
}

export const PreferPropsOverRefs = () => {
  const modalRef = useRef<ImperativeModalHandle>(null);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <h3>Prefer props over refs</h3>
      <p>
        Docs' explicit guidance: "if you can express something as a prop, you
        should not use a ref." Both modals below do the same thing — one exposes{" "}
        <code>{"{ open, close }"}</code> through an imperative handle, the other
        just takes <code>isOpen</code>. The prop version is simpler to reason
        about: its visibility is derived from render state, not from an
        out-of-band imperative call.
      </p>
      <button onClick={() => modalRef.current?.open()}>
        Open imperative modal
      </button>{" "}
      <button onClick={() => modalRef.current?.close()}>
        Close imperative modal
      </button>
      <ImperativeModal ref={modalRef} />
      <button onClick={() => setIsOpen(true)}>Open prop modal</button>{" "}
      <button onClick={() => setIsOpen(false)}>Close prop modal</button>
      <PropModal isOpen={isOpen} />
    </div>
  );
};
