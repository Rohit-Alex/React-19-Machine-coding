import { useId, useState, type FormEvent } from "react";
import { useCountdown } from "./useCountdown";

const pad = (n: number) => String(n).padStart(2, "0");

export const CountdownTimer = () => {
  const [input, setInput] = useState("");
  const [target, setTarget] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { days, hrs, mins, secs, isDone } = useCountdown(target);
  const inputId = useId();

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    // "2026-09-27T18:30" has a time and no offset, so it's read as local
    // time. A date on its own ("2026-09-27") would be read as UTC.
    const next = new Date(input).getTime();
    if (Number.isNaN(next)) {
      setError("Pick a date and time.");
      return;
    }
    if (next <= Date.now()) {
      setError("Pick a time in the future.");
      return;
    }
    setError(null);
    setTarget(next);
  };

  return (
    <div className="demo-card">
      <h4>Countdown to a date and time</h4>
      <p>
        Pick a moment, or use the 10-second button to watch it finish. Leave
        the tab and come back — it catches up straight away.
      </p>

      <form onSubmit={handleSubmit} className="demo-actions">
        <label htmlFor={inputId}>Count down to</label>
        <input
          id={inputId}
          type="datetime-local"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          aria-invalid={error !== null}
          aria-describedby={error ? `${inputId}-error` : undefined}
        />
        <button type="submit">Start</button>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setTarget(Date.now() + 10_000);
          }}
        >
          10 seconds from now
        </button>
        <button
          type="button"
          onClick={() => setTarget(null)}
          disabled={target === null}
        >
          Cancel
        </button>
      </form>

      {error && (
        <p id={`${inputId}-error`} role="alert">
          {error}
        </p>
      )}

      {target !== null && (
        <>
          <p
            role="timer"
            style={{
              fontSize: 40,
              margin: "8px 0",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {days > 0 && `${days}d `}
            {pad(hrs)}:{pad(mins)}:{pad(secs)}
          </p>
          <p>
            Ends{" "}
            {new Date(target).toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "medium",
            })}
          </p>
        </>
      )}

      {/* Announce the finish once, not every second. */}
      <p aria-live="assertive">{isDone && <strong>Time's up!</strong>}</p>
    </div>
  );
};
