import { OnlineStatus } from "./OnlineStatus";
import "../hook-demo.css";

export const UseIsOnlineDemo = () => {
  return (
    <section>
      <h2>useIsOnline</h2>
      <p>
        Subscribes to <code>navigator.onLine</code> plus the native{" "}
        <code>online</code>/<code>offline</code> window events via{" "}
        <code>useSyncExternalStore</code> - no polling, no extra state.
      </p>
      <OnlineStatus />
    </section>
  );
};
