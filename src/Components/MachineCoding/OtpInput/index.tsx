import { useState } from "react";
import { OtpInput } from "./OtpInput";
import "../../Hooks/hook-demo.css";

const CORRECT = "123456";
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Status = "idle" | "verifying" | "success" | "error";

export const OtpInputDemo = () => {
  const [status, setStatus] = useState<Status>("idle");
  // Bumping the key remounts the input: the simplest way to clear all the
  // boxes after a wrong code, with no "reset" API on the component.
  const [attempt, setAttempt] = useState(0);

  return (
    <section>
      <h2>OTP input</h2>
      <p>
        Writeup: <code>src/Components/MachineCoding/OtpInput/OtpInput.md</code>. Auto-advance,
        paste, Backspace and arrow keys, and SMS autofill on phones.
      </p>
      <div className="demo-card">
        <h4>Verify your phone</h4>
        <p>
          The right code is <code>{CORRECT}</code>. Try pasting <code>123-456</code>, typing a
          wrong code, or holding Backspace.
        </p>
        <OtpInput
          key={attempt}
          label="Enter the 6-digit code we sent you"
          // Only after a wrong attempt: autofocusing on page load would jump
          // the page to this demo.
          autoFocus={attempt > 0}
          disabled={status === "verifying" || status === "success"}
          error={status === "error" ? "That code is wrong. Try again." : undefined}
          onChange={() => status === "error" && setStatus("idle")}
          onComplete={async (code) => {
            setStatus("verifying");
            await wait(700); // Pretend to ask the server.
            if (code === CORRECT) {
              setStatus("success");
            } else {
              setStatus("error");
              setAttempt((a) => a + 1);
            }
          }}
        />
        <p role="status">
          {status === "verifying" && "Checking…"}
          {status === "success" && "✅ Verified."}
        </p>
        {status === "success" && (
          <button
            onClick={() => {
              setStatus("idle");
              setAttempt((a) => a + 1);
            }}
          >
            Start again
          </button>
        )}
      </div>
    </section>
  );
};
