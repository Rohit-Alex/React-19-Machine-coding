import { useState } from "react";
import { useEventListener } from "./useEventListener";

export const LastKeyPressed = () => {
  const [lastKey, setLastKey] = useState<string | null>(null);

  useEventListener("keydown", (event) => {
    setLastKey(event.key);
  });

  return (
    <div>
      <h3>Listening on window</h3>
      <p>
        No target is passed here, so <code>useEventListener</code> attaches to{" "}
        <code>window</code> by default. Press any key on your keyboard.
      </p>
      <p>Last key pressed: {lastKey ?? "(none yet)"}</p>
    </div>
  );
};
