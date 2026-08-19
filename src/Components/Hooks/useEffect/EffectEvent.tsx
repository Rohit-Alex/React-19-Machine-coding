import { useEffect, useEffectEvent, useState } from "react";

/**
 * Scenario 4: useEffectEvent (stable in React 19.2).
 * The Effect should only re-run when `url` changes - NOT when
 * `notifyCount` changes. Wrapping the log in useEffectEvent lets it read
 * the latest notifyCount without listing it as a dependency.
 */
export const EffectEvent = () => {
  const [url, setUrl] = useState("/home");
  const [notifyCount, setNotifyCount] = useState(0);

  const onVisit = useEffectEvent((visitedUrl: string) => {
    console.log(
      `[EffectEvent] visited "${visitedUrl}", notifyCount is ${notifyCount}`,
    );
  });

  useEffect(() => {
    onVisit(url);
    // Only `url` is a dependency - onVisit is intentionally omitted, it's
    // an Effect Event, not a reactive value.
  }, [url]);

  return (
    <div className="demo-card">
      <h4>4. useEffectEvent</h4>
      <p>
        Open the console. Bumping "notifyCount" never re-fires the effect,
        but the next url change still logs the latest count.
      </p>
      <div className="demo-actions">
        <button onClick={() => setUrl((u) => (u === "/home" ? "/about" : "/home"))}>
          navigate ({url})
        </button>
        <button onClick={() => setNotifyCount((c) => c + 1)}>
          bump notifyCount ({notifyCount})
        </button>
      </div>
    </div>
  );
};
