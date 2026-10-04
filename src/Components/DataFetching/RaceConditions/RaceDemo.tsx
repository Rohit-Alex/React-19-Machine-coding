import { useEffect, useRef, useState } from "react";
import { USER_IDS, fetchUser, type User } from "./fakeApi";

type Strategy = "naive" | "ignore" | "abort";

const STRATEGIES: Record<Strategy, string> = {
  naive: "Naive — no protection",
  ignore: "Ignore flag — let it finish, drop the answer",
  abort: "AbortController — cancel the request",
};

interface LogEntry {
  n: number;
  userId: number;
  outcome: "started" | "shown" | "ignored" | "aborted";
}

export const RaceDemo = () => {
  const [strategy, setStrategy] = useState<Strategy>("naive");
  const [userId, setUserId] = useState(1);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [log, setLog] = useState<LogEntry[]>([]);
  const requestCount = useRef(0);

  const record = (entry: LogEntry) => setLog((prev) => [entry, ...prev].slice(0, 8));

  useEffect(() => {
    const n = ++requestCount.current;
    const controller = new AbortController();
    let ignore = false;

    setIsLoading(true);
    record({ n, userId, outcome: "started" });

    fetchUser(userId, strategy === "abort" ? controller.signal : undefined)
      .then((result) => {
        if (ignore && strategy === "ignore") {
          record({ n, userId, outcome: "ignored" });
          return;
        }
        setUser(result);
        setIsLoading(false);
        record({ n, userId, outcome: "shown" });
      })
      .catch((error) => {
        // Check the signal, not error.name: a custom abort reason or a
        // timeout has a different name, but signal.aborted is always true.
        if (controller.signal.aborted) {
          record({ n, userId, outcome: "aborted" });
          return;
        }
        throw error;
      });

    // Runs when userId changes (and on unmount), before the next effect.
    return () => {
      ignore = true;
      if (strategy === "abort") controller.abort();
    };
  }, [userId, strategy]);

  const isWrong = !isLoading && user !== null && user.id !== userId;

  return (
    <div className="demo-card">
      <h4>The race, and two fixes</h4>
      <p>
        User 1 takes 1.8s to load, user 5 takes 0.2s. Click <strong>1</strong> then quickly{" "}
        <strong>5</strong>. In naive mode, user 5 appears, then user 1's slow answer lands and
        overwrites it.
      </p>

      <fieldset style={{ border: 0, padding: 0, margin: "0 0 8px" }}>
        <legend>Strategy</legend>
        {(Object.keys(STRATEGIES) as Strategy[]).map((key) => (
          <label key={key} style={{ display: "block" }}>
            <input type="radio" name="race-strategy" checked={strategy === key} onChange={() => setStrategy(key)} />{" "}
            {STRATEGIES[key]}
          </label>
        ))}
      </fieldset>

      <div className="demo-actions" role="group" aria-label="Select a user">
        {USER_IDS.map((id) => (
          <button key={id} aria-pressed={id === userId} onClick={() => setUserId(id)} style={{ fontWeight: id === userId ? 700 : 400 }}>
            User {id}
          </button>
        ))}
      </div>

      <div aria-live="polite" aria-busy={isLoading} style={{ minHeight: 48, opacity: isLoading ? 0.5 : 1 }}>
        <p style={{ margin: 0 }}>
          Selected: <strong>user {userId}</strong> · Showing:{" "}
          <strong>{user ? `${user.name} (user ${user.id}), ${user.role}` : "—"}</strong>
          {isLoading && " · loading…"}
        </p>
        {isWrong && (
          <p role="alert" style={{ color: "#c4321c", margin: "4px 0 0" }}>
            ⚠ Wrong user on screen: you picked user {userId}, but user {user.id}'s late answer won.
          </p>
        )}
      </div>

      <details>
        <summary>Request log (newest first)</summary>
        <ol reversed style={{ fontVariantNumeric: "tabular-nums", fontSize: 13 }}>
          {log.map((entry, i) => (
            <li key={`${entry.n}-${entry.outcome}-${i}`}>
              #{entry.n} user {entry.userId}: {entry.outcome}
            </li>
          ))}
        </ol>
      </details>
    </div>
  );
};
