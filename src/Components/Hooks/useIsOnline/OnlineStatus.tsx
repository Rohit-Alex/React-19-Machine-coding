import { useIsOnline } from "./useIsOnline";

export const OnlineStatus = () => {
  const isOnline = useIsOnline();

  return (
    <div className="demo-card">
      <h4>Live connectivity status</h4>
      <p>
        Status: <strong>{isOnline ? "online" : "offline"}</strong>. Toggle
        your browser's network throttling (DevTools &gt; Network &gt;
        Offline) or disconnect Wi-Fi to see this update live.
      </p>
    </div>
  );
};
