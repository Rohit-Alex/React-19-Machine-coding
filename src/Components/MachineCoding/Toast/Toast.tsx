import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

type ToastType = "info" | "success" | "error";

interface ToastOptions {
  type?: ToastType;
  /** ms before it closes itself. null = stays until dismissed. */
  duration?: number | null;
}

interface Toast {
  id: number;
  message: string;
  type: ToastType;
  duration: number | null;
}

type ShowToast = (message: string, options?: ToastOptions) => void;

const ToastContext = createContext<ShowToast | null>(null);

export const useToast = () => {
  const showToast = useContext(ToastContext);
  if (!showToast) throw new Error("useToast must be used inside <ToastProvider>");
  return showToast;
};

export const ToastProvider = ({ children, maxVisible = 3 }: { children: ReactNode; maxVisible?: number }) => {
  // One list, oldest first. The first `maxVisible` are on screen; the rest
  // are the queue. Showing the next one is just removing one before it.
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  // Stable identity: every component calling useToast() would re-render on
  // each new toast if this function changed.
  const showToast = useCallback<ShowToast>((message, { type = "info", duration } = {}) => {
    const id = nextId.current++;
    // Errors stay until dismissed: someone may need time to read them.
    const resolved = duration === undefined ? (type === "error" ? null : 4000) : duration;
    setToasts((prev) => [...prev, { id, message, type, duration: resolved }]);
  }, []);

  const visible = toasts.slice(0, maxVisible);
  const queued = toasts.length - visible.length;

  return (
    <ToastContext value={showToast}>
      {children}
      {createPortal(
        <div
          style={{
            position: "fixed",
            bottom: 16,
            right: 16,
            display: "flex",
            flexDirection: "column",
            gap: 8,
            width: "min(320px, calc(100vw - 32px))",
            zIndex: 1100,
          }}
        >
          {/* Live regions must already be in the page *before* text is added,
              or screen readers miss it. So both lists are always rendered,
              even when empty. Errors interrupt; the rest wait their turn. */}
          <div aria-live="assertive" style={STACK}>
            {visible
              .filter((toast) => toast.type === "error")
              .map((toast) => (
                <ToastView key={toast.id} toast={toast} onDismiss={dismiss} />
              ))}
          </div>
          <div aria-live="polite" style={STACK}>
            {visible
              .filter((toast) => toast.type !== "error")
              .map((toast) => (
                <ToastView key={toast.id} toast={toast} onDismiss={dismiss} />
              ))}
          </div>
          {queued > 0 && <small style={{ textAlign: "right" }}>+{queued} more waiting</small>}
        </div>,
        document.body,
      )}
    </ToastContext>
  );
};

const STACK = { display: "flex", flexDirection: "column", gap: 8 } as const;

const COLORS: Record<ToastType, string> = { info: "#3b6fd4", success: "#2f7d1f", error: "#c4321c" };

const ToastView = ({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const isPaused = isHovered || isFocused;
  // Time left survives pauses. Each run of the effect spends some of it.
  const remainingRef = useRef(toast.duration);

  useEffect(() => {
    // null = sticky. (Don't pass Infinity to setTimeout: it overflows and
    // fires straight away.)
    if (isPaused || remainingRef.current === null) return;
    const startedAt = Date.now();
    const timeoutId = setTimeout(() => onDismiss(toast.id), remainingRef.current);
    return () => {
      clearTimeout(timeoutId);
      if (remainingRef.current !== null) remainingRef.current -= Date.now() - startedAt;
    };
  }, [isPaused, onDismiss, toast.id]);

  return (
    <div
      // Pause while the pointer is over it or focus is inside it, so it can't
      // vanish while being read or while its button is focused.
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      style={{
        display: "flex",
        gap: 8,
        alignItems: "start",
        justifyContent: "space-between",
        padding: "10px 12px",
        borderRadius: 6,
        background: "var(--bg)",
        color: "var(--text-h)",
        border: "1px solid var(--border)",
        borderLeft: `4px solid ${COLORS[toast.type]}`,
        boxShadow: "0 4px 16px rgb(0 0 0 / 0.15)",
      }}
    >
      <span>{toast.message}</span>
      <button
        type="button"
        aria-label="Dismiss notification"
        onClick={() => onDismiss(toast.id)}
        style={{ all: "unset", cursor: "pointer", padding: "0 4px" }}
      >
        ✕
      </button>
    </div>
  );
};
