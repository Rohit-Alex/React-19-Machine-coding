import { useEffect, useState } from "react";

/**
 * Scenario 3: Removing an unnecessary object dependency.
 * The "unstable" Effect depends on an object literal recreated every
 * render, so it re-fires on every keystroke into the unrelated input -
 * not just when roomId changes. The "stable" Effect builds that same
 * object INSIDE the Effect, so it only depends on the primitive roomId.
 */
export const UnstableDependency = () => {
  const [roomId, setRoomId] = useState("general");
  const [text, setText] = useState("");

  // 🚩 New object reference every render.
  const optionsUnstable = { roomId };
  useEffect(() => {
    console.log("[UnstableDependency] unstable effect fired", optionsUnstable);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [optionsUnstable]);

  // ✅ Object built inside the Effect - only the primitive is a dependency.
  useEffect(() => {
    const optionsStable = { roomId };
    console.log("[StableDependency] stable effect fired", optionsStable);
  }, [roomId]);

  return (
    <div className="demo-card">
      <h4>3. Removing an unnecessary object dependency</h4>
      <p>
        Open the console. Typing below re-fires the "unstable" effect on every
        keystroke; the "stable" one only fires when the room changes.
      </p>
      <div className="demo-actions">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="type to force re-renders"
        />
        <button
          onClick={() =>
            setRoomId((r) => (r === "general" ? "random" : "general"))
          }
        >
          switch room ({roomId})
        </button>
      </div>
    </div>
  );
};
