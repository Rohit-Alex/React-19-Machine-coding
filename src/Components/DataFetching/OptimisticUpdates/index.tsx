import { useState } from "react";
import { ManualOptimistic } from "./ManualOptimistic";
import { WithUseOptimistic } from "./WithUseOptimistic";
import { createTodoServer } from "./todoServer";
import "../../Hooks/hook-demo.css";

export const OptimisticUpdatesDemo = () => {
  // A separate fake server for each panel, so they don't affect each other.
  const [manualServer] = useState(createTodoServer);
  const [hookServer] = useState(createTodoServer);

  return (
    <section>
      <h2>Optimistic updates</h2>
      <p>
        Writeup: <code>src/Components/DataFetching/OptimisticUpdates/OptimisticUpdates.md</code>.
        Saves take 0.5s; anything with "fail" in it fails after 1.5s.
      </p>
      <p>
        <strong>Try the bug:</strong> in the manual panel with "Restore the snapshot", tick{" "}
        <em>Call the bank</em>, then straight away tick <em>Buy milk</em>. Milk saves, then the bank
        fails — and the rollback unticks milk too, though the server saved it.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
        <ManualOptimistic server={manualServer} />
        <WithUseOptimistic server={hookServer} />
      </div>
    </section>
  );
};
