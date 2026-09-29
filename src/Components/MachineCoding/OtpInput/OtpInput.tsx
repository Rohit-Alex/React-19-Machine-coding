import { useId, useRef, useState } from "react";
import { fillDigits } from "./fillDigits";

interface OtpInputProps {
  length?: number;
  label: string;
  /** Called every time the last empty box gets filled. */
  onComplete: (code: string) => void;
  onChange?: (code: string) => void;
  disabled?: boolean;
  error?: string;
  autoFocus?: boolean;
}

export const OtpInput = ({ length = 6, label, onComplete, onChange, disabled, error, autoFocus }: OtpInputProps) => {
  const [digits, setDigits] = useState<string[]>(() => Array(length).fill(""));
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const labelId = useId();
  const errorId = useId();

  const focus = (i: number) => inputs.current[Math.max(0, Math.min(i, length - 1))]?.focus();

  // Every change goes through here, from event handlers — so onComplete fires
  // once per completing input, not from an Effect that re-runs on re-render.
  const update = (next: string[], focusAt?: number) => {
    setDigits(next);
    if (focusAt !== undefined) focus(focusAt);
    onChange?.(next.join(""));
    if (next.every(Boolean)) onComplete(next.join(""));
  };

  return (
    <div>
      <div id={labelId} style={{ marginBottom: 6 }}>
        {label}
      </div>
      <div role="group" aria-labelledby={labelId} style={{ display: "flex", gap: 8 }}>
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={(el) => {
              inputs.current[i] = el;
            }}
            value={digit}
            // type="text", not "number": number inputs accept "e" and "-",
            // show spinners, and can't keep a leading zero like "0" + "7".
            type="text"
            inputMode="numeric" // Number keypad on phones.
            // Lets iOS / Android offer the code from an SMS. On the first box
            // only; the whole code then arrives there and gets spread out.
            autoComplete={i === 0 ? "one-time-code" : "off"}
            autoFocus={autoFocus && i === 0}
            disabled={disabled}
            aria-label={`Digit ${i + 1} of ${length}`}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : undefined}
            // Select on focus, so typing into a filled box replaces its digit.
            onFocus={(e) => e.target.select()}
            onChange={(e) => {
              const el = e.target;
              if (el.value === "") {
                const next = [...digits];
                next[i] = "";
                return update(next);
              }
              // If the box was clicked (not selected) and already had a digit,
              // it now holds two characters. The new one is just before the caret.
              const text =
                el.value.length === 2 && digit ? el.value[(el.selectionStart ?? 2) - 1] : el.value;
              const result = fillDigits(digits, i, text);
              // A letter: ignore it. The input is controlled, so React puts
              // the old value back.
              if (result) update(result.digits, result.focus);
            }}
            onPaste={(e) => {
              e.preventDefault(); // We spread it across the boxes ourselves.
              const result = fillDigits(digits, i, e.clipboardData.getData("text"));
              if (result) update(result.digits, result.focus);
            }}
            onKeyDown={(e) => {
              if (e.key === "Backspace" && !digit && i > 0) {
                // Empty box: Backspace goes back and clears the previous one,
                // so holding it down wipes the code right to left.
                e.preventDefault();
                const next = [...digits];
                next[i - 1] = "";
                update(next, i - 1);
              } else if (e.key === "ArrowLeft") {
                e.preventDefault();
                focus(i - 1);
              } else if (e.key === "ArrowRight") {
                e.preventDefault();
                focus(i + 1);
              }
            }}
            style={{
              width: "2.4em",
              height: "2.8em",
              textAlign: "center",
              fontSize: "1.25em",
              fontVariantNumeric: "tabular-nums",
              borderRadius: 6,
              border: `1px solid ${error ? "crimson" : "var(--border)"}`,
            }}
          />
        ))}
      </div>
      {error && (
        <p id={errorId} role="alert" style={{ color: "crimson", margin: "6px 0 0" }}>
          {error}
        </p>
      )}
    </div>
  );
};
