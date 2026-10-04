import { ToastProvider, useToast } from "./Toast";
import "../../Hooks/hook-demo.css";

// Any component under the provider can show a toast with one call.
const Buttons = () => {
  const toast = useToast();
  return (
    <div className="demo-actions">
      <button onClick={() => toast("Saved.", { type: "success" })}>Success</button>
      <button onClick={() => toast("A new version is available.")}>Info</button>
      <button onClick={() => toast("Payment failed. Check your card.", { type: "error" })}>
        Error (stays)
      </button>
      <button
        onClick={() => {
          for (let i = 1; i <= 6; i++) toast(`Upload ${i} of 6 finished`, { type: "success", duration: 2500 });
        }}
      >
        Burst of 6 (queue)
      </button>
    </div>
  );
};

export const ToastDemo = () => (
  <section>
    <h2>Toast / notifications</h2>
    <p>
      Writeup: <code>src/Components/MachineCoding/Toast/Toast.md</code>. A provider, a{" "}
      <code>useToast()</code> hook, a queue, auto-dismiss that pauses on hover, and a portal.
    </p>
    <ToastProvider>
      <div className="demo-card">
        <h4>Show some toasts</h4>
        <p>
          They appear bottom-right. At most 3 show at once; the rest wait. Hover one to stop its
          timer. Errors stay until you close them.
        </p>
        <Buttons />
      </div>
    </ToastProvider>
  </section>
);
