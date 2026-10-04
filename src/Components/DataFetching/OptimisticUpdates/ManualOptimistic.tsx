import { useState, useSyncExternalStore } from "react";
import { applyAction, type Todo, type TodoAction, type TodoServer } from "./todoServer";
import { TodoList } from "./TodoList";

type Rollback = "snapshot" | "undo-one";

/*
 * The hand-written version. One `todos` state that we change straight away,
 * then fix up if the server says no. How we fix it up is the whole question.
 */
export const ManualOptimistic = ({ server }: { server: TodoServer }) => {
  const [todos, setTodos] = useState(server.getTodos);
  const [rollback, setRollback] = useState<Rollback>("snapshot");
  const [error, setError] = useState("");
  const [pendingIds, setPendingIds] = useState<string[]>([]);
  const serverTodos = useSyncExternalStore(server.subscribe, server.getTodos);

  const run = async (action: TodoAction) => {
    const id = action.type === "add" ? action.todo.id : action.id;
    const snapshot = todos; // The whole list, as it is right now.
    setError("");
    setPendingIds((prev) => [...prev, id]);
    setTodos((prev) => applyAction(prev, action)); // Optimistic: show it now.
    try {
      await server.save(action);
    } catch (e) {
      setError(String((e as Error).message));
      if (rollback === "snapshot") {
        // ❌ Puts back the whole list from before this action — which also
        // wipes out every other change made since, even ones that succeeded.
        setTodos(snapshot);
      } else {
        // ✅ Reverse only this action, on top of whatever the list is now.
        setTodos((prev) => undoOne(prev, action, snapshot));
      }
    } finally {
      setPendingIds((prev) => prev.filter((p) => p !== id));
    }
  };

  return (
    <div className="demo-card">
      <h4>Manual: update now, roll back on failure</h4>
      <fieldset style={{ border: 0, padding: 0 }}>
        <legend>On failure</legend>
        <label style={{ display: "block" }}>
          <input type="radio" name="rollback" checked={rollback === "snapshot"} onChange={() => setRollback("snapshot")} /> Restore
          the snapshot (buggy)
        </label>
        <label style={{ display: "block" }}>
          <input type="radio" name="rollback" checked={rollback === "undo-one"} onChange={() => setRollback("undo-one")} /> Undo only
          the failed change
        </label>
      </fieldset>
      <TodoList todos={todos} pendingIds={pendingIds} onAction={run} />
      <p role="alert" style={{ color: "#c4321c" }}>
        {error}
      </p>
      <ServerView todos={serverTodos} screen={todos} hasPending={pendingIds.length > 0} />
    </div>
  );
};

function undoOne(current: Todo[], action: TodoAction, before: Todo[]): Todo[] {
  switch (action.type) {
    case "add":
      return current.filter((t) => t.id !== action.todo.id);
    case "setDone":
      return applyAction(current, { ...action, done: !action.done });
    case "remove": {
      // Put it back where it was.
      const index = before.findIndex((t) => t.id === action.id);
      const removed = before[index];
      return [...current.slice(0, index), removed, ...current.slice(index)];
    }
  }
}

/** What the server actually has, so you can see when the screen disagrees. */
export const ServerView = ({ todos, screen, hasPending }: { todos: Todo[]; screen: Todo[]; hasPending: boolean }) => {
  const differs = JSON.stringify(todos) !== JSON.stringify(screen);
  return (
    <p style={{ fontSize: 13 }}>
      Server has: {todos.map((t) => `${t.done ? "☑" : "☐"} ${t.text}`).join(" · ") || "nothing"}
      {differs && !hasPending && (
        <strong style={{ color: "#c4321c", display: "block" }}>⚠ The screen no longer matches the server.</strong>
      )}
    </p>
  );
};
