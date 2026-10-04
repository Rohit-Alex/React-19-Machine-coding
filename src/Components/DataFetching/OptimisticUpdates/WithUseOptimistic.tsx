import { startTransition, useOptimistic, useState, useSyncExternalStore } from "react";
import { applyAction, type TodoAction, type TodoServer } from "./todoServer";
import { TodoList } from "./TodoList";
import { ServerView } from "./ManualOptimistic";

/*
 * Two layers instead of one mutable list:
 *   todos            — only ever what the server confirmed
 *   optimisticTodos  — todos + every change still in flight, recomputed
 *                      on each render
 * A failed change is never "rolled back". It just stops being in flight, so
 * it stops being drawn. Other pending changes are untouched.
 */
export const WithUseOptimistic = ({ server }: { server: TodoServer }) => {
  const [todos, setTodos] = useState(server.getTodos);
  const [error, setError] = useState("");
  const [optimisticTodos, addOptimistic] = useOptimistic(todos, applyAction);
  const serverTodos = useSyncExternalStore(server.subscribe, server.getTodos);

  // Rows that differ between the two layers are the ones still saving.
  const pendingIds = optimisticTodos
    .filter((t) => {
      const confirmed = todos.find((c) => c.id === t.id);
      return !confirmed || confirmed.done !== t.done;
    })
    .map((t) => t.id);

  const run = (action: TodoAction) => {
    setError("");
    // useOptimistic only works inside a transition / Action.
    startTransition(async () => {
      addOptimistic(action);
      try {
        const saved = await server.save(action);
        // After an await, updates need their own startTransition to stay
        // part of the Action (a React 19 rule).
        startTransition(() => setTodos(saved));
      } catch (e) {
        setError(String((e as Error).message));
        // Nothing to undo: when this Action ends, its optimistic change is dropped.
      }
    });
  };

  return (
    <div className="demo-card">
      <h4>With useOptimistic</h4>
      <p style={{ fontSize: 13 }}>No rollback code. Deleted rows vanish at once; a failed delete brings the row back.</p>
      <TodoList todos={optimisticTodos} pendingIds={pendingIds} onAction={run} />
      <p role="alert" style={{ color: "#c4321c" }}>
        {error}
      </p>
      <ServerView todos={serverTodos} screen={optimisticTodos} hasPending={pendingIds.length > 0} />
    </div>
  );
};
