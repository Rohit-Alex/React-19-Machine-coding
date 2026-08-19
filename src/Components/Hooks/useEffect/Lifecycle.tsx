import { useEffect, useState } from "react";

function createConnection(roomId: string) {
  return {
    connect() {
      console.log(`[Lifecycle] connecting to "${roomId}"`);
    },
    disconnect() {
      console.log(`[Lifecycle] disconnecting from "${roomId}"`);
    },
  };
}

/**
 * Scenario 1: The setup/cleanup lifecycle.
 * Switching rooms triggers cleanup(old room) then setup(new room). In dev,
 * Strict Mode also runs one extra setup+cleanup pass on mount — open the
 * console to see connect/disconnect/connect for the first room.
 */
export const Lifecycle = () => {
  const [roomId, setRoomId] = useState("general");

  useEffect(() => {
    const connection = createConnection(roomId);
    connection.connect();
    return () => connection.disconnect();
  }, [roomId]);

  console.log("[RENDERING]: Room ID -> " + roomId);

  return (
    <div className="demo-card">
      <h4>1. Setup/cleanup lifecycle</h4>
      <p>
        Open the console. Switching rooms logs disconnect(old) then connect(new)
        — never both rooms connected at once.
      </p>
      <div className="demo-actions">
        <button onClick={() => setRoomId("general")}>general</button>
        <button onClick={() => setRoomId("random")}>random</button>
      </div>
      <p>current room: {roomId}</p>
    </div>
  );
};
