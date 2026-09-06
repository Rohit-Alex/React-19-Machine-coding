import { useDebugValue, useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function useOnlineStatus() {
  const isOnline = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
  useDebugValue(isOnline ? "Online" : "Offline");
  return isOnline;
}

export const OnlineStatusIndicator = () => {
  const isOnline = useOnlineStatus();

  return (
    <div>
      <h3>Labeling a custom hook: no format function</h3>
      <p>
        <code>useOnlineStatus</code> wraps <code>useSyncExternalStore</code>{" "}
        and calls <code>{'useDebugValue(isOnline ? "Online" : "Offline")'}</code>.
        Nothing changes on screen — open React DevTools, select this
        component in the Components panel, and the hooks list shows{" "}
        <code>OnlineStatus: "Online"</code> (or <code>"Offline"</code>)
        instead of an unlabeled <code>SyncExternalStore</code> entry.
      </p>
      <p>{isOnline ? "✅ Online" : "❌ Disconnected"}</p>
    </div>
  );
};
