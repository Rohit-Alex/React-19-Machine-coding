import { useState } from "react";

const Form = () => {
  const [text, setText] = useState("");
  return (
    <input
      value={text}
      onChange={(e) => setText(e.target.value)}
      placeholder="type something, then reset"
    />
  );
};

/**
 * Scenario 4: Resetting state with `key`.
 * Changing Form's `key` unmounts the old instance and mounts a fresh one,
 * so its internal useState restarts from "" — no manual field-clearing.
 */
export const ResetWithKey = () => {
  const [version, setVersion] = useState(0);

  return (
    <div className="demo-card">
      <h4>4. Resetting state with a key</h4>
      <p>
        Type into the field, then click reset — a new <code>key</code>{" "}
        remounts <code>Form</code> instead of manually clearing its state.
      </p>
      <div className="demo-actions">
        <button onClick={() => setVersion((v) => v + 1)}>reset</button>
      </div>
      <Form key={version} />
    </div>
  );
};
